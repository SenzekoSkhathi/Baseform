import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PLANS, GRADE11_PLANS } from "@/lib/site-config/defaults";
import {
  getEssentialBillingOption,
  normalizeBillingTermMonths,
  type BillingTermMonths,
} from "@/lib/billing-options";
import {
  createPayFastSignature,
  getBaseUrl,
  getPayFastConfig,
  getPayFastProcessUrl,
  toPayFastAmount,
} from "@/lib/payfast";

type PlanId = "essential" | "pro" | "ultra";

function isAllowedPlan(plan: string): plan is PlanId {
  return plan === "essential" || plan === "pro" || plan === "ultra";
}

function findPlan(planId: PlanId, isGrade11: boolean) {
  const pool = isGrade11 ? GRADE11_PLANS : DEFAULT_PLANS;
  return pool.find((plan) => plan.slug === planId);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { plan?: string; term?: string | number } | null;
  const planId = String(body?.plan ?? "").trim().toLowerCase();
  const term = normalizeBillingTermMonths(body?.term);

  if (!isAllowedPlan(planId)) {
    return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
  }

  if (planId === "essential" && !term) {
    return NextResponse.json({ error: "Please choose a billing term for Essential." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("grade_year")
    .eq("id", user.id)
    .maybeSingle();
  const isGrade11 = profileRow?.grade_year === "Grade 11";

  const plan = findPlan(planId, isGrade11);
  if (!plan) {
    return NextResponse.json({ error: "Selected plan was not found." }, { status: 404 });
  }

  if (!plan.available) {
    return NextResponse.json({ error: "Selected plan is not available yet." }, { status: 400 });
  }

  const config = getPayFastConfig();
  const baseUrl = getBaseUrl(req);
  const selectedOption = planId === "essential" ? getEssentialBillingOption(term as BillingTermMonths) : undefined;
  const amount = planId === "essential" ? selectedOption?.price ?? plan.price : plan.price;
  const mPaymentId = `${user.id}:${planId}${term ? `:${term}` : ""}`;

  const isGrade11ProSubscription = isGrade11 && planId === "pro";
  const today = new Date();
  const currentMonth = today.getMonth() + 1;

  if (isGrade11ProSubscription && currentMonth === 12) {
    return NextResponse.json(
      { error: "Grade 11 Pro is unavailable in December — subscribe again from January." },
      { status: 400 }
    );
  }

  const subscriptionCycles = isGrade11ProSubscription ? 12 - currentMonth : 0;

  const fields: Record<string, string> = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: `${baseUrl}/payment?plan=${encodeURIComponent(planId)}${term ? `&term=${term}` : ""}&status=success`,
    cancel_url: `${baseUrl}/payment?plan=${encodeURIComponent(planId)}${term ? `&term=${term}` : ""}&status=cancelled`,
    notify_url: `${baseUrl}/api/payments/payfast/notify`,
    name_first: user.user_metadata?.full_name ? String(user.user_metadata.full_name).split(" ")[0] : "Baseform",
    name_last: user.user_metadata?.full_name ? String(user.user_metadata.full_name).split(" ").slice(1).join(" ") : "Student",
    email_address: user.email ?? "",
    m_payment_id: mPaymentId,
    amount: toPayFastAmount(amount),
    item_name: `${plan.name} Plan${term ? ` - ${term} months` : ""}`,
    item_description:
      planId === "essential"
        ? `Baseform Essential subscription for ${selectedOption?.label ?? "selected term"}`
        : `Baseform ${plan.name} subscription`,
    custom_str1: planId,
    custom_str2: user.id,
    custom_str3: term ? String(term) : "",
  };

  if (isGrade11ProSubscription) {
    fields.subscription_type = "1";
    fields.billing_date = today.toISOString().slice(0, 10);
    fields.recurring_amount = toPayFastAmount(amount);
    fields.frequency = "3";
    fields.cycles = String(subscriptionCycles);
  }

  const signature = createPayFastSignature(fields, config.passphrase);

  return NextResponse.json({
    ok: true,
    processUrl: getPayFastProcessUrl(config),
    fields: {
      ...fields,
      signature,
    },
  });
}
