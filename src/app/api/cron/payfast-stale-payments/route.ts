import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` automatically
// when CRON_SECRET is set. Same header pattern works for manual calls.
function authorize(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

const STALE_ALERT_AFTER_MIN = 10;
const MARK_STALE_AFTER_HOURS = 24;

type PendingRow = {
  id: string;
  user_id: string;
  m_payment_id: string;
  plan_slug: string;
  term_months: number | null;
  amount_zar: number;
  alerted_at: string | null;
  created_at: string;
};

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const alertCutoff = new Date(now.getTime() - STALE_ALERT_AFTER_MIN * 60 * 1000).toISOString();
  const staleCutoff = new Date(now.getTime() - MARK_STALE_AFTER_HOURS * 60 * 60 * 1000).toISOString();

  // 1. Mark very old unresolved rows as stale so we stop alerting on them.
  const { data: staleRows, error: staleErr } = await admin
    .from("payfast_pending_payments")
    .update({ status: "stale" })
    .eq("status", "pending")
    .lt("created_at", staleCutoff)
    .select("id");

  if (staleErr) {
    Sentry.captureException(staleErr, { tags: { route: "cron/payfast-stale-payments", phase: "mark_stale" } });
  }

  // 2. Find rows that have been pending >10 min and haven't been alerted yet.
  //    These are the canaries — every one is a real user who paid (or abandoned)
  //    where we never saw the ITN.
  const { data: pendingRows, error: pendingErr } = await admin
    .from("payfast_pending_payments")
    .select("id, user_id, m_payment_id, plan_slug, term_months, amount_zar, alerted_at, created_at")
    .eq("status", "pending")
    .lt("created_at", alertCutoff)
    .is("alerted_at", null);

  if (pendingErr) {
    return NextResponse.json({ error: pendingErr.message }, { status: 500 });
  }

  const pending = (pendingRows ?? []) as PendingRow[];

  // 3. Sentry-alert each unresolved row with full reconcile context, then mark
  //    `alerted_at` so we don't spam.
  for (const row of pending) {
    Sentry.captureMessage("PayFast ITN missing — pending payment unresolved", {
      level: "error",
      tags: {
        route: "cron/payfast-stale-payments",
        plan: row.plan_slug,
      },
      extra: {
        m_payment_id: row.m_payment_id,
        user_id: row.user_id,
        plan: row.plan_slug,
        term_months: row.term_months,
        amount_zar: row.amount_zar,
        created_at: row.created_at,
        action: `Run /admin → Reconcile Payment with m_payment_id=${row.m_payment_id} and the pf_payment_id from the PayFast dashboard.`,
      },
    });
  }

  if (pending.length > 0) {
    await admin
      .from("payfast_pending_payments")
      .update({ alerted_at: now.toISOString() })
      .in("id", pending.map((r) => r.id));
  }

  return NextResponse.json({
    ok: true,
    alerted: pending.length,
    markedStale: staleRows?.length ?? 0,
    checkedAt: now.toISOString(),
  });
}
