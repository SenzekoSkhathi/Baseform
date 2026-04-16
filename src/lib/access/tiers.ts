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
