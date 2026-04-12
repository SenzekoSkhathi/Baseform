import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { getAdminUsageMetrics } from "@/lib/admin/usageMetrics";

function escapeCsv(value: string | number): string {
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

  const metrics = await getAdminUsageMetrics(admin, url.searchParams);

  const header = [
    "date",
    "signups",
    "applications",
    "ai_tokens",
    "ai_calls",
    "estimated_ai_cost_zar",
    "emails_sent",
    "emails_received",
    "email_scan_failures",
    "files_uploaded",
    "storage_uploaded_bytes",
  ];

  const rows = metrics.daily.map((day) => {
    const estimatedCost = ((day.tokens / 1000) * metrics.alertThresholds.aiCostPer1kTokensZar).toFixed(4);
    return [
      day.day,
      day.signups,
      day.applications,
      day.tokens,
      day.aiCalls,
      estimatedCost,
      day.emailsSent,
      day.emailsReceived,
      day.emailScanFailures,
      day.filesUploaded,
      day.storageUploadedBytes,
    ];
  });

  const alertSection = [
    [],
    ["alert_key", "severity", "title", "message", "current_value", "threshold_value", "unit"],
    ...metrics.alerts.map((alert) => [
      alert.key,
      alert.severity,
      alert.title,
      alert.message,
      alert.currentValue,
      alert.thresholdValue,
      alert.unit,
    ]),
  ];

  const summarySection = [
    [],
    ["summary_key", "value"],
    ["range_label", metrics.range.label],
    ["range_from", metrics.range.from],
    ["range_to", metrics.range.to],
    ["total_ai_tokens", metrics.usage.ai.totalTokens],
    ["total_ai_estimated_cost_zar", metrics.usage.ai.estimatedCostZar],
    ["total_emails_sent", metrics.usage.email.sentTotal],
    ["total_emails_received", metrics.usage.email.receivedTotal],
    ["failed_scan_rate_percent", metrics.usage.email.failedScanRatePercent],
    ["storage_uploaded_bytes_in_range", metrics.usage.storage.uploadedBytesInRange],
  ];

  const csvLines = [header, ...rows, ...alertSection, ...summarySection]
    .map((row) => row.map((cell) => escapeCsv(cell as string | number)).join(","))
    .join("\n");

  const filename = `admin-usage-${metrics.range.from}-to-${metrics.range.to}.csv`;

  return new Response(csvLines, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
      "Cache-Control": "no-store",
    },
  });
}
