import { redirect } from "next/navigation";
import TopRightActions from "@/components/nav/TopRightActions";
import OfflineIndicator from "@/components/ui/OfflineIndicator";
import { createClient } from "@/lib/supabase/server";
import { isOnboardingComplete } from "@/lib/onboarding/status";
import { requireVerifiedUser } from "@/lib/auth/guards";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Step 1: must be signed in AND email-verified. Unverified users get bounced
  // to /verify-email; unauthenticated to /login. No way past this gate.
  const user = await requireVerifiedUser();

  // Step 2: onboarding must be complete so the profile is usable.
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, school_name, grade_year, guardian_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!isOnboardingComplete(profile)) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopRightActions />
      {children}
      <OfflineIndicator />
    </div>
  );
}
