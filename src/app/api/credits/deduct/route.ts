import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isEffectivelyFreeTier } from "@/lib/access/tiers";
import { deductCredits, CREDIT_COSTS, type CreditAction } from "@/lib/credits";
import { sendPushToUser } from "@/lib/webpush";

function isValidAction(value: string): value is CreditAction {
  return Object.keys(CREDIT_COSTS).includes(value);
}

function buildThresholdMessage(pct: number, remaining: number, weekly: number): { title: string; body: string } {
  const messages: Record<number, { title: string; body: string }> = {
    25:  { title: "25% of weekly credits used",        body: `You have ${remaining} of your ${weekly} Base Credits left this week.` },
    50:  { title: "Halfway through your weekly credits", body: `${remaining} Base Credits remain for this week.` },
    80:  { title: "80% of weekly credits used",        body: `Only ${remaining} Base Credits left this week — next top-up is 7 days after your last refill.` },
    90:  { title: "Running low on credits",            body: `Only ${remaining} Base Credits left. Your next top-up lands 7 days after your last refill.` },
    95:  { title: "Almost out of Base Credits",        body: `${remaining} credit${remaining === 1 ? "" : "s"} remain. Save them for what matters most.` },
  };
  return messages[pct] ?? { title: `${pct}% of weekly credits used`, body: `${remaining} Base Credits remaining.` };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, plan_expires_at")
    .eq("id", session.user.id)
    .maybeSingle();

  const body = (await req.json().catch(() => null)) as { action?: string; description?: string } | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  if (!body.action || !isValidAction(body.action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  if (isEffectivelyFreeTier(profile?.tier, profile?.plan_expires_at)) {
    // Free users' 20 monthly credits are restricted to BaseBot messages.
    if (body.action !== "basebot_message") {
      return NextResponse.json(
        { error: "This feature is available on paid plans only.", upgrade: true, redirect: "/basebot/preview?reason=out-of-credits" },
        { status: 403 },
      );
    }
  }

  const result = await deductCredits(session.user.id, body.action, body.description);
  if (!result.ok) {
    return NextResponse.json({ error: "Insufficient credits." }, { status: 402 });
  }

  // Fire push notification if a new threshold was just crossed
  if (result.newThreshold != null && result.credits) {
    const remaining = Math.max(0, result.credits.balance);
    const weekly = result.credits.weekStartBalance || 100;
    const msg = buildThresholdMessage(result.newThreshold, remaining, weekly);
    sendPushToUser(session.user.id, {
      title: msg.title,
      body: msg.body,
      href: "/settings/usage",
      tag: `credits-threshold-${result.newThreshold}`,
    }).catch(() => undefined); // non-blocking
  }

  return NextResponse.json({ ok: true });
}
