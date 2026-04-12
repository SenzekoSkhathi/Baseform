import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { recordAdminContentAudit } from "@/lib/admin/contentAdmin";
import { NextResponse } from "next/server";

const SELECT_COLUMNS = "id,slug,name,price,period,tagline,features,available,recommended,sort_order,updated_at";

function normalizeFeatures(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  if (typeof input === "string") {
    return input
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeSlug(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_pricing_plans")
    .select(SELECT_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function DELETE(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("admin_pricing_plans")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const { error } = await admin.from("admin_pricing_plans").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "plan",
    entityKey: existing?.slug ?? String(id),
    action: "delete",
    beforeData: existing ?? null,
    afterData: null,
  });

  return NextResponse.json({ success: true });
}

export async function POST(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json();
  const slug = normalizeSlug(body?.slug);
  const name = String(body?.name ?? "").trim();
  const price = String(body?.price ?? "").trim();

  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!price) return NextResponse.json({ error: "price is required" }, { status: 400 });

  const admin = createAdminClient();
  const payload = {
    slug,
    name,
    price,
    period: String(body?.period ?? "/month"),
    tagline: String(body?.tagline ?? ""),
    features: normalizeFeatures(body?.features),
    available: Boolean(body?.available),
    recommended: Boolean(body?.recommended),
    sort_order: Number(body?.sort_order ?? 0),
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("admin_pricing_plans").insert(payload);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "plan",
    entityKey: slug,
    action: "create",
    beforeData: null,
    afterData: payload,
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id, ...changes } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  if ("slug" in changes) {
    const normalized = normalizeSlug(changes.slug);
    if (!normalized) return NextResponse.json({ error: "slug is required" }, { status: 400 });
    changes.slug = normalized;
  }

  if ("name" in changes) {
    const name = String(changes.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
    changes.name = name;
  }

  if ("price" in changes) {
    const price = String(changes.price ?? "").trim();
    if (!price) return NextResponse.json({ error: "price is required" }, { status: 400 });
    changes.price = price;
  }

  if ("features" in changes) {
    changes.features = normalizeFeatures(changes.features);
  }

  if ("sort_order" in changes) {
    changes.sort_order = Number(changes.sort_order ?? 0);
  }

  changes.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data: before, error: existingError } = await admin
    .from("admin_pricing_plans")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const { error } = await admin.from("admin_pricing_plans").update(changes).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "plan",
    entityKey: String(before?.slug ?? id),
    action: "update",
    beforeData: before ?? null,
    afterData: { ...(before ?? {}), ...changes },
  });

  return NextResponse.json({ success: true });
}
