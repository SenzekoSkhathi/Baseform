import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateAPS, markToApsPoint } from "@/lib/aps/calculator";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: subjects }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, province, field_of_interest, tier, grade_year, school_name, guardian_name, guardian_phone, guardian_relationship, guardian_email, guardian_whatsapp_number")
      .eq("id", user.id)
      .single(),
    supabase
      .from("student_subjects")
      .select("subject_name, mark")
      .eq("profile_id", user.id)
      .order("mark", { ascending: false }),
  ]);

  const aps = subjects
    ? calculateAPS(subjects.map((s) => ({ name: s.subject_name, mark: s.mark })))
    : 0;

  const studentSubjects = subjects?.map((s) => ({
    subjectName: s.subject_name,
    mark: s.mark,
    apsPoints: markToApsPoint(s.mark),
  })) ?? [];

  return (
    <Suspense fallback={<div className="flex justify-center p-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" /></div>}>
      <ProfileClient
      profile={profile}
      aps={aps}
      subjects={studentSubjects}
      email={user.email ?? ""}
      userId={user.id}
    />
    </Suspense>
  );
}
