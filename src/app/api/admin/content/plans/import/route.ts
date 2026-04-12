import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { csvRowsToRecords, recordAdminContentAudit } from "@/lib/admin/contentAdmin";
import { NextResponse } from "next/server";

function normalizeFeatures(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function toBoolean(value: string): boolean {
  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
}

export async function POST(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
  }

  const text = await file.text();
  const records = csvRowsToRecords(text);
  if (records.length === 0) {
    return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
  }

  const admin = createAdminClient();
  const results = { created: 0, updated: 0 };

  for (const record of records) {
    const slug = String(record.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    const name = String(record.name ?? "").trim();
    const price = String(record.price ?? "").trim();

    if (!slug || !name || !price) {
      return NextResponse.json({ error: "Each plan row needs slug, name, and price" }, { status: 400 });
    }

    const payload = {
      slug,
      name,
      price,
      period: String(record.period ?? "/month"),
      tagline: String(record.tagline ?? ""),
      features: normalizeFeatures(record.features),
      available: toBoolean(record.available ?? "true"),
      recommended: toBoolean(record.recommended ?? "false"),
      sort_order: Number(record.sort_order ?? 0),
      updated_at: new Date().toISOString(),
    };

    const { data: before } = await admin
      .from("admin_pricing_plans")
      .select("id,slug,name,price,period,tagline,features,available,recommended,sort_order,updated_at")
      .eq("slug", slug)
      .maybeSingle();

    const { error } = await admin.from("admin_pricing_plans").upsert(payload, { onConflict: "slug" });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (before) {
      results.updated += 1;
      void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
        entityType: "plan",
        entityKey: slug,
        action: "import",
        beforeData: before,
        afterData: payload,
      });
    } else {
      results.created += 1;
      void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
        entityType: "plan",
        entityKey: slug,
        action: "import",
        beforeData: null,
        afterData: payload,
      });
    }
  }

  return NextResponse.json({ success: true, ...results });
}
