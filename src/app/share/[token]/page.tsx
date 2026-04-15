import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateAPS, markToApsPoint } from "@/lib/aps/calculator";
import ShareCardClient from "./ShareCardClient";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, school_name, grade_year")
    .eq("share_token", token)
    .single();

  if (!profile) notFound();

  const { data: rawSubjects } = await admin
    .from("student_subjects")
    .select("subject_name, mark")
    .eq("profile_id", profile.id);

  const aps = rawSubjects?.length
    ? calculateAPS(rawSubjects.map((s) => ({ name: s.subject_name, mark: s.mark })))
    : 0;

  // Count qualifying programmes/bursaries and derive unique qualifying universities.
  const [{ count: programmeCount }, { data: facForUnis }, { count: fundingCount }] = await Promise.all([
    admin
      .from("faculties")
      .select("*", { count: "exact", head: true })
      .lte("aps_minimum", aps),
    admin
      .from("faculties")
      .select("university_id")
      .lte("aps_minimum", aps)
      .limit(5000),
    admin
      .from("bursaries")
      .select("*", { count: "exact", head: true })
      .lte("minimum_aps", aps)
      .eq("is_active", true),
  ]);

  const universitiesCount = new Set((facForUnis ?? []).map((f) => f.university_id)).size;

  // Build subject entries with APS point contribution
  const subjects = (rawSubjects ?? [])
    .filter((s) => s.subject_name && !s.subject_name.toLowerCase().includes("life orientation"))
    .map((s) => ({
      name: s.subject_name as string,
      mark: s.mark as number,
      apsPoints: markToApsPoint(s.mark),
    }))
    .sort((a, b) => b.apsPoints - a.apsPoints)
    .slice(0, 6); // best 6 (matching APS calculation)

  const fullName = (profile.full_name ?? "").trim() || "A student";

  return (
    <ShareCardClient
      fullName={fullName}
      aps={aps}
      school={profile.school_name ?? null}
      gradeYear={profile.grade_year ?? null}
      subjects={subjects}
      universitiesCount={universitiesCount}
      programmeCount={programmeCount ?? 0}
      fundingCount={fundingCount ?? 0}
      shareUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? "https://baseformapplications.com"}/share/${token}`}
    />
  );
}
