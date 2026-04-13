export function normalizePlanTier(value: unknown): string {
  return String(value ?? "free").trim().toLowerCase();
}

export function isFreePlanTier(value: unknown): boolean {
  return normalizePlanTier(value) === "free";
}
