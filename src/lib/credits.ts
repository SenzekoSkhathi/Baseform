import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";

export const CREDIT_CAP = 180;
export const WEEKLY_TOP_UP = 60;
export const GRADE11_WEEKLY_TOP_UP = 90;
export const PLAN_BONUS = 60;

/** Thresholds (% of weekly allowance used) that trigger notifications. */
export const CREDIT_THRESHOLDS = [25, 50, 80, 90, 95] as const;
export type CreditThreshold = (typeof CREDIT_THRESHOLDS)[number];

/** Credit cost per billable action. */
export const CREDIT_COSTS = {
  basebot_message: 1,
  bursary_alert: 1,
  email_scan: 1,
  motivation_letter: 5,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

export type CreditBalance = {
  balance: number;
  weekStartBalance: number;
  lastToppedUpAt: string | null;
  planStartDate: string;
  planTermMonths: number;
  /** How many of this week's 100 credits have been spent (0–100+). */
  weeklyUsed: number;
  /** Highest threshold crossed this week, or null if none. */
  highestThresholdCrossed: CreditThreshold | null;
  /** ISO timestamp when the next top-up is due (7 days after last_topped_up_at). */
  nextTopUpAt: string;
};

export type CreditTransaction = {
  id: string;
  amount: number;
  type: "bonus" | "top_up" | "usage";
  action: string | null;
  description: string | null;
  balanceAfter: number;
  createdAt: string;
};

/** Fetch the current balance for a user. Returns null if no credits row exists. */
export async function getUserCredits(userId: string): Promise<CreditBalance | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("user_credits")
    .select("balance, week_start_balance, last_topped_up_at, plan_start_date, plan_term_months")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;

  const weeklyUsed = Math.max(0, data.week_start_balance - data.balance);
  // Use week_start_balance as denominator so the % is correct for any weekly allowance
  const allowance = data.week_start_balance > 0 ? data.week_start_balance : WEEKLY_TOP_UP;
  const pctUsed = (weeklyUsed / allowance) * 100;
  const highestThresholdCrossed = [...CREDIT_THRESHOLDS]
    .reverse()
    .find((t) => pctUsed >= t) ?? null;

  const anchor = data.last_topped_up_at ?? data.plan_start_date;
  const nextTopUpAt = new Date(new Date(anchor).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return {
    balance: data.balance,
    weekStartBalance: data.week_start_balance,
    lastToppedUpAt: data.last_topped_up_at,
    planStartDate: data.plan_start_date,
    planTermMonths: data.plan_term_months,
    weeklyUsed,
    highestThresholdCrossed,
    nextTopUpAt,
  };
}

/** Fetch recent credit transactions for a user (newest first). */
export async function getCreditTransactions(
  userId: string,
  limit = 20
): Promise<CreditTransaction[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("credit_transactions")
    .select("id, amount, type, action, description, balance_after, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    amount: row.amount,
    type: row.type,
    action: row.action,
    description: row.description,
    balanceAfter: row.balance_after,
    createdAt: row.created_at,
  }));
}

export type DeductResult = {
  ok: boolean;
  /** Credits state after deduction — only present when ok is true. */
  credits?: CreditBalance;
  /** Threshold first crossed by this deduction, if any. */
  newThreshold?: CreditThreshold | null;
};

/**
 * Deduct credits for an action.
 * Returns ok=false if insufficient credits.
 * Returns the updated credit state and any newly-crossed threshold when ok=true.
 */
export async function deductCredits(
  userId: string,
  action: CreditAction,
  description?: string
): Promise<DeductResult> {
  const supabase = createAdminClient();
  const cost = CREDIT_COSTS[action];

  // Snapshot threshold before deduction
  const before = await getUserCredits(userId);

  const { data, error } = await supabase.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount: cost,
    p_action: action,
    p_description: description ?? null,
  });

  if (error) {
    Sentry.captureException(error);
    return { ok: false };
  }

  if (data !== true) return { ok: false };

  const after = await getUserCredits(userId);
  const newThreshold =
    after?.highestThresholdCrossed !== before?.highestThresholdCrossed
      ? after?.highestThresholdCrossed ?? null
      : null;

  return { ok: true, credits: after ?? undefined, newThreshold };
}

/**
 * Initialize credits when a plan is activated.
 * Grants the 100 bonus credits, resets the credits row on re-purchase.
 */
export async function initializeUserCredits(
  userId: string,
  termMonths: number
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("initialize_user_credits", {
    p_user_id: userId,
    p_term_months: termMonths,
  });

  if (error) {
    Sentry.captureException(error);
  }
}
