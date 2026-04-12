import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { recordAdminContentAudit } from "@/lib/admin/contentAdmin";
import { NextResponse } from "next/server";

const SELECT_COLUMNS = "id,name,sponsor,minimum_aps,amount_min,amount_max,closing_date,website,provinces_eligible,fields_of_study,is_active";

export async function GET() {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminClient();
  const { data, error } = await admin.from("bursaries").select(SELECT_COLUMNS).order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json();
  const name = String(body?.name ?? "").trim();
  const minimumAps = Number(body?.minimum_aps ?? 0);

  if (!name) return NextResponse.json({ error: "Bursary name is required" }, { status: 400 });
  if (!Number.isFinite(minimumAps) || minimumAps < 0) {
    return NextResponse.json({ error: "minimum_aps must be a non-negative number" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("bursaries").insert({
    ...body,
    name,
    minimum_aps: minimumAps,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "bursary",
    entityKey: name,
    action: "create",
    beforeData: null,
    afterData: {
      ...body,
      name,
      minimum_aps: minimumAps,
    },
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id, ...changes } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  if ("name" in changes) {
    const name = String(changes.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Bursary name is required" }, { status: 400 });
    changes.name = name;
  }

  if ("minimum_aps" in changes) {
    const minimumAps = Number(changes.minimum_aps);
    if (!Number.isFinite(minimumAps) || minimumAps < 0) {
      return NextResponse.json({ error: "minimum_aps must be a non-negative number" }, { status: 400 });
    }
    changes.minimum_aps = minimumAps;
  }

  const admin = createAdminClient();
  const { data: before, error: existingError } = await admin
    .from("bursaries")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const { error } = await admin.from("bursaries").update(changes).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "bursary",
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

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("bursaries")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const { error } = await admin.from("bursaries").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "bursary",
    entityKey: String(existing?.name ?? id),
    action: "delete",
    beforeData: existing ?? null,
    afterData: null,
  });

  return NextResponse.json({ success: true });
}
