import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";

export async function GET() {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payfast_pending_payments")
    .select("id, user_id, m_payment_id, plan_slug, term_months, amount_zar, status, created_at, alerted_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Hydrate user emails for the UI
  const userIds = Array.from(new Set((data ?? []).map((r) => r.user_id)));
  const emails = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);
    for (const p of profiles ?? []) emails.set(p.id, p.email ?? p.full_name ?? null);
  }

  return NextResponse.json({
    rows: (data ?? []).map((r) => ({
      ...r,
      user_label: emails.get(r.user_id) ?? r.user_id.slice(0, 8),
    })),
  });
}
