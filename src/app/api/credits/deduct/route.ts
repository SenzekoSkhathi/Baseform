import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFreePlanTier } from "@/lib/access/tiers";
import { deductCredits, CREDIT_COSTS, type CreditAction } from "@/lib/credits";
import { sendPushToUser } from "@/lib/webpush";

function isValidAction(value: string): value is CreditAction {
  return Object.keys(CREDIT_COSTS).includes(value);
}

const THRESHOLD_MESSAGES: Record<number, { title: string; body: string }> = {
  25:  { title: "25% of weekly credits used", body: "You have 75 Base Credits left this week." },
  50:  { title: "Halfway through your weekly credits", body: "50 Base Credits remain for this week." },
  80:  { title: "80% of weekly credits used", body: "Only 20 Base Credits left this week — top-up lands Monday." },
  90:  { title: "Running low on credits", body: "Only 10 Base Credits left. Your weekly top-up lands Monday." },
  95:  { title: "Almost out of Base Credits", body: "5 or fewer credits remain. Save them for what matters most." },
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", session.user.id)
    .maybeSingle();

  if (isFreePlanTier(profile?.tier)) {
    // Free plan users can use BaseBot only if they have unlocked referral credits
    const { data: freeCredits } = await supabase
      .from("user_credits")
      .select("balance, referral_unlocked")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!freeCredits?.referral_unlocked || (freeCredits.balance ?? 0) <= 0) {
      return NextResponse.json({ error: "Credits are available on paid plans only." }, { status: 403 });
    }
    // Has unlocked referral credits — fall through to deduct
  }

  const body = (await req.json()) as { action?: string; description?: string };
  if (!body.action || !isValidAction(body.action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const result = await deductCredits(session.user.id, body.action, body.description);
  if (!result.ok) {
    return NextResponse.json({ error: "Insufficient credits." }, { status: 402 });
  }

  // Fire push notification if a new threshold was just crossed
  if (result.newThreshold != null) {
    const msg = THRESHOLD_MESSAGES[result.newThreshold];
    if (msg) {
      sendPushToUser(session.user.id, {
        title: msg.title,
        body: msg.body,
        href: "/settings/usage",
        tag: `credits-threshold-${result.newThreshold}`,
      }).catch(() => undefined); // non-blocking
    }
  }

  return NextResponse.json({ ok: true });
}
