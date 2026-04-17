export function normalizePlanTier(value: unknown): string {
  return String(value ?? "free").trim().toLowerCase();
}

export function isFreePlanTier(value: unknown): boolean {
  return normalizePlanTier(value) === "free";
}

/** True when a Grade 11 user is on the free tier (no Pro features unlocked). */
export function isGrade11FreeTier(gradeYear: string | null | undefined, tier: unknown): boolean {
  return gradeYear === "Grade 11" && isFreePlanTier(tier);
}

/**
 * True when a subscription-backed paid tier has lapsed (plan_expires_at < now).
 * Only applies to Grade 11 Pro today — Essential plans are one-off term purchases
 * without an expiry column.
 */
export function isPaidAccessExpired(
  tier: unknown,
  planExpiresAt: string | null | undefined
): boolean {
  const normalized = normalizePlanTier(tier);
  if (normalized === "free") return false;
  if (!planExpiresAt) return false; // no expiry tracked = legacy one-off purchase
  return new Date(planExpiresAt).getTime() < Date.now();
}

/** Effective tier after applying expiry — downgrades to "free" when access has lapsed. */
export function effectivePlanTier(
  tier: unknown,
  planExpiresAt: string | null | undefined
): string {
  return isPaidAccessExpired(tier, planExpiresAt) ? "free" : normalizePlanTier(tier);
}

/**
 * True when the user has no paid access right now — either genuinely on free,
 * or on a paid tier whose plan_expires_at is in the past.
 * Gatekeepers should use this instead of isFreePlanTier so lapsed subscriptions
 * don't keep Pro features unlocked.
 */
export function isEffectivelyFreeTier(
  tier: unknown,
  planExpiresAt: string | null | undefined
): boolean {
  return effectivePlanTier(tier, planExpiresAt) === "free";
}
