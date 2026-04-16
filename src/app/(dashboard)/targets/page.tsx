import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateAPS } from "@/lib/aps/calculator";
import TargetsClient from "./TargetsClient";

export const metadata = { title: "My Targets — Baseform" };

export default async function TargetsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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

  const aps = subjects
    ? calculateAPS(subjects.map((s) => ({ name: s.subject_name, mark: s.mark })))
    : 0;

  return (
    <TargetsClient
      targets={(targets ?? []) as any[]}
      aps={aps}
      gradeYear={profile?.grade_year ?? null}
    />
  );
}
