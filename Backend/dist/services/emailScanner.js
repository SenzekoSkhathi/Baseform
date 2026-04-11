"use strict";
/**
 * Email scanner — core orchestration.
 *
 * For a given user:
 * 1. Load their Gmail tokens (refresh if expired).
 * 2. Load their tracked applications and group by university.
 * 3. Build a targeted Gmail search query per university.
 * 4. Fetch matching emails, skip already-processed ones.
 * 5. Analyse each email with Claude.
 * 6. Update application statuses and write audit logs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanUserEmails = scanUserEmails;
const supabase_js_1 = require("../lib/supabase.js");
const emailAnalyzer_js_1 = require("../lib/emailAnalyzer.js");
const emailSender_js_1 = require("../lib/emailSender.js");
const gmailClient_js_1 = require("./gmailClient.js");
// Statuses we will auto-update (never downgrade beyond these ranks)
const STATUS_RANK = {
    planning: 0,
    in_progress: 1,
    submitted: 2,
    waitlisted: 3,
    accepted: 4,
    rejected: 4,
};
/** Only upgrade status — never go backwards. */
function isUpgrade(current, next) {
    return (STATUS_RANK[next] ?? 0) > (STATUS_RANK[current] ?? 0);
}
// ── Main export ──────────────────────────────────────────────────────────────
async function scanUserEmails(userId) {
    // 1. Load email connection
    const { data: conn, error: connErr } = await supabase_js_1.supabaseAdmin
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
    let accessToken = conn.access_token;
    const expiryBuffer = 5 * 60 * 1000;
    const isExpired = !conn.token_expiry ||
        new Date(conn.token_expiry).getTime() - Date.now() < expiryBuffer;
    if (isExpired) {
        try {
            const refreshed = await (0, gmailClient_js_1.refreshAccessToken)(conn.refresh_token);
            accessToken = refreshed.access_token;
            const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);
            await supabase_js_1.supabaseAdmin
                .from("email_connections")
                .update({ access_token: accessToken, token_expiry: newExpiry.toISOString(), updated_at: new Date().toISOString() })
                .eq("id", conn.id);
        }
        catch (err) {
            console.error(`[scanner] Token refresh failed for user ${userId}:`, err);
            // Mark connection inactive if refresh token is revoked
            await supabase_js_1.supabaseAdmin
                .from("email_connections")
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq("id", conn.id);
            return;
        }
    }
    // 3. Load user's tracked applications with university details
    const { data: applications, error: appsErr } = await supabase_js_1.supabaseAdmin
        .from("applications")
        .select("id, status, university_id, universities(id, name, abbreviation)")
        .eq("student_id", userId);
    if (appsErr || !applications?.length) {
        console.log(`[scanner] No applications found for user ${userId}`);
        return;
    }
    const byUniversity = new Map();
    for (const app of applications) {
        const uniId = String(app.university_id);
        if (!byUniversity.has(uniId)) {
            byUniversity.set(uniId, {
                name: app.universities?.name ?? uniId,
                abbreviation: app.universities?.abbreviation ?? null,
                apps: [],
            });
        }
        byUniversity.get(uniId).apps.push(app);
    }
    // 4. Load already-processed message IDs for this user (to skip them)
    const { data: processedLogs } = await supabase_js_1.supabaseAdmin
        .from("email_scan_logs")
        .select("gmail_message_id")
        .eq("user_id", userId);
    const processedIds = new Set((processedLogs ?? []).map((l) => l.gmail_message_id));
    // 5. Scan per university
    for (const [, { name, abbreviation, apps }] of byUniversity) {
        const query = buildGmailQuery(name, abbreviation);
        let messages;
        try {
            messages = await (0, gmailClient_js_1.searchMessages)(accessToken, query, 30);
        }
        catch (err) {
            console.error(`[scanner] Gmail search error for "${name}":`, err);
            continue;
        }
        for (const msg of messages) {
            if (processedIds.has(msg.id))
                continue;
            let detail;
            try {
                detail = await (0, gmailClient_js_1.getMessage)(accessToken, msg.id);
            }
            catch (err) {
                console.error(`[scanner] Could not fetch message ${msg.id}:`, err);
                continue;
            }
            const subject = (0, gmailClient_js_1.getHeader)(detail, "Subject");
            const from = (0, gmailClient_js_1.getHeader)(detail, "From");
            const body = (0, gmailClient_js_1.extractEmailBody)(detail.payload);
            const emailDate = detail.internalDate
                ? new Date(Number(detail.internalDate)).toISOString()
                : null;
            const analysis = await (0, emailAnalyzer_js_1.analyzeEmail)(from, subject, body, name);
            // Mark as processed regardless of result to avoid re-scanning
            processedIds.add(msg.id);
            if (analysis.status === "unknown" || analysis.confidence === "low") {
                await writeLog(userId, null, msg.id, subject, from, emailDate, analysis.status, null, "skipped");
                continue;
            }
            // Update all application rows for this university if it's an upgrade
            for (const app of apps) {
                if (!isUpgrade(app.status, analysis.status))
                    continue;
                const { error: updateErr } = await supabase_js_1.supabaseAdmin
                    .from("applications")
                    .update({ status: analysis.status, updated_at: new Date().toISOString() })
                    .eq("id", app.id);
                if (updateErr) {
                    console.error(`[scanner] Failed to update application ${app.id}:`, updateErr);
                    continue;
                }
                await writeLog(userId, app.id, msg.id, subject, from, emailDate, analysis.status, app.status, "status_updated");
                console.log(`[scanner] Updated app ${app.id} (${name}): ${app.status} → ${analysis.status}`);
                // Send guardian notification (fire-and-forget, don't block the scan)
                sendGuardianNotification(userId, app.id, name, analysis.status).catch((err) => console.error(`[scanner] Guardian notify failed for app ${app.id}:`, err));
            }
        }
    }
    // 6. Update last_scanned_at
    await supabase_js_1.supabaseAdmin
        .from("email_connections")
        .update({ last_scanned_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", conn.id);
    console.log(`[scanner] Scan complete for user ${userId}`);
}
// ── Helpers ──────────────────────────────────────────────────────────────────
function buildGmailQuery(name, abbreviation) {
    const terms = [`subject:"${name}"`];
    if (abbreviation && abbreviation.toLowerCase() !== name.toLowerCase()) {
        terms.push(`subject:"${abbreviation}"`);
    }
    // Only look at emails from the last 90 days to keep scans fast
    return `(${terms.join(" OR ")}) newer_than:90d`;
}
async function sendGuardianNotification(userId, applicationId, universityName, newStatus) {
    // Load student profile for guardian details
    const { data: profile } = await supabase_js_1.supabaseAdmin
        .from("profiles")
        .select("full_name, guardian_name, guardian_email, notification_prefs")
        .eq("id", userId)
        .single();
    const notificationPrefs = profile?.notification_prefs;
    const allowsDeadlineAlerts = notificationPrefs?.deadline_alerts;
    const allowsStatusUpdates = notificationPrefs?.status_updates;
    if (typeof allowsDeadlineAlerts === "boolean" && !allowsDeadlineAlerts)
        return;
    if (typeof allowsStatusUpdates === "boolean" && !allowsStatusUpdates)
        return;
    if (!profile?.guardian_email || !profile?.guardian_name)
        return;
    // Dedup: only send once per application + status combination
    const refId = `${applicationId}_${newStatus}`;
    const { data: existing } = await supabase_js_1.supabaseAdmin
        .from("notification_sent_log")
        .select("id")
        .eq("user_id", userId)
        .eq("notification_type", "guardian_status_update")
        .eq("reference_id", refId)
        .maybeSingle();
    if (existing)
        return;
    // Load application details for closing date
    const { data: app } = await supabase_js_1.supabaseAdmin
        .from("applications")
        .select("faculties(name), universities(closing_date)")
        .eq("id", applicationId)
        .single();
    const programmeName = app?.faculties?.name ?? "Programme";
    const closingDate = app?.universities?.closing_date ?? null;
    const appUrl = `${process.env.FRONTEND_URL ?? "https://baseform.co.za"}/dashboard/detail`;
    const studentFirstName = (profile.full_name ?? "").split(" ")[0] || "your student";
    const { subject, html } = (0, emailSender_js_1.buildGuardianEmail)({
        guardianName: profile.guardian_name,
        studentName: studentFirstName,
        universityName,
        programmeName,
        newStatus,
        closingDate,
        appUrl,
    });
    await (0, emailSender_js_1.sendEmail)({ to: profile.guardian_email, subject, html });
    await supabase_js_1.supabaseAdmin.from("notification_sent_log").insert({
        user_id: userId,
        notification_type: "guardian_status_update",
        reference_id: refId,
        email_address: profile.guardian_email,
    });
    console.log(`[scanner] Guardian email sent to ${profile.guardian_email} (app ${applicationId} → ${newStatus})`);
}
async function writeLog(userId, applicationId, gmailMessageId, subject, from, emailDate, detectedStatus, previousStatus, actionTaken) {
    await supabase_js_1.supabaseAdmin.from("email_scan_logs").insert({
        user_id: userId,
        application_id: applicationId,
        gmail_message_id: gmailMessageId,
        email_subject: subject,
        email_from: from,
        email_date: emailDate,
        detected_status: detectedStatus,
        previous_status: previousStatus,
        action_taken: actionTaken,
    });
}
