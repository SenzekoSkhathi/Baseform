/**
 * Email scanner — filter-first architecture.
 *
 * Cost strategy:
 * 1. Use Gmail's from: filter to select only emails sent by university domains.
 *    Claude never sees newsletters, promotional emails, or anything off-domain.
 * 2. Use historyId to only process messages added since the last scan.
 *    On subsequent runs the scanner fetches metadata for new messages only,
 *    skipping everything already processed.
 * 3. Claude Haiku is used for analysis — ~50x cheaper than Sonnet, sufficient
 *    for structured JSON classification of short email bodies.
 *
 * Flow per user:
 *   a) Refresh OAuth token if needed.
 *   b) Load tracked applications → collect university names + email domains.
 *   c) If gmail_history_id is set:
 *        - Fetch only new message IDs via History API.
 *        - Fetch lightweight metadata (From header) for each.
 *        - Keep only messages whose sender domain matches a tracked university.
 *      If no historyId (first scan) or historyId expired:
 *        - Build domain-based Gmail search query + newer_than window.
 *        - Search returns pre-filtered message IDs at no Claude cost.
 *   d) Fetch full body only for matching messages.
 *   e) Call Claude Haiku once per matching message.
 *   f) Update application statuses and write audit logs.
 *   g) Store the new historyId for next run.
 */

import { supabaseAdmin } from "../lib/supabase.js";
import { analyzeEmail } from "../lib/emailAnalyzer.js";
import { buildGuardianEmail, sendEmail } from "../lib/emailSender.js";
import {
  refreshAccessToken,
  searchMessages,
  getMessage,
  extractEmailBody,
  extractPdfAttachments,
  getHeader,
  getProfileHistoryId,
  getMessagesSinceHistory,
  getMessageMetadata,
} from "./gmailClient.js";

// Statuses we will auto-update (never downgrade beyond these ranks)
const STATUS_RANK: Record<string, number> = {
  planning:    0,
  in_progress: 1,
  submitted:   2,
  waitlisted:  3,
  accepted:    4,
  rejected:    4,
};

/** Only upgrade status — never go backwards. */
function isUpgrade(current: string, next: string): boolean {
  return (STATUS_RANK[next] ?? 0) > (STATUS_RANK[current] ?? 0);
}

/** Extract the bare domain from a From header, e.g. "UCT <no-reply@uct.ac.za>" → "uct.ac.za" */
function extractSenderDomain(from: string): string {
  const match = from.match(/@([\w.-]+)/);
  return match ? match[1].toLowerCase() : "";
}

// ── Main export ──────────────────────────────────────────────────────────────

