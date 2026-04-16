import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PLANS } from "@/lib/site-config/defaults";
import {
  getEssentialBillingOption,
  normalizeBillingTermMonths,
  type BillingTermMonths,
} from "@/lib/billing-options";
import {
  createPayFastSignature,
  getBaseUrl,
  getPayFastConfig,
  getPayFastEngineUrl,
  getPayFastOnsiteUrl,
  toPayFastAmount,
} from "@/lib/payfast";

type PlanId = "essential" | "pro" | "ultra";

function isAllowedPlan(plan: string): plan is PlanId {
  return plan === "essential" || plan === "pro" || plan === "ultra";
}

function findPlan(planId: PlanId) {
  return DEFAULT_PLANS.find((plan) => plan.slug === planId);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { plan?: string; term?: string | number } | null;
  const planId = String(body?.plan ?? "").trim().toLowerCase();
  const term = normalizeBillingTermMonths(body?.term);

  if (!isAllowedPlan(planId)) {
    return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
  }

  const plan = findPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "Selected plan was not found." }, { status: 404 });
  }

  if (!plan.available) {
    return NextResponse.json({ error: "Selected plan is not available yet." }, { status: 400 });
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

  const config = getPayFastConfig();
  const baseUrl = getBaseUrl(req);
  const selectedOption = planId === "essential" ? getEssentialBillingOption(term as BillingTermMonths) : undefined;
  const amount = planId === "essential" ? selectedOption?.price ?? plan.price : plan.price;
  const mPaymentId = `${user.id}:${planId}${term ? `:${term}` : ""}`;

  const fields: Record<string, string> = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: `${baseUrl}/payment?plan=${encodeURIComponent(planId)}${term ? `&term=${term}` : ""}&status=success`,
    cancel_url: `${baseUrl}/payment?plan=${encodeURIComponent(planId)}${term ? `&term=${term}` : ""}&status=cancelled`,
    notify_url: `${baseUrl}/api/payments/payfast/notify`,
    name_first: user.user_metadata?.full_name
      ? String(user.user_metadata.full_name).split(" ")[0]
      : "Baseform",
    name_last: user.user_metadata?.full_name
      ? String(user.user_metadata.full_name).split(" ").slice(1).join(" ")
      : "Student",
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

  const signature = createPayFastSignature(fields, config.passphrase);

  // POST to PayFast onsite endpoint — returns a UUID for the modal
  const pfRes = await fetch(getPayFastOnsiteUrl(config), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...fields, signature }).toString(),
    cache: "no-store",
  });

  if (!pfRes.ok) {
    const text = await pfRes.text().catch(() => "");
    Sentry.captureException(new Error(`PayFast onsite error ${pfRes.status}: ${text}`));
    return NextResponse.json(
      { error: "PayFast rejected the payment request. Check your credentials and passphrase." },
      { status: 502 }
    );
  }

  const pfData = (await pfRes.json().catch(() => null)) as { uuid?: string } | null;
  const uuid = typeof pfData?.uuid === "string" && pfData.uuid ? pfData.uuid : null;

  if (!uuid) {
    return NextResponse.json({ error: "No payment UUID returned from PayFast." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, uuid, engineUrl: getPayFastEngineUrl(config) });
}
