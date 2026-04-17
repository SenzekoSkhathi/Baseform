import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelPayFastSubscription } from "@/lib/payfast";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("subscription_token, subscription_status, plan_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.subscription_token) {
    return NextResponse.json({ error: "No active subscription to cancel." }, { status: 400 });
  }

  if (profile.subscription_status === "cancelled") {
    return NextResponse.json({
      ok: true,
      message: "Subscription already cancelled.",
      planExpiresAt: profile.plan_expires_at,
    });
  }

  const result = await cancelPayFastSubscription(profile.subscription_token);
  if (!result.ok) {
    Sentry.captureException(new Error(result.error ?? "PayFast cancel failed"));
    return NextResponse.json(
      { error: "Could not cancel subscription. Please try again or contact support." },
      { status: 502 }
    );
  }

  // User keeps access until plan_expires_at — only status changes.
  const { error } = await admin
    .from("profiles")
    .update({
      subscription_status: "cancelled",
      next_billing_date: null,
    })
    .eq("id", user.id);

  if (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not update subscription state." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Subscription cancelled. Access continues until the end of the current period.",
    planExpiresAt: profile.plan_expires_at,
  });
}
