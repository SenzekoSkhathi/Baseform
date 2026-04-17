import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { recordAdminContentAudit } from "@/lib/admin/contentAdmin";
import { NextResponse } from "next/server";

const SELECT_COLUMNS = "id,title,provider,description,minimum_aps,amount_per_year,closing_date,application_url,detail_page_url,application_links,funding_value,eligibility_requirements,application_instructions,source_category,provinces_eligible,fields_of_study,is_active";

export async function GET() {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminClient();
  const { data, error } = await admin.from("bursaries").select(SELECT_COLUMNS).order("title");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const title = String(body?.title ?? "").trim();
  const minimumAps = Number(body?.minimum_aps ?? 0);

  if (!title) return NextResponse.json({ error: "Bursary title is required" }, { status: 400 });
  if (!Number.isFinite(minimumAps) || minimumAps < 0) {
    return NextResponse.json({ error: "minimum_aps must be a non-negative number" }, { status: 400 });
  }

  const row = {
    title,
    provider: body?.provider ?? null,
    description: body?.description ?? null,
    minimum_aps: minimumAps,
    amount_per_year: body?.amount_per_year ?? null,
    closing_date: body?.closing_date ?? null,
    application_url: body?.application_url ?? null,
    detail_page_url: body?.detail_page_url ?? null,
    application_links: body?.application_links ?? null,
    funding_value: body?.funding_value ?? null,
    eligibility_requirements: body?.eligibility_requirements ?? null,
    application_instructions: body?.application_instructions ?? null,
    source_category: body?.source_category ?? null,
    provinces_eligible: body?.provinces_eligible ?? null,
    fields_of_study: body?.fields_of_study ?? null,
    is_active: body?.is_active ?? true,
  };

  const admin = createAdminClient();
  const { error } = await admin.from("bursaries").insert(row);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "bursary",
    entityKey: title,
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

  if ("title" in changes) {
    const title = String(changes.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "Bursary title is required" }, { status: 400 });
    changes.title = title;
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
    entityKey: String(before?.title ?? id),
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
    .from("bursaries")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const { error } = await admin.from("bursaries").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "bursary",
    entityKey: String(existing?.title ?? id),
    action: "delete",
    beforeData: existing ?? null,
    afterData: null,
  });

  return NextResponse.json({ success: true });
}
