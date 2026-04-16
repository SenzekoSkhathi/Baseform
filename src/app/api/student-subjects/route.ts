import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateSchema = z.object({
  subjects: z.array(
    z.object({
      subject_name: z.string().min(1),
      mark: z.number().min(0).max(100),
    })
  ).min(1),
});

// PATCH /api/student-subjects
// Replaces all subject marks for the authenticated user.
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid request body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { subjects } = parsed.data;

  // Delete existing and re-insert — cleanest approach since subjects are a set
  const { error: deleteError } = await supabase
    .from("student_subjects")
    .delete()
    .eq("profile_id", user.id);

  if (deleteError) {
    return Response.json({ error: "Failed to update subjects" }, { status: 500 });
  }

  const rows = subjects.map((s) => ({
    profile_id: user.id,
    subject_name: s.subject_name,
    mark: s.mark,
  }));

  const { error: insertError } = await supabase.from("student_subjects").insert(rows);

  if (insertError) {
    return Response.json({ error: "Failed to save subjects" }, { status: 500 });
  }

  return Response.json({ updated: rows.length }, { status: 200 });
}
