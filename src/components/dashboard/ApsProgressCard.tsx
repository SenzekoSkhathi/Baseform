"use client";

import { useEffect, useState } from "react";

const MAX_APS = 42;

// Rough SA university entry thresholds as percentage markers
const MARKERS = [
  { label: "Min", pct: (18 / MAX_APS) * 100 },
  { label: "Good", pct: (25 / MAX_APS) * 100 },
  { label: "Top", pct: (32 / MAX_APS) * 100 },
];

type View = "progress" | "aps";

interface Props {
  aps: number;
  rating: string;
  totalInstitutionCount: number;
  submittedInstitutionCount: number;
  isGrade11?: boolean;
}

export default function ApsProgressCard({ aps, rating, totalInstitutionCount, submittedInstitutionCount, isGrade11 = false }: Props) {
  const apsPct = Math.min(Math.round((aps / MAX_APS) * 100), 100);
  // Progress = institutions with at least one submitted/completed app out of tracked institutions
  const progressPct = totalInstitutionCount === 0 ? 0 : Math.min(Math.round((submittedInstitutionCount / totalInstitutionCount) * 100), 100);
  const [animatedAps, setAnimatedAps] = useState(0);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  // Grade 11 planning mode: default to APS view since they have no real applications
  const [activeView, setActiveView] = useState<View>(isGrade11 ? "aps" : "progress");

  useEffect(() => {
    const t1 = setTimeout(() => setAnimatedAps(apsPct), 120);
    const t2 = setTimeout(() => setAnimatedProgress(progressPct), 120);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [apsPct, progressPct]);

  const pointsAway = MAX_APS - aps;
  const remaining = Math.max(totalInstitutionCount - submittedInstitutionCount, 0);
  const isProgressView = activeView === "progress";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3.5 flex flex-col gap-2.5">
      {/* Header row with tabs */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-900">
          {isProgressView ? "Applications Progress" : (isGrade11 ? "Projected APS" : "APS")}
        </span>
        <div className="flex gap-1.5">
          {!isGrade11 && (
            <button
              onClick={() => setActiveView("progress")}
              className={[
                "px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors",
                isProgressView
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-400",
              ].join(" ")}
            >
              Progress
            </button>
          )}
          <button
            onClick={() => setActiveView("aps")}
            className={[
              "px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors",
              !isProgressView
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-400",
            ].join(" ")}
          >
            APS
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-visible relative">
          {/* Threshold markers - only show for APS */}
          {!isProgressView &&
            MARKERS.map((m) => (
              <span
                key={m.label}
                className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-black/20 rounded-full z-10"
                style={{ left: `${m.pct}%` }}
              />
            ))}
          {/* Animated fill */}
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${isProgressView ? animatedProgress : animatedAps}%`,
              backgroundColor: isProgressView ? "#3b82f6" : "#f97316",
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-between">
        {isProgressView ? (
          <>
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-gray-900">{submittedInstitutionCount}</p>
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">Submitted</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-gray-900">{remaining}</p>
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">Remaining</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-gray-900">{totalInstitutionCount}</p>
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">Total</p>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-gray-900">{aps}</p>
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">{isGrade11 ? "Projected APS" : "Your APS"}</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-gray-900">{pointsAway}</p>
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">To Max</p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-sm font-bold text-orange-500">{rating}</p>
              <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wide">Rating</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
