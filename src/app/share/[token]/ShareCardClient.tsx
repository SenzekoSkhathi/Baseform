"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, Share2, ArrowRight } from "lucide-react";

type SubjectEntry = { name: string; mark: number; apsPoints: number };

type Props = {
  fullName: string;
  aps: number;
  rating: string;
  school: string | null;
  gradeYear: string | null;
  subjects: SubjectEntry[];
  programmeCount: number;
  fundingCount: number;
  shareUrl: string;
};

const MAX_APS = 42;
const RING_R = 72;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R; // ≈ 452.4

function getTier(aps: number) {
  if (aps >= 38)
    return {
      label: "Platinum Scholar",
      ring: "#c084fc",
      glow: "rgba(192,132,252,0.3)",
      badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      dot: "bg-purple-400",
    };
  if (aps >= 32)
    return {
      label: "Gold Scholar",
      ring: "#fbbf24",
      glow: "rgba(251,191,36,0.3)",
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      dot: "bg-amber-400",
    };
  if (aps >= 25)
    return {
      label: "Silver Scholar",
      ring: "#94a3b8",
      glow: "rgba(148,163,184,0.25)",
      badge: "bg-slate-500/20 text-slate-300 border-slate-500/30",
      dot: "bg-slate-400",
    };
  if (aps >= 18)
    return {
      label: "Bronze Scholar",
      ring: "#f97316",
      glow: "rgba(249,115,22,0.3)",
      badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      dot: "bg-orange-400",
    };
  return {
    label: "Rising Scholar",
    ring: "#6b7280",
    glow: "rgba(107,114,128,0.2)",
    badge: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    dot: "bg-gray-500",
  };
}

function getSubjectColor(pts: number): string {
  if (pts >= 7) return "#22c55e";
  if (pts >= 6) return "#10b981";
  if (pts >= 5) return "#3b82f6";
  if (pts >= 4) return "#f59e0b";
  if (pts >= 3) return "#f97316";
  if (pts >= 2) return "#ef4444";
  return "#6b7280";
}

