import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateAPS } from "@/lib/aps/calculator";
import ProgrammesClient from "./ProgrammesClient";
import { Programme } from "@/lib/dashboard/types";

type University = {
  id: string;
  name: string;
  abbreviation: string | null;
  province: string | null;
  city: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  applicationUrl: string | null;
  applicationFee: number | null;
  closingDate: string | null;
};

const FACULTY_SELECT =
  "id, name, university_id, aps_minimum, native_score_minimum, scoring_system, " +
  "field_of_study, duration_years, qualification_type, nqf_level, places_available, " +
  "additional_requirements, universities(id, name, abbreviation)";

async function fetchAllFaculties(supabase: Awaited<ReturnType<typeof createClient>>) {
  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("faculties")
      .select(FACULTY_SELECT)
      .order("name")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRows = allRows.concat(data);

    // If we got fewer rows than the page size, we've reached the end
    if (data.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  return allRows;
}

export default async function ProgrammesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: subjects }, { data: universities }, rawProgrammes, { data: savedTargets }] = await Promise.all([
    supabase
      .from("profiles")
      .select("field_of_interest, grade_year")
      .eq("id", user.id)
      .single(),
    supabase.from("student_subjects").select("*").eq("profile_id", user.id),
    supabase
      .from("universities")
      .select("id, name, abbreviation, province, city, logo_url, website_url, application_url, application_fee, closing_date")
      .eq("is_active", true)
      .order("name"),
    fetchAllFaculties(supabase),
    supabase.from("targets").select("id, faculty_id").eq("user_id", user.id),
  ]);

  const aps = subjects
    ? calculateAPS(subjects.map((s) => ({ name: s.subject_name, mark: s.mark })))
    : 0;

  const studentSubjects = subjects?.map((s) => ({
    subjectName: s.subject_name,
    mark: s.mark,
    apsPoints: 0,
  })) ?? [];

  const universityRows: University[] = (universities ?? []).map((university) => ({
    id: university.id,
    name: university.name,
    abbreviation: university.abbreviation,
    province: university.province,
    city: university.city,
    logoUrl: university.logo_url,
    websiteUrl: university.website_url,
    applicationUrl: university.application_url,
    applicationFee: university.application_fee,
    closingDate: university.closing_date,
  }));

  const programmeRows: Programme[] = rawProgrammes.map((item: any) => ({
    id: item.id,
    name: item.name,
    universityId: item.university_id,
    universityName: item.universities?.name ?? "Unknown University",
    universityAbbreviation: item.universities?.abbreviation ?? "N/A",
    apsMinimum: item.aps_minimum,
    nativeScoreMinimum: item.native_score_minimum,
    scoringSystem: item.scoring_system,
    fieldOfStudy: item.field_of_study,
    durationYears: item.duration_years,
    qualificationType: item.qualification_type,
    nqfLevel: item.nqf_level,
    placesAvailable: item.places_available,
    additionalRequirements: item.additional_requirements,
  }));

  // Build a map of facultyId -> targetId for quick lookup
  const initialTargets: Record<number, number> = {};
  for (const t of savedTargets ?? []) {
    initialTargets[t.faculty_id] = t.id;
  }

  return (
    <ProgrammesClient
      aps={aps}
      studentSubjects={studentSubjects}
      fieldOfInterest={profile?.field_of_interest ?? null}
      universities={universityRows}
      programmes={programmeRows}
      isGrade11={profile?.grade_year === "Grade 11"}
      initialTargets={initialTargets}
    />
  );
}
