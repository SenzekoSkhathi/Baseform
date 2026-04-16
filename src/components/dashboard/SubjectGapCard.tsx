"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { markToApsPoint } from "@/lib/aps/calculator";

type Subject = { name: string; mark: number };

// APS tier thresholds in descending order
const TIERS = [80, 70, 60, 50, 40, 30];

function nextTierMark(mark: number): number | null {
  // Return the lowest mark that gives one more APS point
  for (const tier of TIERS) {
    if (mark < tier) return tier;
  }
  return null; // already at max (80+)
}

type GapSubject = {
  name: string;
  mark: number;
  currentPoints: number;
  targetMark: number;
  gap: number;
};

function getGapSubjects(subjects: Subject[]): GapSubject[] {
  return subjects
    .filter((s) => !s.name.toLowerCase().includes("life orientation"))
    .map((s) => {
      const currentPoints = markToApsPoint(s.mark);
      const target = nextTierMark(s.mark);
      if (!target) return null;
      return {
        name: s.name,
        mark: s.mark,
        currentPoints,
        targetMark: target,
        gap: target - s.mark,
      };
    })
    .filter((s): s is GapSubject => s !== null)
    .sort((a, b) => a.gap - b.gap) // easiest gains first
    .slice(0, 4); // top 4 closest to next tier
}

export default function SubjectGapCard({ subjects }: { subjects: Subject[] }) {
  const gapSubjects = useMemo(() => getGapSubjects(subjects), [subjects]);

  if (gapSubjects.length === 0) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-50 px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
          <TrendingUp size={14} className="text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Easiest APS gains</p>
          <p className="text-[10px] font-medium text-gray-400">Subjects closest to the next APS point</p>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {gapSubjects.map((s) => (
          <div key={s.name} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-800">{s.name}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                Currently {s.mark}% ({s.currentPoints} pts) → need {s.targetMark}%
              </p>
            </div>
            <div className="shrink-0 text-right">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                +{s.gap}%
              </span>
              <p className="mt-0.5 text-[10px] font-medium text-gray-400">to gain +1 pt</p>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-50 bg-gray-50/50 px-4 py-2.5">
        <p className="text-[11px] font-medium text-gray-400">
          Each APS point unlocks more programmes. Focus on subjects with the smallest gap first.
        </p>
      </div>
    </div>
  );
}
