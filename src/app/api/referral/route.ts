import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const REFERRAL_UNLOCK = 120;
const WINDOW_DAYS = 30;

function generateCode(): string {
  // No I, O, 0, 1 to avoid confusion
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Get or create referral code
  let { data: codeRow } = await admin
    .from("referral_codes")
    .select("code")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!codeRow) {
    // Generate unique code (retry on collision)
    let code = generateCode();
    let attempts = 0;
    while (attempts < 5) {
      const { error } = await admin
        .from("referral_codes")
        .insert({ user_id: user.id, code });
      if (!error) { codeRow = { code }; break; }
      code = generateCode();
      attempts++;
    }
    if (!codeRow) {
      return NextResponse.json({ error: "Could not generate referral code." }, { status: 500 });
    }
  }

  // Get credit stats
  const { data: credits } = await admin
    .from("user_credits")
    .select("balance, referral_pending, referral_window_start, referral_unlocked")
    .eq("user_id", user.id)
    .maybeSingle();

  // Count successful referrals
  const { count: referralCount } = await admin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", user.id);

  const now = Date.now();
  const windowStart = credits?.referral_window_start
    ? new Date(credits.referral_window_start).getTime()
    : null;
  const windowExpired = windowStart
    ? (now - windowStart) > WINDOW_DAYS * 86_400_000
    : false;
  const windowDaysLeft = windowStart && !windowExpired
    ? Math.max(0, WINDOW_DAYS - Math.floor((now - windowStart) / 86_400_000))
    : null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const referralUrl = `${appUrl}/signup?ref=${codeRow.code}`;

  return NextResponse.json({
    code: codeRow.code,
    referralUrl,
    pending: windowExpired ? 0 : (credits?.referral_pending ?? 0),
    unlocked: credits?.referral_unlocked ?? false,
    balance: credits?.balance ?? 0,
    windowStart: windowExpired ? null : (credits?.referral_window_start ?? null),
    windowDaysLeft,
    referralCount: referralCount ?? 0,
    unlockAt: REFERRAL_UNLOCK,
  });
}
