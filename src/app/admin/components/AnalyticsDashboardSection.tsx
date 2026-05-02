"use client";

import { useMemo } from "react";
import { StatCard, MiniStat } from "./AdminPrimitives";
import type {
  AnalyticsResponse,
  DailyActivityPoint,
  HourlyHeatmapCell,
} from "@/lib/admin/userAnalytics";

type Props = {
  analytics: AnalyticsResponse | null;
  loading: boolean;
  onRefresh: () => void;
};

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatRelative(iso: string | null): string {
  if (!iso) return "Never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "Just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AnalyticsDashboardSection({ analytics, loading, onRefresh }: Props) {
  const daily = analytics?.daily ?? [];
  const hourly = analytics?.hourly ?? [];
  const eventTypes = analytics?.eventTypes ?? [];

  const onlinePulse = analytics?.presence.onlineNow ?? 0;

  return (
    <div className="rounded-3xl border border-orange-100 bg-white/95 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900">User Analytics</h2>
          <p className="mt-1 text-sm text-gray-500">
            Live presence, daily activity, retention, and engagement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <span
              className={`h-2 w-2 rounded-full ${
                onlinePulse > 0 ? "animate-pulse bg-emerald-500" : "bg-gray-300"
              }`}
            />
            {onlinePulse} online now
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Presence + rolling KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        <StatCard label="Online now" value={String(analytics?.presence.onlineNow ?? 0)} />
        <StatCard
          label="Active 15m"
          value={String(analytics?.presence.activeLast15m ?? 0)}
        />
        <StatCard
          label="Active 1h"
          value={String(analytics?.presence.activeLastHour ?? 0)}
        />
        <StatCard
          label="Active today"
          value={String(analytics?.presence.activeToday ?? 0)}
        />
        <StatCard label="DAU" value={String(analytics?.rolling.dau ?? 0)} />
        <StatCard label="WAU" value={String(analytics?.rolling.wau ?? 0)} />
        <StatCard label="MAU" value={String(analytics?.rolling.mau ?? 0)} />
        <StatCard
          label="Stickiness"
          value={`${analytics?.rolling.stickiness ?? 0}%`}
        />
      </div>

      {/* Range totals */}
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={String(analytics?.totals.totalUsers ?? 0)} />
        <StatCard
          label="New in range"
          value={String(analytics?.totals.newUsersInRange ?? 0)}
        />
        <StatCard
          label="Events in range"
          value={(analytics?.totals.eventsInRange ?? 0).toLocaleString("en-ZA")}
        />
        <StatCard
          label="Active in range"
          value={String(analytics?.totals.activeInRange ?? 0)}
        />
      </div>

      {/* Activity over time (multi-line) */}
      <div className="mt-4 rounded-2xl border border-gray-100 bg-white p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-gray-900">Daily activity</p>
          <p className="text-xs text-gray-500">
            {analytics?.range.label ?? "Loading range…"}
          </p>
        </div>
        <DailyActivityChart points={daily} />
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-gray-600">
          <Legend color="#f97316" label="Active users (DAU)" />
          <Legend color="#3b82f6" label="Events" />
          <Legend color="#10b981" label="Signups" />
        </div>
      </div>

      {/* Heatmap + event-type breakdown */}
      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-sm font-bold text-gray-900">
            Hour-of-day × day-of-week heatmap
          </p>
          <p className="text-[11px] text-gray-500">
            Where activity actually happens. UTC.
          </p>
          <HourlyHeatmap cells={hourly} />
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-sm font-bold text-gray-900">Activity by event type</p>
          <p className="text-[11px] text-gray-500">
            Volume across {analytics?.range.label ?? "range"}.
          </p>
          <EventTypeBars eventTypes={eventTypes} />
        </div>
      </div>

      {/* Retention */}
      <div className="mt-3 rounded-2xl border border-gray-100 bg-white p-4">
        <p className="text-sm font-bold text-gray-900">Retention</p>
        <p className="text-[11px] text-gray-500">
          Share of cohort returning at least once after the window. All users.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <RetentionRing label="D1" value={analytics?.retention.d1 ?? 0} color="#f97316" />
          <RetentionRing label="D7" value={analytics?.retention.d7 ?? 0} color="#3b82f6" />
          <RetentionRing label="D30" value={analytics?.retention.d30 ?? 0} color="#10b981" />
        </div>
      </div>

      {/* Top users + recently online */}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <UserList
          title="Most active users (in range)"
          subtitle="Ranked by event count"
          rows={analytics?.topActiveUsers ?? []}
          metricLabel="events"
        />
        <UserList
          title="Recently online"
          subtitle="Last 10 by last_seen_at"
          rows={analytics?.recentlyOnline ?? []}
          metricLabel="events"
          showLastSeen
        />
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-3 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}

function DailyActivityChart({ points }: { points: DailyActivityPoint[] }) {
  const dims = useMemo(() => {
    const width = 720;
    const height = 220;
    const padding = { top: 12, right: 12, bottom: 24, left: 32 };
    return { width, height, padding };
  }, []);

  if (points.length === 0) {
    return <p className="mt-3 text-xs text-gray-500">No data in range yet.</p>;
  }

  const maxVal = Math.max(
    1,
    ...points.map((p) => Math.max(p.dau, p.events, p.signups))
  );
  const innerW = dims.width - dims.padding.left - dims.padding.right;
  const innerH = dims.height - dims.padding.top - dims.padding.bottom;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : innerW;

  function path(values: number[]): string {
    return values
      .map((v, i) => {
        const x = dims.padding.left + i * stepX;
        const y = dims.padding.top + innerH - (v / maxVal) * innerH;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  function area(values: number[]): string {
    const top = path(values);
    const lastX = dims.padding.left + (values.length - 1) * stepX;
    const baseY = dims.padding.top + innerH;
    return `${top} L${lastX.toFixed(1)},${baseY.toFixed(1)} L${dims.padding.left.toFixed(
      1
    )},${baseY.toFixed(1)} Z`;
  }

  const dauValues = points.map((p) => p.dau);
  const eventValues = points.map((p) => p.events);
  const signupValues = points.map((p) => p.signups);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxVal * t));
  const xTickStep = Math.max(1, Math.floor(points.length / 6));

  return (
    <svg
      viewBox={`0 0 ${dims.width} ${dims.height}`}
      role="img"
      aria-label="Daily activity chart"
      className="mt-3 h-56 w-full"
    >
      {yTicks.map((tick, i) => {
        const y = dims.padding.top + innerH - (tick / maxVal) * innerH;
        return (
          <g key={`y-${i}`}>
            <line
              x1={dims.padding.left}
              x2={dims.width - dims.padding.right}
              y1={y}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth={1}
            />
            <text x={4} y={y + 3} fontSize={9} fill="#94a3b8">
              {tick}
            </text>
          </g>
        );
      })}

      <path d={area(eventValues)} fill="rgba(59,130,246,0.12)" />
      <path
        d={path(eventValues)}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={1.5}
      />
      <path d={path(dauValues)} fill="none" stroke="#f97316" strokeWidth={2} />
      <path d={path(signupValues)} fill="none" stroke="#10b981" strokeWidth={1.5} />

      {points.map((p, i) => {
        if (i % xTickStep !== 0 && i !== points.length - 1) return null;
        const x = dims.padding.left + i * stepX;
        return (
          <text
            key={`x-${i}`}
            x={x}
            y={dims.height - 6}
            textAnchor="middle"
            fontSize={9}
            fill="#94a3b8"
          >
            {p.day.slice(5)}
          </text>
        );
      })}
    </svg>
  );
}

function HourlyHeatmap({ cells }: { cells: HourlyHeatmapCell[] }) {
  const max = Math.max(1, ...cells.map((c) => c.count));
  const grid: HourlyHeatmapCell[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ dow: 0, hour: 0, count: 0 }))
  );
  for (const cell of cells) grid[cell.dow][cell.hour] = cell;

  return (
    <div className="mt-3 overflow-x-auto">
      <div className="inline-block">
        <div className="flex">
          <div className="w-10" />
          <div className="grid grid-cols-24 gap-[2px]" style={{ display: "grid", gridTemplateColumns: "repeat(24, 14px)" }}>
            {Array.from({ length: 24 }, (_, h) => (
              <div key={`h-${h}`} className="text-center text-[8px] text-gray-400">
                {h % 3 === 0 ? h : ""}
              </div>
            ))}
          </div>
        </div>
        {grid.map((row, dow) => (
          <div key={`row-${dow}`} className="mt-[2px] flex items-center">
            <div className="w-10 pr-2 text-right text-[10px] text-gray-500">
              {DOW_LABELS[dow]}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(24, 14px)", gap: 2 }}>
              {row.map((cell, h) => {
                const intensity = cell.count / max;
                const bg =
                  cell.count === 0
                    ? "#f3f4f6"
                    : `rgba(249, 115, 22, ${0.15 + intensity * 0.85})`;
                return (
                  <div
                    key={`c-${dow}-${h}`}
                    title={`${DOW_LABELS[dow]} ${h}:00 — ${cell.count} events`}
                    className="h-3.5 w-3.5 rounded-[3px]"
                    style={{ background: bg }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventTypeBars({
  eventTypes,
}: {
  eventTypes: { eventType: string; count: number }[];
}) {
  if (eventTypes.length === 0) {
    return <p className="mt-3 text-xs text-gray-500">No events recorded yet.</p>;
  }
  const max = Math.max(1, ...eventTypes.map((e) => e.count));
  const palette = [
    "bg-orange-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-purple-500",
    "bg-amber-500",
    "bg-cyan-500",
    "bg-rose-500",
    "bg-indigo-500",
  ];
  return (
    <div className="mt-3 space-y-2">
      {eventTypes.map((entry, i) => {
        const pct = Math.round((entry.count / max) * 100);
        return (
          <div
            key={entry.eventType}
            className="grid grid-cols-[120px_1fr_60px] items-center gap-2"
          >
            <p className="truncate text-xs font-medium text-gray-700">
              {entry.eventType}
            </p>
            <div className="h-2.5 rounded-full bg-gray-100">
              <div
                className={`h-2.5 rounded-full ${palette[i % palette.length]}`}
                style={{ width: `${Math.max(2, pct)}%` }}
              />
            </div>
            <p className="text-right text-xs font-semibold text-gray-900">
              {entry.count.toLocaleString("en-ZA")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function RetentionRing({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
      <svg width={88} height={88} viewBox="0 0 88 88">
        <circle cx={44} cy={44} r={radius} stroke="#e5e7eb" strokeWidth={8} fill="none" />
        <circle
          cx={44}
          cy={44}
          r={radius}
          stroke={color}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 44 44)"
        />
        <text
          x={44}
          y={48}
          textAnchor="middle"
          fontSize={16}
          fontWeight={800}
          fill="#111827"
        >
          {pct}%
        </text>
      </svg>
      <div>
        <p className="text-sm font-bold text-gray-900">{label} retention</p>
        <p className="text-[11px] text-gray-500">Cohort returned after window</p>
      </div>
    </div>
  );
}

type UserListProps = {
  title: string;
  subtitle: string;
  rows: {
    userId: string;
    label: string;
    email: string | null;
    events: number;
    lastSeenAt: string | null;
  }[];
  metricLabel: string;
  showLastSeen?: boolean;
};

function UserList({ title, subtitle, rows, metricLabel, showLastSeen }: UserListProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className="text-sm font-bold text-gray-900">{title}</p>
      <p className="text-[11px] text-gray-500">{subtitle}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-gray-500">No data yet.</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {rows.map((row) => (
            <div
              key={row.userId}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-gray-900">
                  {row.label}
                </p>
                {row.email && (
                  <p className="truncate text-[10px] text-gray-500">{row.email}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-900">
                  {row.events.toLocaleString("en-ZA")} {metricLabel}
                </p>
                {showLastSeen && (
                  <p className="text-[10px] text-gray-500">
                    {formatRelative(row.lastSeenAt)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniStat label="Rows" value={String(rows.length)} />
        <MiniStat
          label="Total events"
          value={rows
            .reduce((acc, r) => acc + r.events, 0)
            .toLocaleString("en-ZA")}
        />
      </div>
    </div>
  );
}
