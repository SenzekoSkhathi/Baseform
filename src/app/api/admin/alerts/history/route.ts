import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminClient();
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 25), 1), 100);
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
