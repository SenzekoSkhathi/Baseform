import { createClient } from "@/lib/supabase/server";
import {
  KZN_CAO_MAX_CHOICES,
  getUniversityChoiceLimit,
  isKznCaoUniversity,
  normalizeUniversityAbbr,
} from "@/lib/dashboard/applicationRules";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("applications")
    .select(`
      id, status, applied_at, notes,
      faculties ( id, name, aps_minimum, field_of_study, qualification_type, duration_years, additional_requirements ),
      universities ( id, name, abbreviation, logo_url, closing_date )
    `)
    .eq("student_id", user.id)
    .order("applied_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { facultyIds, universityId } = await req.json();
  if (!Array.isArray(facultyIds) || facultyIds.length === 0 || !universityId) {
    return NextResponse.json({ error: "facultyIds and universityId required" }, { status: 400 });
  }

  const normalizedFacultyIds = facultyIds.map((id: string | number) => String(id));

  const { data: targetUni, error: uniError } = await supabase
    .from("universities")
    .select("id, abbreviation, name")
    .eq("id", universityId)
    .single();

  if (uniError || !targetUni) {
    return NextResponse.json({ error: "Invalid university selected." }, { status: 400 });
  }

  const targetAbbr = normalizeUniversityAbbr(targetUni.abbreviation);
  const targetLimit = getUniversityChoiceLimit(targetAbbr);
  const isKznTarget = isKznCaoUniversity(targetAbbr);

  // Skip already-added ones
  const { data: existing } = await supabase
    .from("applications")
    .select("faculty_id")
    .eq("student_id", user.id)
    .in("faculty_id", normalizedFacultyIds);

  const existingIds = new Set((existing ?? []).map((r: any) => String(r.faculty_id)));
  const toInsert = normalizedFacultyIds
    .filter((id: string) => !existingIds.has(id))
    .map((faculty_id: string) => ({
      student_id: user.id,
      faculty_id,
      university_id: universityId,
      status: "planning",
      type: "university",
    }));

  if (toInsert.length === 0) return NextResponse.json({ added: 0 });

  const { data: currentApps, error: currentAppsError } = await supabase
    .from("applications")
    .select("university_id, universities(abbreviation)")
    .eq("student_id", user.id);

  if (currentAppsError) {
    return NextResponse.json({ error: currentAppsError.message }, { status: 500 });
  }

  const existingForTargetUniversity = (currentApps ?? []).filter(
    (app: any) => String(app.university_id) === String(universityId)
  ).length;

  const existingForKznCao = (currentApps ?? []).filter((app: any) => {
    const abbr = normalizeUniversityAbbr((app as any)?.universities?.abbreviation);
    return isKznCaoUniversity(abbr);
  }).length;

  if (isKznTarget && existingForKznCao + toInsert.length > KZN_CAO_MAX_CHOICES) {
    const remaining = Math.max(0, KZN_CAO_MAX_CHOICES - existingForKznCao);
    return NextResponse.json(
      {
        error: `CAO allows a maximum of ${KZN_CAO_MAX_CHOICES} choices. You can add ${remaining} more.`,
      },
      { status: 400 }
    );
  }

  if (!isKznTarget && targetLimit !== null && existingForTargetUniversity + toInsert.length > targetLimit) {
    const remaining = Math.max(0, targetLimit - existingForTargetUniversity);
    return NextResponse.json(
      {
        error: `${targetUni.name} allows a maximum of ${targetLimit} choices. You can add ${remaining} more.`,
      },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("applications").insert(toInsert);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ added: toInsert.length });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderedApplicationIds } = await req.json();

  if (!Array.isArray(orderedApplicationIds) || orderedApplicationIds.length < 2) {
    return NextResponse.json({ error: "orderedApplicationIds must contain at least 2 ids" }, { status: 400 });
  }

  const normalizedIds = orderedApplicationIds.map((id: string | number) => String(id));

  const { data: rows, error: rowsError } = await supabase
    .from("applications")
    .select("id, university_id, universities(abbreviation)")
    .eq("student_id", user.id)
    .in("id", normalizedIds);

  if (rowsError) return NextResponse.json({ error: rowsError.message }, { status: 500 });
  if ((rows ?? []).length !== normalizedIds.length) {
    return NextResponse.json({ error: "Some applications were not found." }, { status: 400 });
  }

  const isKznFlags = (rows ?? []).map((row: any) => {
    const abbr = normalizeUniversityAbbr((row as any)?.universities?.abbreviation);
    return isKznCaoUniversity(abbr);
  });

  const allKzn = isKznFlags.every(Boolean);
  const allNonKzn = isKznFlags.every((value) => !value);

  if (!allKzn && !allNonKzn) {
    return NextResponse.json({ error: "Cannot reorder mixed CAO and non-CAO choices together." }, { status: 400 });
  }

  if (allNonKzn) {
    const uniqueUniversityIds = new Set((rows ?? []).map((row: any) => String(row.university_id)));
    if (uniqueUniversityIds.size > 1) {
      return NextResponse.json({ error: "Can only reorder choices within one university card." }, { status: 400 });
    }
  }

  const baseTime = Date.now();
  const updates = normalizedIds.map((id, index) =>
    supabase
      .from("applications")
      .update({ applied_at: new Date(baseTime + index * 1000).toISOString() })
      .eq("id", id)
      .eq("student_id", user.id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: normalizedIds.length });
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { applicationId } = await req.json();
  if (!applicationId) {
    return NextResponse.json({ error: "applicationId required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("id", String(applicationId))
    .eq("student_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: 1 });
}
