import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/bursary-tracker
// Returns all bursary tracking rows for the current user
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("bursary_applications")
    .select("bursary_id, bursary_name, status, updated_at")
    .eq("student_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST /api/bursary-tracker
// Body: { bursaryId: string, bursaryName: string, status: "saved" | "applied" }
// Upserts a row (insert or update if already exists)
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const { bursaryId, bursaryName, status } = body;

  if (!bursaryId || !bursaryName || !["saved", "applied"].includes(status)) {
    return NextResponse.json({ error: "bursaryId, bursaryName, and status (saved|applied) required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("bursary_applications")
    .upsert(
      {
        student_id: user.id,
        bursary_id: bursaryId,
        bursary_name: bursaryName,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,bursary_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/bursary-tracker
// Body: { bursaryId: string }
// Removes the tracking row
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const { bursaryId } = body;
  if (!bursaryId) return NextResponse.json({ error: "bursaryId required" }, { status: 400 });

  const { error } = await supabase
    .from("bursary_applications")
    .delete()
    .eq("student_id", user.id)
    .eq("bursary_id", bursaryId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
