import Link from "next/link";
import { ChartCard, formatBytes, KeyValueList, MiniStat, StatCard, TopUsersList } from "./AdminPrimitives";
import type { AlertHistoryEntry, AlertThresholdDraft, DateRangePreset, MetricsResponse } from "../types";

type MetricsOverviewSectionProps = {
  metrics: MetricsResponse | null;
  rangePreset: DateRangePreset;
  onRangePresetChange: (value: DateRangePreset) => void;
  customFrom: string;
  onCustomFromChange: (value: string) => void;
  customTo: string;
  onCustomToChange: (value: string) => void;
  onApplyCustomRange: () => void;
  onExportUsageCsv: () => void;
  thresholdDraft: AlertThresholdDraft;
  onThresholdDraftChange: (next: AlertThresholdDraft) => void;
  onSaveAlertThresholds: () => void;
  savingKey: string | null;
  alertHistory: AlertHistoryEntry[];
  onExportAlertHistoryCsv: () => void;
  alertHistorySeverity: string;
  onAlertHistorySeverityChange: (value: string) => void;
  alertHistoryKey: string;
  onAlertHistoryKeyChange: (value: string) => void;
  alertHistoryFrom: string;
  onAlertHistoryFromChange: (value: string) => void;
  alertHistoryTo: string;
  onAlertHistoryToChange: (value: string) => void;
};

function getMax(values: number[]): number {
  return Math.max(1, ...values);
}

