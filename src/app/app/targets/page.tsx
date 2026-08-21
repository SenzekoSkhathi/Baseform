import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateAPS, calculateWitsAPS } from "@/lib/aps/calculator";
import { isGrade11FreeTier } from "@/lib/access/tiers";
import LockedFeature from "@/components/access/LockedFeature";
import TargetsClient from "./TargetsClient";

export const metadata = { title: "My Targets — Baseform" };

export default async function TargetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Grade 12 users don't have My Targets — that's a Grade 11 planning feature
  // Grade 11 free users see a locked upgrade prompt — it's a Pro feature in their plan
  const { data: accessProfile } = await supabase
    .from("profiles")
    .select("grade_year, tier")
    .eq("id", user.id)
    .maybeSingle();

  if (accessProfile?.grade_year === "Grade 12") redirect("/dashboard");

  if (isGrade11FreeTier(accessProfile?.grade_year, accessProfile?.tier)) {
    return (
      <LockedFeature
        title="My Targets"
        description="Pin the universities and programmes you want to get into. Build your planning board now so you know exactly where to apply when applications open."
        features={[
          "Unlimited programme compatibility tracking",
          "Save target universities and faculties",
          "See APS requirements vs your current score",
          "Plan your application list ahead of Grade 12",
        ]}
      />
    );
  }

  const [{ data: profile }, { data: subjects }, { data: targets }] = await Promise.all([
    supabase.from("profiles").select("full_name, grade_year").eq("id", user.id).single(),
    supabase.from("student_subjects").select("subject_name, mark").eq("profile_id", user.id),
    supabase
      .from("targets")
      .select(`
        id, created_at,
        faculties ( id, name, field_of_study, aps_minimum, qualification_type, duration_years, additional_requirements ),
        universities ( id, name, abbreviation, logo_url, closing_date, application_url )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const subjectsForAps = (subjects ?? []).map((s) => ({ name: s.subject_name, mark: s.mark }));
  const aps = calculateAPS(subjectsForAps);
  const witsAps = calculateWitsAPS(subjectsForAps);

  return (
    <TargetsClient
      targets={(targets ?? []) as any[]}
      aps={aps}
      witsAps={witsAps}
      gradeYear={profile?.grade_year ?? null}
    />
  );
}
