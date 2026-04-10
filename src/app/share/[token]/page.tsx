import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateAPS, apsRating } from "@/lib/aps/calculator";
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

  const { data: subjects } = await admin
    .from("student_subjects")
    .select("subject_name, mark")
    .eq("profile_id", profile.id);

  const aps = subjects?.length
    ? calculateAPS(subjects.map((s) => ({ name: s.subject_name, mark: s.mark })))
    : 0;

  const firstName = (profile.full_name ?? "").trim().split(" ")[0] || "A student";

  return (
    <ShareCardClient
      firstName={firstName}
      aps={aps}
      rating={apsRating(aps)}
      school={profile.school_name ?? null}
      gradeYear={profile.grade_year ?? null}
      shareUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? "https://baseform.co.za"}/share/${token}`}
    />
  );
}
