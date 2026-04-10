import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateAPS, markToApsPoint } from "@/lib/aps/calculator";
import { checkQualification } from "@/lib/dashboard/qualifications";
import { isKznCaoUniversity } from "@/lib/dashboard/applicationRules";
import UniversityDetailClient from "./UniversityDetailClient";

export default async function UniversityDetailPage({
  params,
}: {
  params: Promise<{ universityId: string }>;
}) {
  const { universityId } = await params;
  const isCaoRoute = universityId.toLowerCase() === "cao";
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: subjects }, { data: uni }, { data: applications }] = await Promise.all([
    supabase.from("student_subjects").select("subject_name, mark").eq("profile_id", user.id),
    isCaoRoute
      ? Promise.resolve({ data: null as any })
      : supabase
          .from("universities")
          .select("id, name, abbreviation, logo_url, province, city, closing_date, website_url, application_url, application_fee")
          .eq("id", universityId)
          .single(),
    supabase
      .from("applications")
      .select(`
        id, status,
        faculties ( id, name, aps_minimum, field_of_study, qualification_type, duration_years, additional_requirements ),
        universities ( id, name, abbreviation, logo_url, province, city, closing_date, website_url, application_url, application_fee )
      `)
      .eq("student_id", user.id)
      .order("applied_at", { ascending: true }),
  ]);

  if (!isCaoRoute && !uni) notFound();

  const aps = subjects
    ? calculateAPS(subjects.map((s) => ({ name: s.subject_name, mark: s.mark })))
    : 0;

  const studentSubjects = subjects?.map((s) => ({
    subjectName: s.subject_name,
    mark: s.mark,
    apsPoints: markToApsPoint(s.mark),
  })) ?? [];

  const filteredApplications = (applications ?? []).filter((app: any) => {
    if (!isCaoRoute) return String(app.university_id) === String(universityId) || String((app as any)?.universities?.id) === String(universityId);
    const abbr = (app as any)?.universities?.abbreviation;
    return isKznCaoUniversity(abbr);
  });

  const selectedUniversity = isCaoRoute
    ? {
        id: "cao",
        name: "CAO",
        abbreviation: "CAO",
        logo_url: null,
        province: "KwaZulu-Natal",
        city: null,
        closing_date: null,
        website_url: "https://www.cao.ac.za/",
        application_url: "https://www.cao.ac.za/",
        application_fee: 250,
      }
    : uni;

  const programmes = filteredApplications.map((app: any) => {
    const f = (app as any).faculties;
    if (!f) return null;
    const appUni = (app as any).universities;
    const programme = {
      id: f.id,
      name: f.name,
      universityId: selectedUniversity.id,
      universityName: selectedUniversity.name,
      universityAbbreviation: selectedUniversity.abbreviation ?? selectedUniversity.name.slice(0, 4).toUpperCase(),
      apsMinimum: f.aps_minimum,
      nativeScoreMinimum: null,
      scoringSystem: "",
      fieldOfStudy: f.field_of_study,
      durationYears: f.duration_years,
      qualificationType: f.qualification_type,
      nqfLevel: 0,
      placesAvailable: null,
      additionalRequirements: appUni?.name
        ? `${f.additional_requirements ? `${f.additional_requirements} · ` : ""}University: ${appUni.name}`
        : f.additional_requirements,
    };
    return {
      applicationId: app.id,
      applicationStatus: app.status ?? "planning",
      sourceUniversityAbbreviation: appUni?.abbreviation ?? appUni?.name?.slice(0, 4)?.toUpperCase() ?? null,
      programme,
      qualification: checkQualification(programme, aps, studentSubjects),
    };
  }).filter(Boolean) as any[];

  return (
    <UniversityDetailClient
      university={{
        id: selectedUniversity.id,
        name: selectedUniversity.name,
        abbreviation: selectedUniversity.abbreviation ?? selectedUniversity.name.slice(0, 4).toUpperCase(),
        logoUrl: selectedUniversity.logo_url ?? null,
        province: selectedUniversity.province,
        city: selectedUniversity.city,
        closing_date: selectedUniversity.closing_date,
        website_url: selectedUniversity.website_url ?? null,
        application_url: selectedUniversity.application_url ?? null,
        application_fee: selectedUniversity.application_fee ?? null,
      }}
      programmes={programmes}
      aps={aps}
    />
  );
}
