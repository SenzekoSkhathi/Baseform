import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { isProtectedSiteSettingKey, recordAdminContentAudit } from "@/lib/admin/contentAdmin";
import { NextResponse } from "next/server";

const SELECT_COLUMNS = "key,value,description,updated_at";

function validateKey(key: string): boolean {
  return /^[a-z0-9][a-z0-9_-]{1,63}$/.test(key);
}

export async function GET() {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_site_settings")
    .select(SELECT_COLUMNS)
    .order("key", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json();
  const key = String(body?.key ?? "").trim();

  if (!validateKey(key)) {
    return NextResponse.json({ error: "Invalid key format" }, { status: 400 });
  }

  const admin = createAdminClient();
  const payload = {
    key,
    value: body?.value ?? {},
    description: body?.description ? String(body.description) : null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin.from("admin_site_settings").insert(payload);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "site_setting",
    entityKey: key,
    action: "create",
    beforeData: null,
    afterData: payload,
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { key, ...changes } = await req.json();
  const settingKey = String(key ?? "").trim();

  if (!validateKey(settingKey)) {
    return NextResponse.json({ error: "Invalid key format" }, { status: 400 });
  }

  if ("description" in changes && changes.description !== null) {
    changes.description = String(changes.description);
  }

  changes.updated_at = new Date().toISOString();

  const admin = createAdminClient();
  const { data: before, error: existingError } = await admin
    .from("admin_site_settings")
    .select(SELECT_COLUMNS)
    .eq("key", settingKey)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const { error } = await admin
    .from("admin_site_settings")
    .update(changes)
    .eq("key", settingKey);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "site_setting",
    entityKey: settingKey,
    action: "update",
    beforeData: before ?? null,
    afterData: { ...(before ?? {}), ...changes },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { key } = await req.json();
  const settingKey = String(key ?? "").trim();

  if (!validateKey(settingKey)) {
    return NextResponse.json({ error: "Invalid key format" }, { status: 400 });
  }

  if (isProtectedSiteSettingKey(settingKey)) {
    return NextResponse.json({ error: "This setting is protected and cannot be deleted" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("admin_site_settings")
    .select(SELECT_COLUMNS)
    .eq("key", settingKey)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const { error } = await admin.from("admin_site_settings").delete().eq("key", settingKey);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "site_setting",
    entityKey: settingKey,
    action: "delete",
    beforeData: existing ?? null,
    afterData: null,
  });

  return NextResponse.json({ success: true });
}
