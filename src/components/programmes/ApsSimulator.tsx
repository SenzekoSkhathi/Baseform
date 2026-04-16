"use client";

import { useState, useMemo } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { calculateAPS, markToApsPoint } from "@/lib/aps/calculator";

type Subject = { name: string; mark: number };

type Props = {
  subjects: Subject[];
  currentAps: number;
};

function getStatusLabel(mark: number) {
  if (mark >= 80) return { label: "7 pts", color: "text-emerald-600 bg-emerald-50" };
  if (mark >= 70) return { label: "6 pts", color: "text-emerald-600 bg-emerald-50" };
  if (mark >= 60) return { label: "5 pts", color: "text-teal-600 bg-teal-50" };
  if (mark >= 50) return { label: "4 pts", color: "text-amber-600 bg-amber-50" };
  if (mark >= 40) return { label: "3 pts", color: "text-orange-600 bg-orange-50" };
  if (mark >= 30) return { label: "2 pts", color: "text-red-600 bg-red-50" };
  return { label: "1 pt", color: "text-red-700 bg-red-100" };
}

export default function ApsSimulator({ subjects, currentAps }: Props) {
  const [open, setOpen] = useState(false);
  const [simMarks, setSimMarks] = useState<Record<string, number>>(
    () => Object.fromEntries(subjects.map((s) => [s.name, s.mark]))
  );

  const simSubjects: Subject[] = useMemo(
    () => subjects.map((s) => ({ name: s.name, mark: simMarks[s.name] ?? s.mark })),
    [subjects, simMarks]
  );

  const simAps = useMemo(() => calculateAPS(simSubjects), [simSubjects]);
  const delta = simAps - currentAps;

  function resetSim() {
    setSimMarks(Object.fromEntries(subjects.map((s) => [s.name, s.mark])));
  }

  const nonLO = simSubjects.filter((s) => !s.name.toLowerCase().includes("life orientation"));

  return (
    <div className="rounded-2xl border border-purple-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50">
            <SlidersHorizontal size={16} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">APS Simulator</p>
            <p className="text-xs text-gray-400">Adjust marks and see your projected APS change</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {delta !== 0 && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${delta > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {delta > 0 ? "+" : ""}{delta} pts
            </span>
          )}
          <ChevronDown size={16} className={`text-gray-400 transition ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-purple-100 px-4 py-4 space-y-5">
          {/* Live APS display */}
          <div className="flex items-center justify-between rounded-2xl bg-purple-50 px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-400">Current APS</p>
              <p className="text-2xl font-black text-purple-700">{currentAps}</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Delta</p>
              <p className={`text-2xl font-black ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-500" : "text-gray-300"}`}>
                {delta > 0 ? "+" : ""}{delta}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-purple-400">Simulated APS</p>
              <p className="text-2xl font-black text-purple-700">{simAps}</p>
            </div>
          </div>

          {/* Subject sliders */}
          <div className="space-y-3">
            {nonLO.map((s) => {
              const { label, color } = getStatusLabel(s.mark);
              const origPoints = markToApsPoint(subjects.find((x) => x.name === s.name)?.mark ?? s.mark);
              const simPoints = markToApsPoint(s.mark);
              const pointDelta = simPoints - origPoints;

              return (
                <div key={s.name} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800">{s.name}</p>
                    <div className="flex items-center gap-2">
                      {pointDelta !== 0 && (
                        <span className={`text-[11px] font-bold ${pointDelta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {pointDelta > 0 ? "+" : ""}{pointDelta} pt
                        </span>
                      )}
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${color}`}>{label}</span>
                      <span className="w-9 text-right text-sm font-black text-gray-800">{s.mark}%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={s.mark}
                    onChange={(e) =>
                      setSimMarks((prev) => ({ ...prev, [s.name]: Number(e.target.value) }))
                    }
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-purple-100 accent-purple-500"
                  />
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={resetSim}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition"
          >
            Reset to current marks
          </button>
        </div>
      )}
    </div>
  );
}
