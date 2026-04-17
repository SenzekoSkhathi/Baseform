import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PLANS, GRADE11_PLANS } from "@/lib/site-config/defaults";
import {
  formatBillingTermLabel,
  getEssentialBillingOption,
  normalizeBillingTermMonths,
  type BillingTermMonths,
} from "@/lib/billing-options";
import {
  createPayFastSignature,
  getPayFastConfig,
  getPayFastValidateUrl,
  isAmountMatch,
  toPayFastAmount,
} from "@/lib/payfast";
import { initializeUserCredits } from "@/lib/credits";
import { sendInvoiceEmail } from "@/lib/invoice";

type PlanId = "essential" | "pro" | "ultra";

type NotifyPayload = Record<string, string> & {
  payment_status?: string;
  amount_gross?: string;
  m_payment_id?: string;
  pf_payment_id?: string;
  custom_str1?: string;
  custom_str2?: string;
  custom_str3?: string;
  signature?: string;
  token?: string;
  billing_date?: string;
};

function isAllowedPlan(plan: string): plan is PlanId {
  return plan === "essential" || plan === "pro" || plan === "ultra";
}

function expectedAmountForPlan(plan: PlanId, isGrade11: boolean): string {
  const pool = isGrade11 ? GRADE11_PLANS : DEFAULT_PLANS;
  const found = pool.find((entry) => entry.slug === plan);
  return toPayFastAmount(found?.price ?? "0");
}

function expectedAmountForBilling(
  plan: PlanId,
  term: BillingTermMonths | null,
  isGrade11: boolean
): string {
  if (plan === "essential") {
    const option = getEssentialBillingOption(term);
    return option?.price ?? expectedAmountForPlan(plan, isGrade11);
  }

  return expectedAmountForPlan(plan, isGrade11);
}

