import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";

function escapeCsv(value: string | number | null | undefined): string {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\n") || text.includes("\"")) {
    return `"${text.replace(/\"/g, '""')}"`;
  }
  return text;
}

export async function GET(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) {
    return new Response(JSON.stringify({ error: guard.error }), {
      status: guard.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  const admin = createAdminClient();
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 100), 1), 1000);
  const alertKey = url.searchParams.get("alert_key")?.trim() || "";
  const severity = url.searchParams.get("severity")?.trim() || "";
  const from = url.searchParams.get("from")?.trim() || "";
  const to = url.searchParams.get("to")?.trim() || "";

  let query = admin
    .from("admin_alert_history")
    .select("alert_key,occurred_on,severity,title,message,current_value,threshold_value,unit,range_label,detected_at")
    .order("detected_at", { ascending: false })
    .limit(limit);

  if (alertKey) query = query.eq("alert_key", alertKey);
  if (severity === "warning" || severity === "critical") query = query.eq("severity", severity);
  if (from) query = query.gte("occurred_on", from);
  if (to) query = query.lte("occurred_on", to);

  const { data, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const header = ["detected_at", "range_label", "alert_key", "occurred_on", "severity", "title", "message", "current_value", "threshold_value", "unit"];
  const rows = (data ?? []).map((row) => [
    row.detected_at,
    row.range_label,
    row.alert_key,
    row.occurred_on,
    row.severity,
    row.title,
    row.message,
    row.current_value,
    row.threshold_value,
    row.unit,
  ]);

  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
  const filename = `admin-alert-history-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
