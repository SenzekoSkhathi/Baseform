import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { sendBroadcast, wrapInStandardHtml, type BroadcastRecipient } from "@/lib/email/broadcast";

const ALLOWED_TIERS = ["free", "essential", "pro", "admin"] as const;
type Tier = (typeof ALLOWED_TIERS)[number];

function sanitizeTiers(input: unknown): Tier[] {
  if (!Array.isArray(input)) return [];
  const set = new Set<Tier>();
  for (const v of input) {
    const s = String(v).trim().toLowerCase();
    if ((ALLOWED_TIERS as readonly string[]).includes(s)) set.add(s as Tier);
  }
  return [...set];
}

async function loadRecipients(tiers: Tier[]): Promise<BroadcastRecipient[]> {
  const admin = createAdminClient();

  // Treat null/empty tier as "free" so legacy rows aren't silently excluded
  // when admin filters include "free".
  const includeFree = tiers.includes("free");
  const explicitTiers: string[] = tiers.filter((t): t is "essential" | "pro" | "admin" => t !== "free");

  const all: BroadcastRecipient[] = [];
  const PAGE = 1000;
  let from = 0;

  // We page through profiles to avoid pulling 50k+ rows in one shot.
  for (;;) {
    const query = admin
      .from("profiles")
      .select("email, full_name, tier")
      .not("email", "is", null)
      .range(from, from + PAGE - 1);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    for (const row of data) {
      const tier = String(row.tier ?? "free").trim().toLowerCase();
      const matches =
        (includeFree && (tier === "" || tier === "free")) ||
        explicitTiers.includes(tier);
      if (!matches) continue;
      if (!row.email) continue;
      const firstName = row.full_name ? row.full_name.split(" ")[0] : null;
      all.push({ email: row.email, firstName });
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  return all;
}

// GET — return recipient counts per tier so the UI can preview audience size
// before any send is attempted.
export async function GET() {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminClient();
  const counts: Record<Tier, number> = { free: 0, essential: 0, pro: 0, admin: 0 };

  // One grouped count per tier — small queries, cheap to run on demand.
  for (const tier of ALLOWED_TIERS) {
    if (tier === "free") {
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .or("tier.is.null,tier.eq.free")
        .not("email", "is", null);
      counts.free = count ?? 0;
    } else {
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("tier", tier)
        .not("email", "is", null);
      counts[tier] = count ?? 0;
    }
  }

  return NextResponse.json({ counts });
}

export async function POST(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = (await req.json().catch(() => null)) as {
    subject?: string;
    bodyHtml?: string;
    tiers?: unknown;
    useStandardWrapper?: boolean;
    dryRun?: boolean;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const subject = typeof body.subject === "string" ? body.subject.trim().slice(0, 200) : "";
  const bodyHtml = typeof body.bodyHtml === "string" ? body.bodyHtml : "";
  const tiers = sanitizeTiers(body.tiers);
  const useStandardWrapper = body.useStandardWrapper !== false; // default on
  const dryRun = body.dryRun === true;

  if (!subject) return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  if (!bodyHtml.trim()) return NextResponse.json({ error: "Email body is required." }, { status: 400 });
  if (tiers.length === 0) return NextResponse.json({ error: "Pick at least one recipient tier." }, { status: 400 });

  const finalHtml = useStandardWrapper ? wrapInStandardHtml(subject, bodyHtml) : bodyHtml;

  let recipients: BroadcastRecipient[];
  try {
    recipients = await loadRecipients(tiers);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load recipients.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients matched the selected tiers." }, { status: 400 });
  }

  const admin = createAdminClient();

  if (dryRun) {
    await admin.from("email_broadcasts").insert({
      admin_user_id: guard.userId,
      subject,
      body_html: finalHtml,
      tiers,
      recipient_count: recipients.length,
      sent_count: 0,
      failed_count: 0,
      dry_run: true,
    });
    return NextResponse.json({
      ok: true,
      dryRun: true,
      recipientCount: recipients.length,
      sample: recipients.slice(0, 5).map((r) => r.email),
    });
  }

  let result;
  try {
    result = await sendBroadcast({ subject, html: finalHtml, recipients });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Send failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await admin.from("email_broadcasts").insert({
    admin_user_id: guard.userId,
    subject,
    body_html: finalHtml,
    tiers,
    recipient_count: recipients.length,
    sent_count: result.sent,
    failed_count: result.failed,
    dry_run: false,
  });

  return NextResponse.json({
    ok: true,
    recipientCount: recipients.length,
    sent: result.sent,
    failed: result.failed,
  });
}