export async function scanUserEmails(userId: string): Promise<void> {
  // 1. Load email connection
  const { data: conn, error: connErr } = await supabaseAdmin
    .from("email_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (connErr || !conn) {
    console.log(`[scanner] No active email connection for user ${userId}`);
    return;
  }

  // 2. Refresh access token if expired (or within 5-minute buffer)
  let accessToken: string = conn.access_token;
  const expiryBuffer = 5 * 60 * 1000;
  const isExpired =
    !conn.token_expiry ||
    new Date(conn.token_expiry).getTime() - Date.now() < expiryBuffer;

  if (isExpired) {
    try {
      const refreshed = await refreshAccessToken(conn.refresh_token);
      accessToken = refreshed.access_token;
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);

      await supabaseAdmin
        .from("email_connections")
        .update({
          access_token: accessToken,
          token_expiry: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", conn.id);
    } catch (err) {
      console.error(`[scanner] Token refresh failed for user ${userId}:`, err);
      await supabaseAdmin
        .from("email_connections")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", conn.id);
      return;
    }
  }

  // 3. Load tracked applications with university name + email_domain
  const { data: applications, error: appsErr } = await supabaseAdmin
    .from("applications")
    .select("id, status, university_id, universities(id, name, abbreviation, email_domain)")
    .eq("student_id", userId);

  if (appsErr || !applications?.length) {
    console.log(`[scanner] No applications found for user ${userId}`);
    return;
  }

  type AppRow = {
    id: string;
    status: string;
    university_id: string | number;
    universities: {
      id: string | number;
      name: string;
      abbreviation: string | null;
      email_domain: string | null;
    } | null;
  };

  // Group by university, collecting domain and app list
  const byUniversity = new Map<
    string,
    {
      name: string;
      abbreviation: string | null;
      emailDomain: string | null;
      apps: AppRow[];
    }
  >();

  for (const app of applications as unknown as AppRow[]) {
    const uniId = String(app.university_id);
    if (!byUniversity.has(uniId)) {
      byUniversity.set(uniId, {
        name: app.universities?.name ?? uniId,
        abbreviation: app.universities?.abbreviation ?? null,
        emailDomain: app.universities?.email_domain ?? null,
        apps: [],
      });
    }
    byUniversity.get(uniId)!.apps.push(app);
  }

  // Build a domain → university mapping so we can match incoming emails
  const domainToUni = new Map<
    string,
    { name: string; apps: AppRow[] }
  >();
  const unknownDomainUnis: { name: string; abbreviation: string | null; apps: AppRow[] }[] = [];

  for (const [, uni] of byUniversity) {
    if (uni.emailDomain) {
      domainToUni.set(uni.emailDomain.toLowerCase(), { name: uni.name, apps: uni.apps });
    } else {
      // No domain in DB — will fall back to subject-based search later
      unknownDomainUnis.push(uni);
    }
  }

  // 4. Load already-acted-on message IDs. We only dedupe against messages that
  //    actually triggered a status update — previously "skipped" emails (where
  //    Claude returned unknown/low-confidence) stay eligible for re-analysis
  //    so improvements to the analyser (e.g. now reading PDF attachments) can
  //    catch what was missed before. The analyser cache absorbs the rerun cost
  //    for genuinely unchanged emails.
  const { data: processedLogs } = await supabaseAdmin
    .from("email_scan_logs")
    .select("gmail_message_id")
    .eq("user_id", userId)
    .eq("action_taken", "status_updated");

  const processedIds = new Set(
    (processedLogs ?? []).map((l: { gmail_message_id: string }) => l.gmail_message_id)
  );

  // 5. Collect candidate message IDs — via historyId or search fallback
  const candidateMessages: { id: string; matchedDomain?: string }[] = [];

  const storedHistoryId: string | null = (conn as any).gmail_history_id ?? null;

  if (storedHistoryId && domainToUni.size > 0) {
    // ── Incremental path: historyId ──────────────────────────────────────────
    try {
      const { messageIds, newHistoryId } = await getMessagesSinceHistory(
        accessToken,
        storedHistoryId
      );

      // Fetch lightweight metadata (From header only) for each new message
      // Cap at 200 to avoid unbounded processing if inbox was dormant for a long time
      const toCheck = messageIds.slice(0, 200).filter((id) => !processedIds.has(id));

      for (const msgId of toCheck) {
        try {
          const meta = await getMessageMetadata(accessToken, msgId);
          const senderDomain = extractSenderDomain(meta.from);
          if (domainToUni.has(senderDomain)) {
            candidateMessages.push({ id: msgId, matchedDomain: senderDomain });
          }
        } catch (err) {
          console.error(`[scanner] Metadata fetch error for ${msgId}:`, err);
        }
      }

      // Always save the latest historyId, even if no messages matched
      await supabaseAdmin
        .from("email_connections")
        .update({ gmail_history_id: newHistoryId, updated_at: new Date().toISOString() })
        .eq("id", conn.id);

    } catch (err: any) {
      if (err?.code === 404) {
        // historyId expired — fall through to the search path below
        console.log(`[scanner] historyId expired for user ${userId}, falling back to search`);
      } else {
        throw err;
      }
    }
  }

  // ── Search path: used when no historyId, historyId expired, or domains unknown ──

  const needsSearch = candidateMessages.length === 0 || unknownDomainUnis.length > 0;

  if (needsSearch) {
    // Calculate newer_than window from last scan (min 24h, add 2h buffer)
    const newerThanHours = conn.last_scanned_at
      ? Math.max(24, Math.ceil((Date.now() - new Date(conn.last_scanned_at).getTime()) / 3_600_000) + 2)
      : 168; // 7 days on first scan

    // Domain-filtered search for universities we know
    if (domainToUni.size > 0 && candidateMessages.length === 0) {
      const domains = Array.from(domainToUni.keys());
      const fromFilter = domains.map((d) => `@${d}`).join(" OR ");
      const query = `from:(${fromFilter}) newer_than:${newerThanHours}h`;

      try {
        const messages = await searchMessages(accessToken, query, 50);
        for (const msg of messages) {
          if (!processedIds.has(msg.id)) {
            candidateMessages.push({ id: msg.id });
          }
        }
      } catch (err) {
        console.error(`[scanner] Domain search failed for user ${userId}:`, err);
      }
    }

    // Subject-based fallback for universities without a known domain
    for (const uni of unknownDomainUnis) {
      const query = buildSubjectQuery(uni.name, uni.abbreviation, newerThanHours);
      try {
        const messages = await searchMessages(accessToken, query, 20);
        for (const msg of messages) {
          if (!processedIds.has(msg.id)) {
            candidateMessages.push({ id: msg.id });
          }
        }
      } catch (err) {
        console.error(`[scanner] Subject search error for "${uni.name}":`, err);
      }
    }

    // On search path: capture a fresh historyId for future incremental scans
    if (!storedHistoryId) {
      try {
        const freshHistoryId = await getProfileHistoryId(accessToken);
        await supabaseAdmin
          .from("email_connections")
          .update({ gmail_history_id: freshHistoryId, updated_at: new Date().toISOString() })
          .eq("id", conn.id);
      } catch (err) {
        console.error(`[scanner] Could not capture initial historyId for user ${userId}:`, err);
      }
    }
  }

  // 6. Analyse each candidate message with Claude Haiku
  for (const candidate of candidateMessages) {
    // Determine which university this message belongs to
    let matchedUni: { name: string; apps: AppRow[] } | undefined;

    if (candidate.matchedDomain) {
      matchedUni = domainToUni.get(candidate.matchedDomain);
    }

    // Fetch full message detail
    let detail;
    try {
      detail = await getMessage(accessToken, candidate.id);
    } catch (err) {
      console.error(`[scanner] Could not fetch message ${candidate.id}:`, err);
      continue;
    }

    const subject  = getHeader(detail, "Subject");
    const from     = getHeader(detail, "From");
    const body     = extractEmailBody(detail.payload);
    const emailDate = detail.internalDate
      ? new Date(Number(detail.internalDate)).toISOString()
      : null;

    // If we don't have a matchedDomain yet, resolve university from From header
    if (!matchedUni) {
      const senderDomain = extractSenderDomain(from);
      matchedUni = domainToUni.get(senderDomain);
    }

    // Final fallback: match against subject-based universities
    if (!matchedUni) {
      const subjectLower = subject.toLowerCase();
      for (const uni of unknownDomainUnis) {
        if (
          subjectLower.includes(uni.name.toLowerCase()) ||
          (uni.abbreviation && subjectLower.includes(uni.abbreviation.toLowerCase()))
        ) {
          matchedUni = { name: uni.name, apps: uni.apps };
          break;
        }
      }
    }

    if (!matchedUni) {
      // Email passed the domain filter but doesn't match any tracked university
      // (e.g. from a shared institution domain not in our map) — skip silently
      processedIds.add(candidate.id);
      continue;
    }

    // Pull any PDF attachments — submission/acceptance letters often live there.
    let pdfAttachments: { filename: string; base64: string }[] = [];
    try {
      pdfAttachments = await extractPdfAttachments(accessToken, detail);
    } catch (err) {
      console.error(`[scanner] Could not fetch attachments for ${candidate.id}:`, err);
    }

    // Claude Haiku call — only reaches here for emails confirmed from a university
    const analysis = await analyzeEmail(from, subject, body, matchedUni.name, pdfAttachments);
    processedIds.add(candidate.id);

    if (analysis.status === "unknown" || analysis.confidence === "low") {
      await writeLog(userId, null, candidate.id, subject, from, emailDate, analysis.status, null, "skipped");
      continue;
    }

    for (const app of matchedUni.apps) {
      if (!isUpgrade(app.status, analysis.status)) continue;

      const { error: updateErr } = await supabaseAdmin
        .from("applications")
        .update({ status: analysis.status, updated_at: new Date().toISOString() })
        .eq("id", app.id);

      if (updateErr) {
        console.error(`[scanner] Failed to update application ${app.id}:`, updateErr);
        continue;
      }

      await writeLog(
        userId,
        app.id,
        candidate.id,
        subject,
        from,
        emailDate,
        analysis.status,
        app.status,
        "status_updated"
      );

      console.log(
        `[scanner] Updated app ${app.id} (${matchedUni.name}): ${app.status} → ${analysis.status}`
      );

      sendGuardianNotification(userId, app.id, matchedUni.name, analysis.status).catch((err) =>
        console.error(`[scanner] Guardian notify failed for app ${app.id}:`, err)
      );
    }
  }

  // 7. Update last_scanned_at
  await supabaseAdmin
    .from("email_connections")
    .update({ last_scanned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", conn.id);

  console.log(
    `[scanner] Scan complete for user ${userId} — ${candidateMessages.length} candidate(s) checked`
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Subject-based query used for universities without a known email domain. */
function buildSubjectQuery(
  name: string,
  abbreviation: string | null,
  newerThanHours: number
): string {
  const terms: string[] = [`subject:"${name}"`];
  if (abbreviation && abbreviation.toLowerCase() !== name.toLowerCase()) {
    terms.push(`subject:"${abbreviation}"`);
  }
  return `(${terms.join(" OR ")}) newer_than:${newerThanHours}h`;
}

async function sendGuardianNotification(
  userId: string,
  applicationId: string | number,
  universityName: string,
  newStatus: string
): Promise<void> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, guardian_name, guardian_email, notification_prefs")
    .eq("id", userId)
    .single();

  const notificationPrefs = profile?.notification_prefs as {
    deadline_alerts?: unknown;
    status_updates?: unknown;
  } | null;
  if (typeof notificationPrefs?.deadline_alerts === "boolean" && !notificationPrefs.deadline_alerts) return;
  if (typeof notificationPrefs?.status_updates === "boolean" && !notificationPrefs.status_updates) return;

  if (!profile?.guardian_email || !profile?.guardian_name) return;

  const refId = `${applicationId}_${newStatus}`;
  const { data: existing } = await supabaseAdmin
    .from("notification_sent_log")
    .select("id")
    .eq("user_id", userId)
    .eq("notification_type", "guardian_status_update")
    .eq("reference_id", refId)
    .maybeSingle();

  if (existing) return;

  const { data: app } = await supabaseAdmin
    .from("applications")
    .select("faculties(name), universities(closing_date)")
    .eq("id", applicationId)
    .single();

  const programmeName = (app as any)?.faculties?.name ?? "Programme";
  const closingDate   = (app as any)?.universities?.closing_date ?? null;
  const appUrl = `${process.env.FRONTEND_URL ?? "https://baseform.co.za"}/dashboard/detail`;
  const studentFirstName = (profile.full_name ?? "").split(" ")[0] || "your student";

  const { subject, html } = buildGuardianEmail({
    guardianName:   profile.guardian_name,
    studentName:    studentFirstName,
    universityName,
    programmeName,
    newStatus,
    closingDate,
    appUrl,
  });

  await sendEmail({ to: profile.guardian_email, subject, html });

  await supabaseAdmin.from("notification_sent_log").insert({
    user_id:           userId,
    notification_type: "guardian_status_update",
    reference_id:      refId,
    email_address:     profile.guardian_email,
  });

  console.log(
    `[scanner] Guardian email sent to ${profile.guardian_email} (app ${applicationId} → ${newStatus})`
  );
}

async function writeLog(
  userId: string,
  applicationId: string | number | null,
  gmailMessageId: string,
  subject: string | null,
  from: string | null,
  emailDate: string | null,
  detectedStatus: string,
  previousStatus: string | null,
  actionTaken: string
) {
  await supabaseAdmin.from("email_scan_logs").upsert(
    {
      user_id:          userId,
      application_id:   applicationId,
      gmail_message_id: gmailMessageId,
      email_subject:    subject,
      email_from:       from,
      email_date:       emailDate,
      detected_status:  detectedStatus,
      previous_status:  previousStatus,
      action_taken:     actionTaken,
    },
    { onConflict: "user_id,gmail_message_id" },
  );
}
