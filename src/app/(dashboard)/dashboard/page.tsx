import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateAPS } from "@/lib/aps/calculator";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: subjects }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, province, field_of_interest, tier, grade_year, school_name")
      .eq("id", user.id)
      .single(),
    supabase.from("student_subjects").select("*").eq("profile_id", user.id),
  ]);

  const aps = subjects
    ? calculateAPS(subjects.map((s) => ({ name: s.subject_name, mark: s.mark })))
    : 0;

  const studentSubjects = subjects?.map((s) => ({ name: s.subject_name, mark: s.mark })) ?? [];

  const { data: applications } = await supabase
    .from("applications")
    .select("status, universities ( abbreviation )")
    .eq("student_id", user.id);

  const institutionStatuses = new Map<string, { hasSubmitted: boolean }>();
  for (const app of applications ?? []) {
    const uni = (app as any).universities;
    const rawAbbr = typeof uni?.abbreviation === "string" ? uni.abbreviation.trim().toUpperCase() : "";
    const groupKey = ["UKZN", "DUT", "MUT", "UNIZULU", "UNISA"].includes(rawAbbr)
      ? "CAO"
      : rawAbbr || "UNKNOWN";
    const current = institutionStatuses.get(groupKey) ?? { hasSubmitted: false };
    if (["submitted", "accepted", "rejected", "waitlisted"].includes(app.status ?? "planning")) {
      current.hasSubmitted = true;
    }
    institutionStatuses.set(groupKey, current);
  }

  const totalInstitutionCount = institutionStatuses.size;
  const submittedInstitutionCount = Array.from(institutionStatuses.values()).filter((item) => item.hasSubmitted).length;

  return (
    <DashboardClient
      userId={user.id}
      profile={profile}
      aps={aps}
      subjects={studentSubjects}
      totalInstitutionCount={totalInstitutionCount}
      submittedInstitutionCount={submittedInstitutionCount}
    />
  );
}
