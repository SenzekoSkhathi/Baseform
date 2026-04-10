import { createClient } from "@/lib/supabase/server";
import { Programme } from "./types";

/**
 * Fetch all universities
 */
export async function fetchUniversities() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("universities")
    .select("id, name, abbreviation, province, city")
    .eq("is_active", true)
    .order("name");
  
  if (error) {
    console.error("Failed to fetch universities:", error);
    return [];
  }
  
  return data || [];
}

/**
 * Fetch programmes for a specific university or all
 */
export async function fetchProgrammes(universityId?: string): Promise<Programme[]> {
  const supabase = await createClient();
  
  let query = supabase
    .from("faculties")
    .select(
      "id, name, university_id, aps_minimum, native_score_minimum, scoring_system, " +
      "field_of_study, duration_years, qualification_type, nqf_level, places_available, " +
      "additional_requirements, universities(name, abbreviation)"
    );
  
  if (universityId) {
    query = query.eq("university_id", universityId);
  }
  
  const { data, error } = await query.order("universities(name)").order("name");
  
  if (error) {
    console.error("Failed to fetch programmes:", error);
    return [];
  }
  
  return (data || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    universityId: item.university_id,
    universityName: item.universities?.name || "Unknown University",
    universityAbbreviation: item.universities?.abbreviation || "N/A",
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
}

/**
 * Search programmes by name or field
 */
export async function searchProgrammes(query: string): Promise<Programme[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("faculties")
    .select(
      "id, name, university_id, aps_minimum, native_score_minimum, scoring_system, " +
      "field_of_study, duration_years, qualification_type, nqf_level, places_available, " +
      "additional_requirements, universities(name, abbreviation)"
    )
    .or(`name.ilike.%${query}%,field_of_study.ilike.%${query}%`)
    .order("name");
  
  if (error) {
    console.error("Failed to search programmes:", error);
    return [];
  }
  
  return (data || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    universityId: item.university_id,
    universityName: item.universities?.name || "Unknown University",
    universityAbbreviation: item.universities?.abbreviation || "N/A",
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
}
