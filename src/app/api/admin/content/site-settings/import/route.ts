import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { parseCsvRowsWithLineNumbers, recordAdminContentAudit } from "@/lib/admin/contentAdmin";
import { NextResponse } from "next/server";

function parseJsonValue(value: string): unknown {
  if (!value.trim()) return {};
  return JSON.parse(value);
}

function parseDryRun(formData: FormData, url: URL): boolean {
  const value = String(formData.get("dryRun") ?? url.searchParams.get("dryRun") ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
}

export async function POST(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const url = new URL(req.url);
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
  }

  const dryRun = parseDryRun(formData, url);

  const text = await file.text();
  const rows = parseCsvRowsWithLineNumbers(text);
  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.cells.map((cell) => String(cell ?? "").trim());
  const headerIndex = new Map(headers.map((header, index) => [header, index]));
  const requiredHeaders = ["key", "value"];
  const missingHeaders = requiredHeaders.filter((header) => !headerIndex.has(header));
  if (missingHeaders.length > 0) {
    return NextResponse.json({
      error: "CSV validation failed",
      errors: missingHeaders.map((header) => ({ line: headerRow.lineNumber, reason: `Missing required column: ${header}` })),
    }, { status: 400 });
  }

  const validationErrors: Array<{ line: number; reason: string }> = [];
  const imports: Array<{
    line: number;
    key: string;
    payload: Record<string, unknown>;
  }> = [];
  const seenKeys = new Map<string, number>();

  for (const row of dataRows) {
    const getValue = (column: string) => {
      const index = headerIndex.get(column);
      return index === undefined ? "" : String(row.cells[index] ?? "").trim();
    };

    const key = getValue("key");
    const valueRaw = getValue("value");
    const description = getValue("description");
    const rowErrors: Array<{ line: number; reason: string }> = [];

    if (!key) rowErrors.push({ line: row.lineNumber, reason: "key is required" });

    const previousLine = seenKeys.get(key);
    if (key && previousLine !== undefined) {
      rowErrors.push({ line: row.lineNumber, reason: `Duplicate key in CSV: ${key} (first seen on line ${previousLine})` });
    }
    if (key && previousLine === undefined) {
      seenKeys.set(key, row.lineNumber);
    }

    let value: unknown;
    try {
      value = parseJsonValue(valueRaw);
    } catch {
      rowErrors.push({ line: row.lineNumber, reason: `Invalid JSON value for setting ${key || "<missing key>"}` });
      continue;
    }

    if (rowErrors.length > 0) {
      validationErrors.push(...rowErrors);
      continue;
    }

    imports.push({
      line: row.lineNumber,
      key,
      payload: {
        key,
        value,
        description: description || null,
        updated_at: new Date().toISOString(),
      },
    });
  }

  if (validationErrors.length > 0) {
    return NextResponse.json({ error: "CSV validation failed", errors: validationErrors }, { status: 400 });
  }

  if (imports.length === 0) {
    return NextResponse.json({ error: "CSV file has no data rows" }, { status: 400 });
  }

  const admin = createAdminClient();
  const keys = imports.map((entry) => entry.key);
  const { data: existingRows, error: fetchError } = await admin
    .from("admin_site_settings")
    .select("key,value,description,updated_at")
    .in("key", keys);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const existingByKey = new Map((existingRows ?? []).map((row) => [row.key, row]));

  if (dryRun) {
    let created = 0;
    let updated = 0;
    for (const entry of imports) {
      if (existingByKey.has(entry.key)) {
        updated += 1;
      } else {
        created += 1;
      }
    }

    return NextResponse.json({
      success: true,
      dryRun: true,
      created,
      updated,
      rows: imports.map((entry) => ({ line: entry.line, key: entry.key, action: existingByKey.has(entry.key) ? "update" : "create" })),
    });
  }
  const payloads = imports.map((entry) => entry.payload);
  const { error: writeError } = await admin.from("admin_site_settings").upsert(payloads, { onConflict: "key" });
  if (writeError) return NextResponse.json({ error: writeError.message }, { status: 500 });

  let created = 0;
  let updated = 0;
  for (const entry of imports) {
    const before = existingByKey.get(entry.key) ?? null;
    if (before) {
      updated += 1;
    } else {
      created += 1;
    }

    void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
      entityType: "site_setting",
      entityKey: entry.key,
      action: "import",
      beforeData: before,
      afterData: entry.payload,
    });
  }

  return NextResponse.json({ success: true, dryRun: false, created, updated });
}
