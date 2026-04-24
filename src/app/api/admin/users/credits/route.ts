import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";

const MAX_GRANT = 10_000;

export async function POST(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const credits = Math.floor(Number(body.credits));
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 200) : null;

  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!Number.isFinite(credits) || credits === 0) {
    return NextResponse.json({ error: "Credits must be a non-zero integer" }, { status: 400 });
  }
  if (Math.abs(credits) > MAX_GRANT) {
    return NextResponse.json({ error: `Credits must be between -${MAX_GRANT} and ${MAX_GRANT}` }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email, full_name, tier, grade_year")
    .ilike("email", email)
    .maybeSingle();

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });
  if (!profile) return NextResponse.json({ error: `No user found with email ${email}` }, { status: 404 });

  const { data: existing, error: existingError } = await admin
    .from("user_credits")
    .select("balance, week_start_balance, weekly_allowance")
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const weeklyAllowance =
    existing?.weekly_allowance ?? (profile.grade_year === "Grade 11" && profile.tier === "pro" ? 150 : 100);

  let newBalance: number;

  if (!existing) {
    if (credits < 0) {
      return NextResponse.json({ error: "User has no credits row — cannot deduct" }, { status: 400 });
    }
    newBalance = credits;
    const { error: insertError } = await admin.from("user_credits").insert({
      user_id: profile.id,
      balance: newBalance,
      week_start_balance: newBalance,
      weekly_allowance: weeklyAllowance,
      plan_term_months: 3,
      plan_start_date: new Date().toISOString(),
      last_topped_up_at: new Date().toISOString(),
    });
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  } else {
    newBalance = Math.max(0, existing.balance + credits);
    const { error: updateError } = await admin
      .from("user_credits")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", profile.id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: txError } = await admin.from("credit_transactions").insert({
    user_id: profile.id,
    amount: credits,
    type: credits > 0 ? "bonus" : "usage",
    action: "admin_grant",
    description: note ?? `Manual admin ${credits > 0 ? "grant" : "deduction"}`,
    balance_after: newBalance,
  });
  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    user: { id: profile.id, email: profile.email, full_name: profile.full_name },
    newBalance,
  });
}
