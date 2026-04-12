import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { parseCsvRowsWithLineNumbers, recordAdminContentAudit } from "@/lib/admin/contentAdmin";
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

function isBooleanToken(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "" || ["true", "false", "1", "0", "yes", "no", "on", "off"].includes(normalized);
}

function normalizeSlug(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
  const requiredHeaders = ["slug", "name", "price"];
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
    slug: string;
    payload: Record<string, unknown>;
  }> = [];
  const seenSlugs = new Map<string, number>();

  for (const row of dataRows) {
    const getValue = (column: string) => {
      const index = headerIndex.get(column);
      return index === undefined ? "" : String(row.cells[index] ?? "").trim();
    };

    const slug = normalizeSlug(getValue("slug"));
    const name = getValue("name");
    const price = getValue("price");
    const sortOrderRaw = getValue("sort_order");
    const availableRaw = getValue("available");
    const recommendedRaw = getValue("recommended");
    const rowErrors: Array<{ line: number; reason: string }> = [];

    if (!slug) rowErrors.push({ line: row.lineNumber, reason: "slug is required" });
    if (!name) rowErrors.push({ line: row.lineNumber, reason: "name is required" });
    if (!price) rowErrors.push({ line: row.lineNumber, reason: "price is required" });
    if (sortOrderRaw && Number.isNaN(Number(sortOrderRaw))) {
      rowErrors.push({ line: row.lineNumber, reason: "sort_order must be a number" });
    }
    if (!isBooleanToken(availableRaw)) {
      rowErrors.push({ line: row.lineNumber, reason: "available must be a boolean value" });
    }
    if (!isBooleanToken(recommendedRaw)) {
      rowErrors.push({ line: row.lineNumber, reason: "recommended must be a boolean value" });
    }

    const previousLine = seenSlugs.get(slug);
    if (slug && previousLine !== undefined) {
      rowErrors.push({ line: row.lineNumber, reason: `Duplicate slug in CSV: ${slug} (first seen on line ${previousLine})` });
    }
    if (slug && previousLine === undefined) {
      seenSlugs.set(slug, row.lineNumber);
    }

    if (rowErrors.length > 0) {
      validationErrors.push(...rowErrors);
      continue;
    }

    imports.push({
      line: row.lineNumber,
      slug,
      payload: {
        slug,
        name,
        price,
        period: getValue("period") || "/month",
        tagline: getValue("tagline"),
        features: normalizeFeatures(getValue("features")),
        available: availableRaw ? toBoolean(availableRaw) : true,
        recommended: recommendedRaw ? toBoolean(recommendedRaw) : false,
        sort_order: sortOrderRaw ? Number(sortOrderRaw) : 0,
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
  const slugs = imports.map((entry) => entry.slug);
  const { data: existingRows, error: fetchError } = await admin
    .from("admin_pricing_plans")
    .select("id,slug,name,price,period,tagline,features,available,recommended,sort_order,updated_at")
    .in("slug", slugs);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  const existingBySlug = new Map((existingRows ?? []).map((row) => [row.slug, row]));

  if (dryRun) {
    let created = 0;
    let updated = 0;
    for (const entry of imports) {
      if (existingBySlug.has(entry.slug)) {
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
      rows: imports.map((entry) => ({ line: entry.line, slug: entry.slug, action: existingBySlug.has(entry.slug) ? "update" : "create" })),
    });
  }
  const payloads = imports.map((entry) => entry.payload);
  const { error: writeError } = await admin.from("admin_pricing_plans").upsert(payloads, { onConflict: "slug" });
  if (writeError) return NextResponse.json({ error: writeError.message }, { status: 500 });

  let created = 0;
  let updated = 0;
  for (const entry of imports) {
    const before = existingBySlug.get(entry.slug) ?? null;
    if (before) {
      updated += 1;
    } else {
      created += 1;
    }

    void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
      entityType: "plan",
      entityKey: entry.slug,
      action: "import",
      beforeData: before,
      afterData: entry.payload,
    });
  }

  return NextResponse.json({ success: true, dryRun: false, created, updated });
}