export function MetricsOverviewSection(props: MetricsOverviewSectionProps) {
  const daily = props.metrics?.daily ?? [];
  const maxTokenDay = getMax(daily.map((d) => d.tokens));
  const maxSignupDay = getMax(daily.map((d) => d.signups));
  const maxApplicationDay = getMax(daily.map((d) => d.applications));
  const maxEmailsSentDay = getMax(daily.map((d) => d.emailsSent));
  const maxEmailsReceivedDay = getMax(daily.map((d) => d.emailsReceived));
  const maxFilesUploadedDay = getMax(daily.map((d) => d.filesUploaded));

  return (
    <div className="rounded-3xl border border-orange-100 bg-white/95 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Platform operations: users, content, and AI usage.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={props.onExportUsageCsv} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">Export CSV</button>
          <Link href="/dashboard" className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Back to app</Link>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
        <div className="grid gap-2 md:grid-cols-[140px_1fr_1fr_100px]">
          <select value={props.rangePreset} onChange={(e) => props.onRangePresetChange(e.target.value as DateRangePreset)} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-900">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="custom">Custom</option>
          </select>
          <input type="date" value={props.customFrom} onChange={(e) => props.onCustomFromChange(e.target.value)} disabled={props.rangePreset !== "custom"} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-900 disabled:bg-gray-100 disabled:text-gray-400" />
          <input type="date" value={props.customTo} onChange={(e) => props.onCustomToChange(e.target.value)} disabled={props.rangePreset !== "custom"} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs text-gray-900 disabled:bg-gray-100 disabled:text-gray-400" />
          <button type="button" onClick={props.onApplyCustomRange} disabled={props.rangePreset !== "custom"} className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Apply</button>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">Showing metrics for: {props.metrics?.range.label ?? "Loading range..."}</p>
      </div>

      <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">Operational alerts</p>
          <p className="text-xs text-gray-500">Threshold-based spikes and failures</p>
        </div>
        {props.metrics?.alerts.length ? (
          <div className="mt-3 space-y-2">
            {props.metrics.alerts.map((alert) => (
              <div key={alert.key} className={`rounded-xl border px-3 py-2 text-xs ${alert.severity === "critical" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                <p className="font-bold">{alert.title}</p>
                <p className="mt-1">{alert.message}</p>
                <p className="mt-1 text-[11px] opacity-80">Current: {alert.currentValue} {alert.unit} · Threshold: {alert.thresholdValue} {alert.unit}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">No alert thresholds breached in this range.</p>
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gray-900">Alert thresholds</p>
            <p className="text-xs text-gray-500">Tune the values used by spike detection and failure alerts.</p>
          </div>
          <button type="button" onClick={props.onSaveAlertThresholds} disabled={props.savingKey === "alert-thresholds"} className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Save thresholds</button>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1 text-xs text-gray-600">
            <span className="block font-semibold text-gray-700">AI token cost spike (ZAR/day)</span>
            <input type="number" min="0" step="0.01" value={props.thresholdDraft.tokenCostSpikeZarPerDay} onChange={(e) => props.onThresholdDraftChange({ ...props.thresholdDraft, tokenCostSpikeZarPerDay: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
          </label>
          <label className="space-y-1 text-xs text-gray-600">
            <span className="block font-semibold text-gray-700">Storage growth spike (MB/day)</span>
            <input type="number" min="0" step="1" value={props.thresholdDraft.storageGrowthBytesPerDayMb} onChange={(e) => props.onThresholdDraftChange({ ...props.thresholdDraft, storageGrowthBytesPerDayMb: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
          </label>
          <label className="space-y-1 text-xs text-gray-600">
            <span className="block font-semibold text-gray-700">Failed scan rate (%)</span>
            <input type="number" min="0" step="0.1" value={props.thresholdDraft.failedEmailScanRatePercent} onChange={(e) => props.onThresholdDraftChange({ ...props.thresholdDraft, failedEmailScanRatePercent: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
          </label>
          <label className="space-y-1 text-xs text-gray-600">
            <span className="block font-semibold text-gray-700">Failed scan minimum volume</span>
            <input type="number" min="0" step="1" value={props.thresholdDraft.failedEmailScanMinVolume} onChange={(e) => props.onThresholdDraftChange({ ...props.thresholdDraft, failedEmailScanMinVolume: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
          </label>
          <label className="space-y-1 text-xs text-gray-600">
            <span className="block font-semibold text-gray-700">AI cost per 1k tokens (ZAR)</span>
            <input type="number" min="0" step="0.01" value={props.thresholdDraft.aiCostPer1kTokensZar} onChange={(e) => props.onThresholdDraftChange({ ...props.thresholdDraft, aiCostPer1kTokensZar: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
          </label>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gray-900">Alert history</p>
            <p className="text-xs text-gray-500">Last recorded threshold breaches for auditing and trend review.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <p>{props.alertHistory.length} recent items</p>
            <button type="button" onClick={props.onExportAlertHistoryCsv} className="rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-700 hover:bg-gray-50">Export CSV</button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-xs text-gray-600">
            <span className="block font-semibold text-gray-700">Severity</span>
            <select value={props.alertHistorySeverity} onChange={(e) => props.onAlertHistorySeverityChange(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900">
              <option value="all">All severities</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <label className="space-y-1 text-xs text-gray-600">
            <span className="block font-semibold text-gray-700">Alert type</span>
            <select value={props.alertHistoryKey} onChange={(e) => props.onAlertHistoryKeyChange(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900">
              <option value="all">All alerts</option>
              {Array.from(new Set(props.alertHistory.map((entry) => entry.alert_key))).map((key) => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs text-gray-600">
            <span className="block font-semibold text-gray-700">From</span>
            <input type="date" value={props.alertHistoryFrom} onChange={(e) => props.onAlertHistoryFromChange(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
          </label>
          <label className="space-y-1 text-xs text-gray-600">
            <span className="block font-semibold text-gray-700">To</span>
            <input type="date" value={props.alertHistoryTo} onChange={(e) => props.onAlertHistoryToChange(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-gray-900" />
          </label>
        </div>

        {props.alertHistory.length > 0 ? (
          <div className="mt-3 space-y-2">
            {props.alertHistory.map((entry) => (
              <div key={`${entry.alert_key}-${entry.occurred_on}`} className={`rounded-xl border px-3 py-2 text-xs ${entry.severity === "critical" ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold">{entry.title}</p>
                  <p className="text-[11px] opacity-80">{entry.occurred_on} · {entry.range_label}</p>
                </div>
                <p className="mt-1">{entry.message}</p>
                <p className="mt-1 text-[11px] opacity-80">Current: {entry.current_value} {entry.unit} · Threshold: {entry.threshold_value} {entry.unit}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">No historical alert records yet.</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Total users" value={String(props.metrics?.totals.users ?? 0)} />
        <StatCard label="Applications" value={String(props.metrics?.totals.applications ?? 0)} />
        <StatCard label="BaseBot tokens" value={(props.metrics?.totals.tokens ?? 0).toLocaleString("en-ZA")} />
        <StatCard label="AI calls" value={String(props.metrics?.totals.aiCalls ?? 0)} />
        <StatCard label="Emails sent" value={String(props.metrics?.totals.emailsSent ?? 0)} />
        <StatCard label="Emails received" value={String(props.metrics?.totals.emailsReceived ?? 0)} />
        <StatCard label="Storage used" value={formatBytes(props.metrics?.totals.storageBytes ?? 0)} />
        <StatCard label="Waitlist" value={String(props.metrics?.totals.waitlist ?? 0)} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bursary tracks" value={String(props.metrics?.totals.bursaryTracking ?? 0)} />
        <StatCard label="Connected inboxes" value={`${props.metrics?.totals.activeEmailConnections ?? 0}`} />
        <StatCard label="Vault files" value={String(props.metrics?.totals.storageFiles ?? 0)} />
        <StatCard label="BaseBot threads" value={String(props.metrics?.totals.basebotThreads ?? 0)} />
      </div>

      {props.metrics?.funnel && (
        <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-gray-900">Conversion funnel</p>
          <div className="flex items-end gap-2">
            {[
              { label: "Signups", value: props.metrics.funnel.signups, color: "bg-orange-500" },
              { label: "Created app", value: props.metrics.funnel.createdApplications, color: "bg-blue-500" },
              { label: "Submitted", value: props.metrics.funnel.submittedApplications, color: "bg-emerald-500" },
            ].map((step, i, arr) => {
              const pct = arr[0].value > 0 ? Math.round((step.value / arr[0].value) * 100) : 0;
              return (
                <div key={step.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-gray-700">{step.value}</span>
                  <div className="w-full rounded-lg bg-gray-100" style={{ height: 48 }}>
                    <div className={`w-full rounded-lg ${step.color}`} style={{ height: `${Math.max(4, pct)}%`, minHeight: 4 }} />
                  </div>
                  <span className="text-center text-[10px] text-gray-500">{step.label}</span>
                  <span className="text-[10px] font-bold text-gray-400">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {props.metrics?.statusBreakdown && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="mb-3 text-sm font-bold text-gray-900">Application statuses</p>
            <div className="space-y-2">
              {Object.entries(props.metrics.statusBreakdown).map(([status, count]) => {
                const total = Object.values(props.metrics?.statusBreakdown ?? {}).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const colors: Record<string, string> = {
                  planning: "bg-gray-400", in_progress: "bg-blue-500",
                  submitted: "bg-purple-500", accepted: "bg-emerald-500",
                  rejected: "bg-red-500", waitlisted: "bg-amber-500",
                };
                return (
                  <div key={status} className="grid grid-cols-[100px_1fr_40px] items-center gap-2">
                    <p className="text-xs capitalize text-gray-500">{status.replace("_", " ")}</p>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className={`h-2 rounded-full ${colors[status] ?? "bg-gray-400"}`} style={{ width: `${Math.max(2, pct)}%` }} />
                    </div>
                    <p className="text-right text-xs font-semibold text-gray-700">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {props.metrics?.provinceDistribution && props.metrics.provinceDistribution.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="mb-3 text-sm font-bold text-gray-900">Users by province</p>
            <div className="space-y-2">
              {props.metrics.provinceDistribution.slice(0, 9).map(({ province, count }) => {
                const max = props.metrics?.provinceDistribution[0]?.count ?? 1;
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={province} className="grid grid-cols-[120px_1fr_40px] items-center gap-2">
                    <p className="truncate text-xs text-gray-500">{province}</p>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div className="h-2 rounded-full bg-orange-400" style={{ width: `${Math.max(2, pct)}%` }} />
                    </div>
                    <p className="text-right text-xs font-semibold text-gray-700">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-gray-100 bg-white p-4">
        <p className="text-sm font-bold text-gray-900">BaseBot token usage by day</p>
        <div className="mt-3 max-h-90 space-y-2 overflow-y-auto pr-1">
          {daily.map((point) => (
            <div key={point.day} className="grid grid-cols-[90px_1fr_70px] items-center gap-2">
              <p className="text-xs text-gray-500">{point.day.slice(5)}</p>
              <div className="h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-orange-500" style={{ width: `${Math.max(2, Math.round((point.tokens / maxTokenDay) * 100))}%` }} /></div>
              <p className="text-right text-xs font-semibold text-gray-700">{point.tokens}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ChartCard title="Signups per day" color="bg-blue-500" max={maxSignupDay} points={daily.map((p) => ({ key: `signup-${p.day}`, label: p.day.slice(5), value: p.signups }))} />
        <ChartCard title="Applications created per day" color="bg-emerald-500" max={maxApplicationDay} points={daily.map((p) => ({ key: `apps-${p.day}`, label: p.day.slice(5), value: p.applications }))} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Emails sent per day" color="bg-sky-500" max={maxEmailsSentDay} points={daily.map((p) => ({ key: `sent-${p.day}`, label: p.day.slice(5), value: p.emailsSent }))} />
        <ChartCard title="Emails received per day" color="bg-cyan-500" max={maxEmailsReceivedDay} points={daily.map((p) => ({ key: `received-${p.day}`, label: p.day.slice(5), value: p.emailsReceived }))} />
        <ChartCard title="Files uploaded per day" color="bg-amber-500" max={maxFilesUploadedDay} points={daily.map((p) => ({ key: `files-${p.day}`, label: p.day.slice(5), value: p.filesUploaded }))} />
      </div>

      {props.metrics?.usage && (
        <div className="mt-3 grid gap-3 xl:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="text-sm font-bold text-gray-900">AI usage</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <MiniStat label="Input tokens" value={props.metrics.usage.ai.totalInputTokens.toLocaleString("en-ZA")} />
              <MiniStat label="Output tokens" value={props.metrics.usage.ai.totalOutputTokens.toLocaleString("en-ZA")} />
              <MiniStat label="Last 7 days" value={props.metrics.usage.ai.last7dTokens.toLocaleString("en-ZA")} />
              <MiniStat label="Last 30 days" value={props.metrics.usage.ai.last30dTokens.toLocaleString("en-ZA")} />
              <MiniStat label="Est. AI cost" value={`R${props.metrics.usage.ai.estimatedCostZar.toFixed(2)}`} />
            </div>
            <TopUsersList title="Top token users" entries={props.metrics.usage.ai.topUsersByTokens} suffix="tokens" />
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="text-sm font-bold text-gray-900">Email operations</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <MiniStat label="Connected" value={String(props.metrics.usage.email.connectedMailboxes)} />
              <MiniStat label="Active" value={String(props.metrics.usage.email.activeConnectedMailboxes)} />
              <MiniStat label="Status changes" value={String(props.metrics.usage.email.statusChangesDetected)} />
              <MiniStat label="Sent total" value={String(props.metrics.usage.email.sentTotal)} />
              <MiniStat label="Received total" value={String(props.metrics.usage.email.receivedTotal)} />
              <MiniStat label="Failed scans" value={String(props.metrics.usage.email.failedScansTotal)} />
              <MiniStat label="Failed scan rate" value={`${props.metrics.usage.email.failedScanRatePercent.toFixed(2)}%`} />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <KeyValueList title="Sent by type" values={props.metrics.usage.email.sentByType} />
              <KeyValueList title="Scan actions" values={props.metrics.usage.email.actionsBreakdown} />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <TopUsersList title="Top by emails received" entries={props.metrics.usage.email.topUsersByReceivedEmails} suffix="emails" />
              <TopUsersList title="Top by emails sent" entries={props.metrics.usage.email.topUsersBySentEmails} suffix="emails" />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="text-sm font-bold text-gray-900">Storage usage</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <MiniStat label="Total size" value={formatBytes(props.metrics.usage.storage.totalBytes)} />
              <MiniStat label="Files" value={String(props.metrics.usage.storage.totalFiles)} />
              <MiniStat label="Users with files" value={String(props.metrics.usage.storage.usersWithFiles)} />
              <MiniStat label="Avg per user" value={formatBytes(props.metrics.usage.storage.averageBytesPerUser)} />
              <MiniStat label="Uploaded in range" value={formatBytes(props.metrics.usage.storage.uploadedBytesInRange)} />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <TopUsersList title="Top by storage" entries={props.metrics.usage.storage.topUsersByStorageBytes} suffix="bytes" formatter={formatBytes} />
              <TopUsersList title="Top by files" entries={props.metrics.usage.storage.topUsersByFileCount} suffix="files" />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <p className="text-sm font-bold text-gray-900">Engagement</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <MiniStat label="BaseBot threads" value={String(props.metrics.usage.engagement.basebotThreads)} />
              <MiniStat label="BaseBot messages" value={String(props.metrics.usage.engagement.basebotMessages)} />
            </div>
            <TopUsersList title="Top users by threads" entries={props.metrics.usage.engagement.topUsersByThreads} suffix="threads" />
          </div>
        </div>
      )}
    </div>
  );
}
