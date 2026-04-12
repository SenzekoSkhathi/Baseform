import type { SupabaseClient } from "@supabase/supabase-js";

export const PROTECTED_SITE_SETTING_KEYS = new Set([
  "home_subtitle",
  "home_features",
  "home_stats",
  "admin_alert_thresholds",
]);

export type AdminContentActor = {
  userId: string;
  email?: string | null;
};

export type AdminContentAuditAction = "create" | "update" | "delete" | "import";

export async function recordAdminContentAudit(
  admin: SupabaseClient,
  actor: AdminContentActor,
  entry: {
    entityType: string;
    entityKey: string;
    action: AdminContentAuditAction;
    beforeData: unknown;
    afterData: unknown;
  },
) {
  await admin.from("admin_content_audit_log").insert({
    entity_type: entry.entityType,
    entity_key: entry.entityKey,
    action: entry.action,
    before_data: entry.beforeData ?? null,
    after_data: entry.afterData ?? null,
    admin_user_id: actor.userId,
    admin_email: actor.email ?? null,
    created_at: new Date().toISOString(),
  });
}

export function escapeCsvValue(value: string | number | boolean | null | undefined): string {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\n") || text.includes("\r") || text.includes("\"")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildCsv(rows: Array<Array<string | number | boolean | null | undefined>>): string {
  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        currentCell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (char === "\n") {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0 || text.endsWith(",")) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.trim() !== ""));
}

export function csvRowsToRecords(text: string): Array<Record<string, string>> {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const [header, ...dataRows] = rows;
  return dataRows.map((row) => {
    const record: Record<string, string> = {};
    header.forEach((column, index) => {
      record[String(column ?? "").trim()] = String(row[index] ?? "").trim();
    });
    return record;
  });
}

export function isProtectedSiteSettingKey(key: string): boolean {
  return PROTECTED_SITE_SETTING_KEYS.has(key);
}
