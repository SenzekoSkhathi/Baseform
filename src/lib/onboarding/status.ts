/**
 * A profile is considered "onboarding complete" when the student has actually
 * filled in the form past step 2 of /signup. We require the three fields that
 * the onboarding form makes mandatory:
 *   - school_name (academic context)
 *   - grade_year  (drives tier eligibility, AI prompt mode, weekly allowance)
 *   - guardian_name (legal/contact requirement for SA matric students)
 *
 * Admins are exempt — staff accounts don't go through onboarding.
 */
export type OnboardingProfile = {
  tier?: string | null;
  school_name?: string | null;
  grade_year?: string | null;
  guardian_name?: string | null;
};

export function isOnboardingComplete(profile: OnboardingProfile | null | undefined): boolean {
  if (!profile) return false;
  if (String(profile.tier ?? "").toLowerCase() === "admin") return true;

  const school = String(profile.school_name ?? "").trim();
  const grade = String(profile.grade_year ?? "").trim();
  const guardian = String(profile.guardian_name ?? "").trim();

  return school.length > 0 && grade.length > 0 && guardian.length > 0;
}
