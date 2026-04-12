import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { getAdminUsageMetrics } from "@/lib/admin/usageMetrics";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminClient();
  const url = new URL(req.url);

  const metrics = await getAdminUsageMetrics(admin, url.searchParams);

  if (metrics.alerts.length > 0) {
    void admin.from("admin_alert_history").upsert(
      metrics.alerts.map((alert) => ({
        alert_key: alert.key,
        occurred_on: alert.occurredOn,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        current_value: alert.currentValue,
        threshold_value: alert.thresholdValue,
        unit: alert.unit,
        range_label: metrics.range.label,
        detected_at: new Date().toISOString(),
      })),
      { onConflict: "alert_key,occurred_on" }
    );
  }

  return NextResponse.json(metrics);
}
