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

  const [{ count: totalCount }, { count: submittedCount }] = await Promise.all([
    supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("student_id", user.id),
    supabase
      .from("applications")
      .select("*", { count: "exact", head: true })
      .eq("student_id", user.id)
      .in("status", ["submitted", "accepted", "rejected", "waitlisted"]),
  ]);

  return (
    <DashboardClient
      profile={profile}
      aps={aps}
      totalCount={totalCount ?? 0}
      submittedCount={submittedCount ?? 0}
    />
  );
}
