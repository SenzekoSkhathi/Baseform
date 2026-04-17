import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { recordAdminContentAudit } from "@/lib/admin/contentAdmin";
import { NextResponse } from "next/server";

const SELECT_COLUMNS = "id,name,abbreviation,province,city,application_fee,closing_date,website_url,application_url,is_active";

export async function GET() {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminClient();
  const { data, error } = await admin.from("universities").select(SELECT_COLUMNS).order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "University name is required" }, { status: 400 });

  const applicationFee = body?.application_fee;
  if (applicationFee !== null && applicationFee !== undefined && Number(applicationFee) < 0) {
    return NextResponse.json({ error: "Application fee cannot be negative" }, { status: 400 });
  }

  const row = {
    name,
    abbreviation: body?.abbreviation ? String(body.abbreviation).toUpperCase().slice(0, 16) : null,
    province: body?.province ?? null,
    city: body?.city ?? null,
    application_fee: applicationFee ?? null,
    closing_date: body?.closing_date ?? null,
    website_url: body?.website_url ?? null,
    application_url: body?.application_url ?? null,
    is_active: body?.is_active ?? true,
  };

  const admin = createAdminClient();
  const { error } = await admin.from("universities").insert(row);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "university",
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
    if (!name) return NextResponse.json({ error: "University name is required" }, { status: 400 });
    changes.name = name;
  }

  if ("application_fee" in changes && changes.application_fee !== null && Number(changes.application_fee) < 0) {
    return NextResponse.json({ error: "Application fee cannot be negative" }, { status: 400 });
  }

  if ("abbreviation" in changes) {
    changes.abbreviation = changes.abbreviation ? String(changes.abbreviation).toUpperCase().slice(0, 16) : null;
  }

  const admin = createAdminClient();
  const { data: before, error: existingError } = await admin
    .from("universities")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const { error } = await admin.from("universities").update(changes).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "university",
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
    .from("universities")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const { error } = await admin.from("universities").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "university",
    entityKey: String(existing?.name ?? id),
    action: "delete",
    beforeData: existing ?? null,
    afterData: null,
  });

  return NextResponse.json({ success: true });
}
