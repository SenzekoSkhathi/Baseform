import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { csvRowsToRecords, recordAdminContentAudit } from "@/lib/admin/contentAdmin";
import { NextResponse } from "next/server";

function parseJsonValue(value: string): unknown {
  if (!value.trim()) return {};
  return JSON.parse(value);
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
    const key = String(record.key ?? "").trim();
    if (!key) {
      return NextResponse.json({ error: "Each setting row needs a key" }, { status: 400 });
    }

    let value: unknown;
    try {
      value = parseJsonValue(String(record.value ?? ""));
    } catch {
      return NextResponse.json({ error: `Invalid JSON value for setting ${key}` }, { status: 400 });
    }

    const payload = {
      key,
      value,
      description: String(record.description ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data: before } = await admin
      .from("admin_site_settings")
      .select("key,value,description,updated_at")
      .eq("key", key)
      .maybeSingle();

    const { error } = await admin.from("admin_site_settings").upsert(payload, { onConflict: "key" });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (before) {
      results.updated += 1;
    } else {
      results.created += 1;
    }

    void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
      entityType: "site_setting",
      entityKey: key,
      action: "import",
      beforeData: before ?? null,
      afterData: payload,
    });
  }

  return NextResponse.json({ success: true, ...results });
}
