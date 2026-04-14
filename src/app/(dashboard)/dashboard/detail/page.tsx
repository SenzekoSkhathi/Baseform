import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateAPS, markToApsPoint } from "@/lib/aps/calculator";
import { isKznCaoUniversity, normalizeUniversityAbbr } from "@/lib/dashboard/applicationRules";
import DashboardDetailClient from "./DashboardDetailClient";

export default async function DashboardDetailPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: subjects }, { data: raw }] = await Promise.all([
    supabase.from("profiles").select("tier").eq("id", user.id).single(),
    supabase.from("student_subjects").select("subject_name, mark").eq("profile_id", user.id),
    supabase
      .from("applications")
      .select(`
        id, status, applied_at,
        faculties ( id, name, aps_minimum, field_of_study, qualification_type, duration_years, additional_requirements ),
        universities ( id, name, abbreviation, logo_url, closing_date )
      `)
      .eq("student_id", user.id)
      .order("applied_at", { ascending: true }),
  ]);

  const aps = subjects
    ? calculateAPS(subjects.map((s) => ({ name: s.subject_name, mark: s.mark })))
    : 0;

  const studentSubjects = subjects?.map((s) => ({
    subjectName: s.subject_name,
    mark: s.mark,
    apsPoints: markToApsPoint(s.mark),
  })) ?? [];

  // Group by university (using the direct universities join)
  const uniMap = new Map<string, {
    universityId: string;
    universityName: string;
    universityAbbreviation: string;
    universityLogoUrl: string | null;
    isCaoGroup: boolean;
    programmes: {
      applicationId: string;
      facultyId: string;
      facultyName: string;
      apsMinimum: number;
      fieldOfStudy: string;
      status: string;
      sourceUniversityId: string;
      sourceUniversityName: string;
      sourceUniversityAbbreviation: string;
      appliedAt: string | null;
    }[];
  }>();

  for (const app of raw ?? []) {
    const faculty = (app as any).faculties;
    const uni = (app as any).universities;
    if (!faculty || !uni) continue;

    const abbreviation = uni.abbreviation ?? uni.name.slice(0, 4).toUpperCase();
    const normalizedAbbr = normalizeUniversityAbbr(abbreviation);
    const isKzn = isKznCaoUniversity(normalizedAbbr);
    const groupId = isKzn ? "cao" : uni.id;
    const groupName = isKzn ? "CAO" : uni.name;
    const groupAbbr = isKzn ? "CAO" : abbreviation;
    const groupLogo = isKzn ? null : uni.logo_url ?? null;

    if (!uniMap.has(groupId)) {
      uniMap.set(groupId, {
        universityId: groupId,
        universityName: groupName,
        universityAbbreviation: groupAbbr,
        universityLogoUrl: groupLogo,
        isCaoGroup: isKzn,
        programmes: [],
      });
    }

    uniMap.get(groupId)!.programmes.push({
      applicationId: app.id,
      facultyId: faculty.id,
      facultyName: faculty.name,
      apsMinimum: faculty.aps_minimum,
      fieldOfStudy: faculty.field_of_study,
      status: app.status ?? "planning",
      sourceUniversityId: uni.id,
      sourceUniversityName: uni.name,
      sourceUniversityAbbreviation: abbreviation,
      appliedAt: app.applied_at ?? null,
    });
  }

  const groups = Array.from(uniMap.values()).map((group) => ({
    ...group,
    programmes: [...group.programmes].sort((a, b) => {
      const aTime = a.appliedAt ? new Date(a.appliedAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.appliedAt ? new Date(b.appliedAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    }),
  }));

  const tier = String((profile as { tier?: string } | null)?.tier ?? "free").trim().toLowerCase();

  return (
    <DashboardDetailClient
      universityGroups={groups}
      aps={aps}
      studentSubjects={studentSubjects}
      tier={tier}
    />
  );
}
