import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateAPS, apsRating } from "@/lib/aps/calculator";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, full_name, school_name, grade_year")
    .eq("share_token", token)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const { data: subjects } = await admin
    .from("student_subjects")
    .select("subject_name, mark")
    .eq("profile_id", profile.id);

  const aps = subjects?.length
    ? calculateAPS(subjects.map((s) => ({ name: s.subject_name, mark: s.mark })))
    : 0;

  const firstName = (profile.full_name ?? "").trim().split(" ")[0] || "A student";

  return NextResponse.json({
    firstName,
    aps,
    rating: apsRating(aps),
    school: profile.school_name ?? null,
    gradeYear: profile.grade_year ?? null,
  });
}
