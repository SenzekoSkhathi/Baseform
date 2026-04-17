import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_STATUSES = ["planning", "in_progress", "submitted", "accepted", "rejected", "waitlisted"] as const;
type Status = (typeof VALID_STATUSES)[number];

function isValidStatus(v: string): v is Status {
  return (VALID_STATUSES as readonly string[]).includes(v);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = (await req.json().catch(() => null)) as {
    status?: string;
    notes?: string;
    checklist?: string[];
  } | null;

  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  // Build update payload — only include fields that were sent
  const update: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!isValidStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    update.status = body.status;
  }

  if (body.notes !== undefined) {
    update.notes = body.notes;
  }

  if (body.checklist !== undefined) {
    if (!Array.isArray(body.checklist)) {
      return NextResponse.json({ error: "checklist must be an array." }, { status: 400 });
    }
    update.checklist = body.checklist;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("applications")
    .update(update)
    .eq("id", id)
    .eq("student_id", user.id) // RLS: user can only update their own
    .select("id, status, notes, checklist")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });

  return NextResponse.json({ ok: true, application: data });
}
