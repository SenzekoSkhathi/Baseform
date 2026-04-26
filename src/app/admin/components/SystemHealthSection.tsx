"use client";

import { useEffect, useState } from "react";

type CheckStatus = "pass" | "warn" | "fail";
type Check = { name: string; status: CheckStatus; detail: string };

type PreflightResponse = {
  ok: boolean;
  summary: { pass: number; warn: number; fail: number };
  checks: Check[];
  notifyUrl: string | null;
  sandboxMode: boolean;
};

type PendingRow = {
  id: string;
  user_id: string;
  m_payment_id: string;
  plan_slug: string;
  term_months: number | null;
  amount_zar: number;
  status: "pending" | "resolved" | "stale";
  created_at: string;
  alerted_at: string | null;
  resolved_at: string | null;
  user_label: string;
};

type Props = {
  onToast: (type: "success" | "error", message: string) => void;
};

const statusBadge: Record<CheckStatus, string> = {
  pass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warn: "border-amber-200 bg-amber-50 text-amber-700",
  fail: "border-red-200 bg-red-50 text-red-700",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ageMinutes(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

export function SystemHealthSection({ onToast }: Props) {
  const [preflight, setPreflight] = useState<PreflightResponse | null>(null);
  const [pending, setPending] = useState<PendingRow[] | null>(null);
  const [running, setRunning] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);

  async function runPreflight() {
    setRunning(true);
    try {
      const res = await fetch("/api/admin/system/payfast-preflight");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Pre-flight failed");
      setPreflight(json as PreflightResponse);
      const summary = (json as PreflightResponse).summary;
      onToast(
        summary.fail > 0 ? "error" : "success",
        `Pre-flight: ${summary.pass} pass · ${summary.warn} warn · ${summary.fail} fail`,
      );
    } catch (e) {
      onToast("error", e instanceof Error ? e.message : "Pre-flight failed");
    } finally {
      setRunning(false);
    }
  }

  async function loadPending() {
    setLoadingPending(true);
    try {
      const res = await fetch("/api/admin/payments/pending");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load pending payments");
      setPending(json.rows as PendingRow[]);
    } catch (e) {
      onToast("error", e instanceof Error ? e.message : "Could not load pending payments");
    } finally {
      setLoadingPending(false);
    }
  }

  useEffect(() => {
    void loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-sm">
      <h2 className="text-lg font-black text-gray-900">Payment System Health</h2>
      <p className="mt-1 text-xs text-gray-500">
        Run pre-flight after every deploy or env change to catch silent ITN failures
        before a real user is affected. Pending payments older than 10 minutes
        also Sentry-alert via the cron.
      </p>

      {/* Pre-flight */}
      <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gray-900">PayFast pre-flight</p>
            <p className="text-[11px] text-gray-500">
              Validates env vars, signature config, and probes the public notify endpoint.
            </p>
          </div>
          <button
            type="button"
            onClick={runPreflight}
            disabled={running}
            className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {running ? "Running…" : "Run pre-flight"}
          </button>
        </div>

        {preflight && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                Pass: {preflight.summary.pass}
              </span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">
                Warn: {preflight.summary.warn}
              </span>
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-semibold text-red-700">
                Fail: {preflight.summary.fail}
              </span>
              {preflight.notifyUrl && (
                <span className="truncate rounded-full border border-gray-200 bg-white px-2 py-0.5 text-gray-600">
                  Notify URL: <code className="text-[10px]">{preflight.notifyUrl}</code>
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              {preflight.checks.map((c) => (
                <div
                  key={c.name}
                  className={`rounded-lg border px-3 py-2 text-xs ${statusBadge[c.status]}`}
                >
                  <p className="font-semibold">
                    {c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "✗"} {c.name}
                  </p>
                  <p className="mt-0.5 text-[11px] opacity-90">{c.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pending payments */}
      <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gray-900">Pending payments (last 50)</p>
            <p className="text-[11px] text-gray-500">
              Anything in <span className="font-semibold">pending</span> for &gt;10 min means the ITN never landed —
              fix it via Reconcile Payment.
            </p>
          </div>
          <button
            type="button"
            onClick={loadPending}
            disabled={loadingPending}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingPending ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {!pending ? (
          <p className="mt-3 text-xs text-gray-500">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="mt-3 text-xs text-gray-500">No payment attempts recorded yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-3 font-medium">Created</th>
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 pr-3 font-medium">Plan / term</th>
                  <th className="py-2 pr-3 font-medium">Amount</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">m_payment_id</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => {
                  const minutes = ageMinutes(r.created_at);
                  const isStuck = r.status === "pending" && minutes >= 10;
                  const statusClass =
                    r.status === "resolved"
                      ? "text-emerald-700"
                      : r.status === "stale"
                      ? "text-gray-500"
                      : isStuck
                      ? "text-red-700 font-semibold"
                      : "text-amber-700";
                  return (
                    <tr key={r.id} className="border-b border-gray-100 text-gray-700">
                      <td className="py-2 pr-3 text-[11px] text-gray-500">{formatDate(r.created_at)}</td>
                      <td className="py-2 pr-3">{r.user_label}</td>
                      <td className="py-2 pr-3">
                        {r.plan_slug}
                        {r.term_months ? ` · ${r.term_months}m` : ""}
                      </td>
                      <td className="py-2 pr-3">R {r.amount_zar.toFixed(2)}</td>
                      <td className={`py-2 pr-3 ${statusClass}`}>
                        {r.status}
                        {isStuck && ` (${minutes} min)`}
                      </td>
                      <td className="py-2 pr-3 font-mono text-[10px] text-gray-500">{r.m_payment_id}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
