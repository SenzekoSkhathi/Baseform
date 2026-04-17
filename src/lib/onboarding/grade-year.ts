// Synchronous read of the last-known grade year from localStorage. Used on
// initial render of client pages that render different plan pools per grade
// (plans, payment) to avoid a flash of the wrong pool before the profile fetch
// resolves.
export function readCachedGradeYear(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("bf_onboarding");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { gradeYear?: unknown };
    const value = parsed?.gradeYear;
    return typeof value === "string" && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

// Persist the grade year after a profile fetch so subsequent renders are
// instant. Safe to call with null/undefined — no-ops.
export function cacheGradeYear(gradeYear: string | null | undefined): void {
  if (typeof window === "undefined") return;
  if (!gradeYear) return;
  try {
    const raw = window.localStorage.getItem("bf_onboarding");
    const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    parsed.gradeYear = gradeYear;
    window.localStorage.setItem("bf_onboarding", JSON.stringify(parsed));
  } catch {
    // storage full / disabled — not critical
  }
}
