import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const MAX_TARGETS = 10;

const AddSchema = z.object({
  facultyId: z.union([z.string(), z.number()]).transform(Number),
  universityId: z.union([z.string(), z.number()]).transform(Number),
});

// GET /api/targets — list the user's saved targets
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("targets")
    .select("id, faculty_id, university_id, created_at, faculties(name, field_of_study, aps_minimum, qualification_type, duration_years), universities(name, abbreviation)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: "Failed to fetch targets" }, { status: 500 });

  return Response.json({ targets: data ?? [] });
}

// POST /api/targets — save a programme as a target
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = AddSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });

  const { facultyId, universityId } = parsed.data;

  // Check current target count
  const { count } = await supabase
    .from("targets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) >= MAX_TARGETS) {
    return Response.json({ error: `You can save up to ${MAX_TARGETS} target programmes.` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("targets")
    .insert({ user_id: user.id, faculty_id: facultyId, university_id: universityId })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "Already saved as a target." }, { status: 409 });
    }
    return Response.json({ error: "Failed to save target" }, { status: 500 });
  }

  return Response.json({ id: data.id }, { status: 201 });
}
