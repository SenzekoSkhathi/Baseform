import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: applicationId } = await context.params;
  const body = (await req.json()) as { note?: string };
  const note = body.note?.trim();
  if (!note) return NextResponse.json({ error: "Note is required." }, { status: 400 });

  // Verify the application belongs to this user
  const { data: app } = await supabase
    .from("applications")
    .select("id")
    .eq("id", applicationId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!app) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { data, error } = await supabase
    .from("applications_activity")
    .insert({ application_id: applicationId, user_id: user.id, note })
    .select("id, note, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, entry: data });
}
