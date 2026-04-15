import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PLANS } from "@/lib/site-config/defaults";
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
};

function isAllowedPlan(plan: string): plan is PlanId {
  return plan === "essential" || plan === "pro" || plan === "ultra";
}

function expectedAmountForPlan(plan: PlanId): string {
  const found = DEFAULT_PLANS.find((entry) => entry.slug === plan);
  return toPayFastAmount(found?.price ?? "0");
}

function expectedAmountForBilling(plan: PlanId, term: BillingTermMonths | null): string {
  if (plan === "essential") {
    const option = getEssentialBillingOption(term);
    return option?.price ?? expectedAmountForPlan(plan);
  }

  return expectedAmountForPlan(plan);
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

  const plan = String(payload.custom_str1 ?? "").trim().toLowerCase();
  const userId = String(payload.custom_str2 ?? "").trim();
  const term = normalizeBillingTermMonths(payload.custom_str3);

  if (!isAllowedPlan(plan) || !userId) {
    return NextResponse.json({ ok: false, error: "Invalid plan or user." }, { status: 400 });
  }

  if (plan === "essential" && !term) {
    return NextResponse.json({ ok: false, error: "Missing billing term." }, { status: 400 });
  }

  const expectedAmount = expectedAmountForBilling(plan, term);
  const actualAmount = String(payload.amount_gross ?? "0");
  if (!isAmountMatch(actualAmount, expectedAmount)) {
    return NextResponse.json({ ok: false, error: "Amount mismatch." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("profiles")
    .update({ tier: plan })
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
  );

  if (billingInsert.error) {
    return NextResponse.json({ ok: false, error: "Could not write billing history." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
