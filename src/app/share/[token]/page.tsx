import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateAPS, apsRating, markToApsPoint } from "@/lib/aps/calculator";
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

  // Count qualifying programmes and bursaries (subject to the student's APS)
  const [{ count: programmeCount }, { count: fundingCount }] = await Promise.all([
    admin
      .from("faculties")
      .select("*", { count: "exact", head: true })
      .lte("aps_minimum", aps),
    admin
      .from("bursaries")
      .select("*", { count: "exact", head: true })
      .lte("minimum_aps", aps)
      .eq("is_active", true),
  ]);

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
      rating={apsRating(aps)}
      school={profile.school_name ?? null}
      gradeYear={profile.grade_year ?? null}
      subjects={subjects}
      programmeCount={programmeCount ?? 0}
      fundingCount={fundingCount ?? 0}
      shareUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? "https://baseform.co.za"}/share/${token}`}
    />
  );
}