export default function ShareCardClient({
  fullName,
  aps,
  rating,
  school,
  gradeYear,
  subjects,
  programmeCount,
  fundingCount,
  shareUrl,
}: Props) {
  const [copied, setCopied] = useState(false);
  const websiteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://baseformapplications.com";
  const firstName = fullName.split(" ")[0] || "A student";
  const shareMessage = `${fullName} scored ${aps}/42 APS on Baseform — qualifying for ${programmeCount}+ university programmes. Calculate yours free:`;

  const tier = getTier(aps);
  const ringOffset = RING_CIRCUMFERENCE * (1 - aps / MAX_APS);
  const apsPct = Math.round((aps / MAX_APS) * 100);

  async function copyLink() {
    await navigator.clipboard.writeText(`${shareMessage}\n${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${fullName}'s APS Card — Baseform`,
          text: shareMessage,
          url: shareUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      copyLink();
    }
  }

  return (
    <main className="min-h-screen bg-stone-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Atmospheric glow layer */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-150 h-100 rounded-full blur-3xl opacity-30"
          style={{ background: `radial-gradient(circle, ${tier.glow}, transparent 70%)` }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-5 flex items-center justify-center gap-1.5">
          <div className="h-5 w-5 rounded-md bg-orange-500 flex items-center justify-center">
            <span className="text-[9px] font-black text-white">B</span>
          </div>
          <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">Baseform</span>
        </div>

        {/* Main card */}
        <div className="rounded-3xl border border-white/[0.07] bg-white/4 backdrop-blur-sm overflow-hidden">
          {/* Header strip */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-lg font-black text-white leading-tight">{fullName}</h1>
                <p className="mt-0.5 text-xs text-gray-500">
                  {gradeYear ?? "Grade 12"}
                  {school ? ` · ${school}` : ""}
                </p>
              </div>
              {/* Tier badge */}
              <span
                className={`shrink-0 ml-3 mt-0.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${tier.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
                {tier.label}
              </span>
            </div>
          </div>

          {/* Ring section */}
          <div
            className="relative mx-6 rounded-2xl flex flex-col items-center py-7"
            style={{ background: `radial-gradient(ellipse at 50% 0%, ${tier.glow}, transparent 65%)` }}
          >
            {/* SVG ring */}
            <div className="relative">
              <svg
                viewBox="0 0 180 180"
                width="180"
                height="180"
                className="block"
                style={{ filter: `drop-shadow(0 0 18px ${tier.ring}60)` }}
              >
                {/* Track */}
                <circle
                  cx="90"
                  cy="90"
                  r={RING_R}
                  fill="none"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="10"
                />
                {/* Fill */}
                <circle
                  cx="90"
                  cy="90"
                  r={RING_R}
                  fill="none"
                  stroke={tier.ring}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                  transform="rotate(-90 90 90)"
                  style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
                />
                {/* Percentage text inside ring */}
                <text
                  x="90"
                  y="83"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="38"
                  fontWeight="900"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {aps}
                </text>
                <text
                  x="90"
                  y="108"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.4)"
                  fontSize="13"
                  fontWeight="600"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  out of 42
                </text>
              </svg>
            </div>

            {/* Score meta row */}
            <div className="mt-3 flex items-center gap-3">
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Rating</p>
                <p className="text-sm font-bold text-white">{rating}</p>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div className="text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Percentile</p>
                <p className="text-sm font-bold text-white">{apsPct}%</p>
              </div>
              {programmeCount > 0 && (
                <>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Programmes</p>
                    <p className="text-sm font-bold" style={{ color: tier.ring }}>{programmeCount}+</p>
                  </div>
                </>
              )}
              {fundingCount > 0 && (
                <>
                  <div className="h-6 w-px bg-white/10" />
                  <div className="text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Funding</p>
                    <p className="text-sm font-bold" style={{ color: tier.ring }}>{fundingCount}+</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Subject breakdown */}
          {subjects.length > 0 && (
            <div className="px-6 py-4 border-t border-white/6">
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-600">
                Subject Breakdown
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {subjects.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center justify-between rounded-xl bg-white/4 border border-white/6 px-3 py-2"
                  >
                    <span className="text-[11px] font-medium text-gray-300 truncate mr-2 leading-tight">
                      {s.name}
                    </span>
                    <span
                      className="shrink-0 text-xs font-black"
                      style={{ color: getSubjectColor(s.apsPoints) }}
                    >
                      {s.apsPoints} pts
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[9px] text-gray-700 text-center">
                Best 6 subjects · Life Orientation excluded
              </p>
            </div>
          )}

          {/* Programme hook (if no subjects shown, surface it here) */}
          {programmeCount > 0 && subjects.length === 0 && (
            <div className="mx-6 mb-4 rounded-xl border border-white/6 bg-white/4 px-4 py-3 text-center">
              <p className="text-sm font-bold text-white">{programmeCount}+ university programmes</p>
              <p className="text-xs text-gray-500">qualify with this APS score</p>
            </div>
          )}

          {/* Share actions */}
          <div className="px-6 pb-6 pt-2 flex gap-2">
            <button
              onClick={nativeShare}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${tier.ring}, ${tier.ring}cc)` }}
            >
              <Share2 size={15} />
              Share
            </button>
            <button
              onClick={copyLink}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 py-3 text-sm font-semibold text-gray-300 hover:bg-white/9 transition-colors"
            >
              {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>

        {/* Viral CTA */}
        <div className="mt-4 rounded-2xl border border-white/[0.07] bg-white/3 p-5 text-center">
          <p className="text-sm font-bold text-white">
            {firstName} used Baseform to calculate their APS
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Free · 2 minutes · Built for South African Grade 12 learners
          </p>
          <Link
            href="/onboarding"
            className="mt-4 group inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-orange-400 transition-colors shadow-[0_4px_20px_rgba(249,115,22,0.35)]"
          >
            Calculate your APS
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-3 text-[10px] text-gray-700 tracking-wide">{websiteUrl}</p>
        </div>
      </div>
    </main>
  );
}
