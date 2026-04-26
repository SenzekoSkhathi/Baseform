import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { initializeUserCredits } from "@/lib/credits";
import { sendInvoiceEmail } from "@/lib/invoice";
import { DEFAULT_PLANS, GRADE11_PLANS } from "@/lib/site-config/defaults";
import {
  formatBillingTermLabel,
  getEssentialBillingOption,
  normalizeBillingTermMonths,
  type BillingTermMonths,
} from "@/lib/billing-options";

type PlanId = "essential" | "pro" | "ultra";

function isAllowedPlan(plan: string): plan is PlanId {
  return plan === "essential" || plan === "pro" || plan === "ultra";
}

function expectedAmount(plan: PlanId, term: BillingTermMonths | null, isGrade11: boolean): number {
  if (plan === "essential") {
    const opt = getEssentialBillingOption(term);
    if (opt?.price) return Number.parseFloat(opt.price);
  }
  const pool = isGrade11 ? GRADE11_PLANS : DEFAULT_PLANS;
  const found = pool.find((entry) => entry.slug === plan);
  return Number.parseFloat(found?.price ?? "0");
}

function addMonths(d: Date, months: number): Date {
  const out = new Date(d.getTime());
  out.setMonth(out.getMonth() + months);
  return out;
}
function addDays(d: Date, days: number): Date {
  const out = new Date(d.getTime());
  out.setDate(out.getDate() + days);
  return out;
}

export async function POST(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const userIdInput = typeof body.userId === "string" ? body.userId.trim() : "";
  const plan = String(body.plan ?? "").trim().toLowerCase();
  const term = normalizeBillingTermMonths(body.term);
  const pfPaymentId = String(body.pfPaymentId ?? "").trim();
  const mPaymentId = String(body.mPaymentId ?? "").trim();
  const amountInput = body.amountZar == null ? null : Number(body.amountZar);

  if (!email && !userIdInput) {
    return NextResponse.json({ error: "Provide either email or userId" }, { status: 400 });
  }
  if (!isAllowedPlan(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (plan === "essential" && !term) {
    return NextResponse.json({ error: "Essential reconciliation needs a term (3, 6, or 9)" }, { status: 400 });
  }
  if (!pfPaymentId) {
    return NextResponse.json({ error: "pfPaymentId is required for an idempotent reconcile" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Resolve user
  const profileQuery = admin.from("profiles").select("id, email, full_name, grade_year, tier");
  const { data: profile, error: profileErr } = userIdInput
    ? await profileQuery.eq("id", userIdInput).maybeSingle()
    : await profileQuery.ilike("email", email).maybeSingle();

  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });
  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userId = String(profile.id);
  const isGrade11 = profile.grade_year === "Grade 11";
  const isGrade11ProSub = isGrade11 && plan === "pro";
  const amount = amountInput && Number.isFinite(amountInput) && amountInput > 0
    ? amountInput
    : expectedAmount(plan, term, isGrade11);

  // 1. Update profile tier (+ subscription state for Grade 11 Pro)
  const profileUpdate: Record<string, unknown> = { tier: plan };
  if (isGrade11ProSub) {
    const today = new Date();
    const expiresAt = addDays(addMonths(today, 1), 7);
    const cyclesTotal = Math.max(1, 12 - (today.getMonth() + 1));
    profileUpdate.subscription_status = "active";
    profileUpdate.subscription_cycles_total = cyclesTotal;
    profileUpdate.subscription_cycles_remaining = Math.max(0, cyclesTotal - 1);
    profileUpdate.plan_expires_at = expiresAt.toISOString();
    profileUpdate.next_billing_date = cyclesTotal > 1
      ? addMonths(today, 1).toISOString().slice(0, 10)
      : null;
  }

  const { error: updateErr } = await admin.from("profiles").update(profileUpdate).eq("id", userId);
  if (updateErr) return NextResponse.json({ error: `Profile update failed: ${updateErr.message}` }, { status: 500 });

  // 2. Initialize credits ONLY if this user has no credits row yet.
  //    Avoids resetting balance on a re-run of an already-processed payment.
  let creditsInitialized = false;
  if (plan === "essential" && term) {
    const { data: existing } = await admin
      .from("user_credits")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!existing) {
      await initializeUserCredits(userId, term);
      creditsInitialized = true;
    }
  }

  // 3. Upsert billing event (idempotent on payfast_payment_id)
  const billingInsert = await admin
    .from("billing_events")
    .upsert(
      {
        user_id: userId,
        plan_slug: plan,
        amount_zar: amount,
        status: "COMPLETE",
        term_months: term,
        term_label: term ? formatBillingTermLabel(term) : null,
        payfast_m_payment_id: mPaymentId || null,
        payfast_payment_id: pfPaymentId,
        payfast_payment_status: "COMPLETE",
        payfast_amount_gross: amount,
        raw_payload: {
          manual_reconcile: true,
          reconciled_by_admin_id: guard.userId,
          reconciled_at: new Date().toISOString(),
        },
      },
      { onConflict: "payfast_payment_id" },
    )
    .select("id")
    .single();

  if (billingInsert.error) {
    return NextResponse.json({ error: `Billing event upsert failed: ${billingInsert.error.message}` }, { status: 500 });
  }

  // 4. Send invoice (best-effort — doesn't block success)
  const invoiceResult = await sendInvoiceEmail(userId, billingInsert.data.id)
    .then(() => ({ ok: true }))
    .catch((e) => ({ ok: false, error: e instanceof Error ? e.message : String(e) }));

  return NextResponse.json({
    ok: true,
    user: { id: userId, email: profile.email, full_name: profile.full_name },
    plan,
    term,
    amountZar: amount,
    billingEventId: billingInsert.data.id,
    creditsInitialized,
    invoiceEmailSent: invoiceResult.ok,
    invoiceError: "error" in invoiceResult ? invoiceResult.error : undefined,
  });
}