function addMonthsToDate(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDaysToDate(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

async function verifyWithPayFast(payload: NotifyPayload): Promise<boolean> {
  const config = getPayFastConfig();
  const validateUrl = getPayFastValidateUrl(config);
  const body = new URLSearchParams(payload).toString();

  const response = await fetch(validateUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Baseform-PayFast-ITN",
      "Host": new URL(validateUrl).host,
    },
    body,
    cache: "no-store",
  });

  const text = (await response.text()).trim();
  return response.ok && text === "VALID";
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const payload: NotifyPayload = Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [key, String(value)])
  );

  const receivedSignature = String(payload.signature ?? "");
  if (!receivedSignature) {
    return NextResponse.json({ ok: false, error: "Missing signature." }, { status: 400 });
  }

  const config = getPayFastConfig();
  const { signature: _ignored, ...unsignedFields } = payload;
  const computedSignature = createPayFastSignature(unsignedFields, config.passphrase);
  if (computedSignature !== receivedSignature) {
    return NextResponse.json({ ok: false, error: "Invalid signature." }, { status: 400 });
  }

  const serverValidation = await verifyWithPayFast(payload);
  if (!serverValidation) {
    return NextResponse.json({ ok: false, error: "PayFast validation failed." }, { status: 400 });
  }

  if (String(payload.payment_status ?? "").toUpperCase() !== "COMPLETE") {
    return NextResponse.json({ ok: true, message: "Payment not complete, no upgrade performed." });
  }

  const supabase = createAdminClient();
  const token = String(payload.token ?? "").trim();
  const isRecurringItn = Boolean(token);

  // Recurring ITN: identify user by token (custom_str2 may be stale / missing).
  let plan: string;
  let userId: string;
  let term: BillingTermMonths | null;
  let isGrade11 = false;

  if (isRecurringItn) {
    const { data: subscriber } = await supabase
      .from("profiles")
      .select("id, grade_year, subscription_cycles_remaining")
      .eq("subscription_token", token)
      .maybeSingle();

    if (!subscriber) {
      return NextResponse.json({ ok: false, error: "Unknown subscription token." }, { status: 400 });
    }

    userId = String(subscriber.id);
    plan = "pro"; // Only Grade 11 Pro uses recurring today
    term = null;
    isGrade11 = subscriber.grade_year === "Grade 11";
  } else {
    plan = String(payload.custom_str1 ?? "").trim().toLowerCase();
    userId = String(payload.custom_str2 ?? "").trim();
    term = normalizeBillingTermMonths(payload.custom_str3);

    if (!isAllowedPlan(plan) || !userId) {
      return NextResponse.json({ ok: false, error: "Invalid plan or user." }, { status: 400 });
    }

    if (plan === "essential" && !term) {
      return NextResponse.json({ ok: false, error: "Missing billing term." }, { status: 400 });
    }

    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("grade_year")
      .eq("id", userId)
      .maybeSingle();
    isGrade11 = buyerProfile?.grade_year === "Grade 11";
  }

  if (!isAllowedPlan(plan)) {
    return NextResponse.json({ ok: false, error: "Invalid plan." }, { status: 400 });
  }

  const expectedAmount = expectedAmountForBilling(plan, term, isGrade11);
  const actualAmount = String(payload.amount_gross ?? "0");
  if (!isAmountMatch(actualAmount, expectedAmount)) {
    return NextResponse.json({ ok: false, error: "Amount mismatch." }, { status: 400 });
  }

  // Build profile update: tier + subscription state (for Grade 11 Pro recurring)
  const isGrade11ProSubscription = isGrade11 && plan === "pro";
  const profileUpdate: Record<string, unknown> = { tier: plan };

  if (isGrade11ProSubscription) {
    // Access lasts 1 month (the billed period) + 7-day grace buffer in case the
    // next ITN is delayed. If the next payment arrives on time, expiry is
    // refreshed forward; if it never arrives, access lapses 7 days after the
    // expected charge.
    const billingDate = payload.billing_date ? new Date(payload.billing_date) : new Date();
    const newExpiresAt = addDaysToDate(addMonthsToDate(billingDate, 1), 7);

    if (isRecurringItn) {
      const { data: current } = await supabase
        .from("profiles")
        .select("subscription_cycles_remaining")
        .eq("id", userId)
        .maybeSingle();

      const remaining = Math.max(0, (current?.subscription_cycles_remaining ?? 1) - 1);
      profileUpdate.subscription_cycles_remaining = remaining;
      profileUpdate.subscription_status = remaining === 0 ? "completed" : "active";
      profileUpdate.plan_expires_at = newExpiresAt.toISOString();
      profileUpdate.next_billing_date = remaining === 0
        ? null
        : addMonthsToDate(billingDate, 1).toISOString().slice(0, 10);
    } else {
      // First payment of a new subscription
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const cyclesTotal = Math.max(1, 12 - currentMonth);

      profileUpdate.subscription_token = token || null;
      profileUpdate.subscription_status = "active";
      profileUpdate.subscription_cycles_total = cyclesTotal;
      profileUpdate.subscription_cycles_remaining = cyclesTotal - 1;
      profileUpdate.plan_expires_at = newExpiresAt.toISOString();
      profileUpdate.next_billing_date = cyclesTotal > 1
        ? addMonthsToDate(billingDate, 1).toISOString().slice(0, 10)
        : null;
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ ok: false, error: "Could not update profile tier." }, { status: 500 });
  }

  if (plan === "essential" && term) {
    await initializeUserCredits(userId, term);
  }

  const billingInsert = await supabase.from("billing_events").upsert(
    {
      user_id: userId,
      plan_slug: plan,
      amount_zar: Number.parseFloat(expectedAmount),
      status: String(payload.payment_status ?? "COMPLETE"),
      term_months: term,
      payfast_m_payment_id: String(payload.m_payment_id ?? ""),
      payfast_payment_id: String(payload.pf_payment_id ?? ""),
      payfast_payment_status: String(payload.payment_status ?? "COMPLETE"),
      payfast_amount_gross: Number.parseFloat(actualAmount),
      payfast_signature: receivedSignature,
      term_label: term ? formatBillingTermLabel(term) : null,
      raw_payload: payload,
    },
    {
      onConflict: "payfast_payment_id",
    }
  ).select("id").maybeSingle();

  if (billingInsert.error) {
    return NextResponse.json({ ok: false, error: "Could not write billing history." }, { status: 500 });
  }

  // Send invoice email non-blocking — never let this fail the webhook response
  if (billingInsert.data?.id) {
    sendInvoiceEmail(userId, String(billingInsert.data.id)).catch(() => undefined);
  }

  return NextResponse.json({ ok: true });
}
