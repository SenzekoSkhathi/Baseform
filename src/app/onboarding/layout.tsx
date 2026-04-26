import { requireVerifiedUser } from "@/lib/auth/guards";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Onboarding fills in the profile, so we don't gate on profile completeness
  // here — but the user must be email-verified to pass through.
  await requireVerifiedUser();
  return <>{children}</>;
}
