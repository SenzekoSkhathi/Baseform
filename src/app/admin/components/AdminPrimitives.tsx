import type React from "react";
import type { RankedUser, SortDirection } from "../types";

export function SortHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-gray-100">
      {label}
      <span className="text-[10px] text-gray-400">{active ? (direction === "asc" ? "▲" : "▼") : "↕"}</span>
    </button>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-gray-900">{value}</p>
    </div>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-0.5 font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export function KeyValueList({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
        <p className="text-xs font-semibold text-gray-700">{title}</p>
        <p className="mt-1 text-xs text-gray-500">No data yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-2">
      <p className="text-xs font-semibold text-gray-700">{title}</p>
      <div className="mt-2 space-y-1.5">
        {entries.slice(0, 6).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-gray-600">{key}</span>
            <span className="font-semibold text-gray-900">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TopUsersList({
  title,
  entries,
  suffix,
  formatter,
}: {
  title: string;
  entries: RankedUser[];
  suffix: string;
  formatter?: (value: number) => string;
}) {
  if (entries.length === 0) {
    return (
      <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-2">
        <p className="text-xs font-semibold text-gray-700">{title}</p>
        <p className="mt-1 text-xs text-gray-500">No user usage yet</p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-2">
      <p className="text-xs font-semibold text-gray-700">{title}</p>
      <div className="mt-2 space-y-1.5">
        {entries.slice(0, 5).map((entry) => (
          <div key={entry.userId} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-gray-600">{entry.label}</span>
            <span className="font-semibold text-gray-900">
              {formatter ? formatter(entry.value) : `${entry.value.toLocaleString("en-ZA")} ${suffix}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(decimals)} ${units[index]}`;
}

export function ChartCard({
  title,
  color,
  max,
  points,
}: {
  title: string;
  color: string;
  max: number;
  points: { key: string; label: string; value: number }[];
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className="text-sm font-bold text-gray-900">{title}</p>
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        {points.map((point) => (
          <div key={point.key} className="grid grid-cols-[90px_1fr_50px] items-center gap-2">
            <p className="text-xs text-gray-500">{point.label}</p>
            <div className="h-2 rounded-full bg-gray-100">
              <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.max(2, Math.round((point.value / max) * 100))}%` }} />
            </div>
            <p className="text-right text-xs font-semibold text-gray-700">{point.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-xs">
      <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-lg border border-gray-200 bg-white px-2 py-1 disabled:opacity-50">Prev</button>
      <span className="text-gray-600">Page {page} of {totalPages}</span>
      <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="rounded-lg border border-gray-200 bg-white px-2 py-1 disabled:opacity-50">Next</button>
    </div>
  );
}

export function SectionCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-sm">
      <h2 className="text-lg font-black text-gray-900">{title}</h2>
      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
