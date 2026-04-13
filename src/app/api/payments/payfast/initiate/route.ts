import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PLANS } from "@/lib/site-config/defaults";
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

function findPlan(planId: PlanId) {
  return DEFAULT_PLANS.find((plan) => plan.slug === planId);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { plan?: string } | null;
  const planId = String(body?.plan ?? "").trim().toLowerCase();

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
  const mPaymentId = `${user.id}:${planId}`;

  const fields: Record<string, string> = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: `${baseUrl}/payment?plan=${encodeURIComponent(planId)}&status=success`,
    cancel_url: `${baseUrl}/payment?plan=${encodeURIComponent(planId)}&status=cancelled`,
    notify_url: `${baseUrl}/api/payments/payfast/notify`,
    name_first: user.user_metadata?.full_name ? String(user.user_metadata.full_name).split(" ")[0] : "Baseform",
    name_last: user.user_metadata?.full_name ? String(user.user_metadata.full_name).split(" ").slice(1).join(" ") : "Student",
    email_address: user.email ?? "",
    m_payment_id: mPaymentId,
    amount: toPayFastAmount(plan.price),
    item_name: `${plan.name} Plan`,
    item_description: `Baseform ${plan.name} subscription`,
    custom_str1: planId,
    custom_str2: user.id,
  };

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
