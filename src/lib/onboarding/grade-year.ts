// Synchronous cache of the last-known grade year for instant render of pages
// that pivot UI on grade (plans, payment) before the profile fetch resolves.
//
// History: previously stored under a SHARED `bf_onboarding` blob, which leaked
// across users on the same device. Now stored per-user at `bf_grade_year:<uid>`.
// `bf_onboarding` is reserved exclusively for PRE-AUTH onboarding state and is
// cleared on first authenticated dashboard load (see clearPreAuthOnboarding).

const GRADE_KEY_PREFIX = "bf_grade_year:";
const PRE_AUTH_ONBOARDING_KEY = "bf_onboarding";

function gradeKey(userId: string): string {
  return `${GRADE_KEY_PREFIX}${userId}`;
}

export function readCachedGradeYear(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(gradeKey(userId));
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function cacheGradeYear(userId: string, gradeYear: string | null | undefined): void {
  if (typeof window === "undefined") return;
  if (!userId || !gradeYear) return;
  try {
    window.localStorage.setItem(gradeKey(userId), gradeYear);
  } catch {
    /* storage full / disabled — not critical */
  }
}

/**
 * Clear pre-auth onboarding state and any other user's cached grade year.
 * Call this on every authenticated page mount so a shared device doesn't
 * leak a previous user's onboarding draft into the next signup or render.
 */
export function clearPreAuthOnboarding(currentUserId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PRE_AUTH_ONBOARDING_KEY);
    window.localStorage.removeItem("bf_pending_signup_profile");
    window.localStorage.removeItem("bf_pending_referral");

    const myKey = gradeKey(currentUserId);
    const toRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(GRADE_KEY_PREFIX) && k !== myKey) toRemove.push(k);
    }
    for (const k of toRemove) window.localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}
