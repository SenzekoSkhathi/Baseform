import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const FACULTY_SELECT =
  "id, name, university_id, aps_minimum, native_score_minimum, scoring_system, " +
  "field_of_study, duration_years, qualification_type, nqf_level, places_available, " +
  "additional_requirements, universities(id, name, abbreviation, province, city)";

const PAGE_SIZE = 1000;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const universityId = searchParams.get("universityId");
    const query = searchParams.get("q");

    // When filtering by a specific university, there will never be >1000 rows —
    // a single fetch is fine. Only the all-universities view needs pagination.
    if (universityId) {
      let dbQuery = supabase
        .from("faculties")
        .select(FACULTY_SELECT)
        .eq("university_id", universityId)
        .order("name");

      if (query) {
        dbQuery = dbQuery.or(`name.ilike.%${query}%,field_of_study.ilike.%${query}%`);
      }

      const { data, error } = await dbQuery;
      if (error) {
        Sentry.captureException(error);
        return NextResponse.json({ error: "Failed to fetch programmes" }, { status: 500 });
      }

      return NextResponse.json(transformAndDedupe(data ?? []), {
        headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
      });
    }

    // All-universities view: paginate to bypass Supabase max-rows cap
    let allRows: any[] = [];
    let from = 0;

    while (true) {
      let dbQuery = supabase
        .from("faculties")
        .select(FACULTY_SELECT)
        .order("name", { referencedTable: "universities" })
        .order("name")
        .range(from, from + PAGE_SIZE - 1);

      if (query) {
        dbQuery = dbQuery.or(`name.ilike.%${query}%,field_of_study.ilike.%${query}%`);
      }

      const { data, error } = await dbQuery;
      if (error) {
        Sentry.captureException(error);
        return NextResponse.json({ error: "Failed to fetch programmes" }, { status: 500 });
      }

      if (!data || data.length === 0) break;
      allRows = allRows.concat(data);
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    return NextResponse.json(transformAndDedupe(allRows), {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function transformAndDedupe(rows: any[]) {
  const unique = new Map<string, object>();

  for (const item of rows) {
    const programme = {
      id: item.id,
      name: item.name,
      universityId: item.university_id,
      universityName: item.universities?.name || "Unknown",
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
    };

    const key = [
      programme.universityId,
      programme.name,
      (programme as any).fieldOfStudy ?? "",
      (programme as any).qualificationType ?? "",
    ]
      .map((v) => String(v ?? "").trim().toLowerCase())
      .join("|");

    if (!unique.has(key)) unique.set(key, programme);
  }

  return Array.from(unique.values());
}
