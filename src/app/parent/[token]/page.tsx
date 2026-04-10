import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateAPS, apsRating } from "@/lib/aps/calculator";
import ParentPortalClient from "./ParentPortalClient";

export default async function ParentPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, school_name, grade_year, field_of_interest")
    .eq("guardian_token", token)
    .single();

  if (!profile) notFound();

  const [{ data: subjects }, { data: applications }] = await Promise.all([
    admin
      .from("student_subjects")
      .select("subject_name, mark")
      .eq("profile_id", profile.id),
    admin
      .from("applications")
      .select(`
        id, status, updated_at,
        universities ( name, closing_date ),
        faculties ( name )
      `)
      .eq("student_id", profile.id)
      .order("updated_at", { ascending: false }),
  ]);

  const aps = subjects?.length
    ? calculateAPS(subjects.map((s) => ({ name: s.subject_name, mark: s.mark })))
    : 0;

  const firstName = (profile.full_name ?? "").trim().split(" ")[0] || "Your child";

  type AppRow = {
    id: string | number;
    status: string;
    updated_at: string;
    universities: { name: string; closing_date: string | null } | null;
    faculties: { name: string } | null;
  };

  const appList = ((applications ?? []) as AppRow[]).map((a) => ({
    id: String(a.id),
    status: a.status,
    updatedAt: a.updated_at,
    universityName: a.universities?.name ?? "Unknown",
    programmeName: a.faculties?.name ?? null,
    closingDate: a.universities?.closing_date ?? null,
  }));

  return (
    <ParentPortalClient
      firstName={firstName}
      gradeYear={profile.grade_year ?? null}
      school={profile.school_name ?? null}
      fieldOfInterest={profile.field_of_interest ?? null}
      aps={aps}
      rating={apsRating(aps)}
      applications={appList}
    />
  );
}
