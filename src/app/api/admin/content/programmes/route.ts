import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { recordAdminContentAudit } from "@/lib/admin/contentAdmin";
import { NextResponse } from "next/server";

const SELECT_COLUMNS = "id,name,university_id,aps_minimum,field_of_study,qualification_type,duration_years,additional_requirements";

export async function GET() {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminClient();
  const { data, error } = await admin.from("faculties").select(SELECT_COLUMNS).order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const name = String(body?.name ?? "").trim();
  const universityId = String(body?.university_id ?? "").trim();
  const apsMinimum = Number(body?.aps_minimum ?? 0);

  if (!name) return NextResponse.json({ error: "Programme name is required" }, { status: 400 });
  if (!universityId) return NextResponse.json({ error: "university_id is required" }, { status: 400 });
  if (!Number.isFinite(apsMinimum) || apsMinimum < 0) {
    return NextResponse.json({ error: "aps_minimum must be a non-negative number" }, { status: 400 });
  }

  const row = {
    name,
    university_id: universityId,
    aps_minimum: apsMinimum,
    field_of_study: body?.field_of_study ?? null,
    qualification_type: body?.qualification_type ?? null,
    duration_years: body?.duration_years ?? null,
    additional_requirements: body?.additional_requirements ?? null,
  };

  const admin = createAdminClient();
  const { error } = await admin.from("faculties").insert(row);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "programme",
    entityKey: name,
    action: "create",
    beforeData: null,
    afterData: row,
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const { id, ...changes } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  if ("name" in changes) {
    const name = String(changes.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Programme name is required" }, { status: 400 });
    changes.name = name;
  }

  if ("aps_minimum" in changes) {
    const apsMinimum = Number(changes.aps_minimum);
    if (!Number.isFinite(apsMinimum) || apsMinimum < 0) {
      return NextResponse.json({ error: "aps_minimum must be a non-negative number" }, { status: 400 });
    }
    changes.aps_minimum = apsMinimum;
  }

  const admin = createAdminClient();
  const { data: before, error: existingError } = await admin
    .from("faculties")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const { error } = await admin.from("faculties").update(changes).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "programme",
    entityKey: String(before?.name ?? id),
    action: "update",
    beforeData: before ?? null,
    afterData: { ...(before ?? {}), ...changes },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("faculties")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const { error } = await admin.from("faculties").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "programme",
    entityKey: String(existing?.name ?? id),
    action: "delete",
    beforeData: existing ?? null,
    afterData: null,
  });

  return NextResponse.json({ success: true });
}
