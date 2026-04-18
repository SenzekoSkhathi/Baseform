"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, BookmarkX, ExternalLink, GraduationCap, Target } from "lucide-react";
import { isWitsAbbreviation, markToApsPoint } from "@/lib/aps/calculator";

type TargetRow = {
  id: number;
  created_at: string;
  faculties: {
    id: number;
    name: string;
    field_of_study: string | null;
    aps_minimum: number;
    qualification_type: string | null;
    duration_years: number | null;
  } | null;
  universities: {
    id: number;
    name: string;
    abbreviation: string | null;
    logo_url: string | null;
    closing_date: string | null;
    application_url: string | null;
  } | null;
};

type Props = {
  targets: TargetRow[];
  aps: number;
  witsAps: number;
  gradeYear: string | null;
};

function getStatusForAps(studentAps: number, required: number) {
  if (studentAps >= required) return { label: "On Track", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (studentAps >= required - 3) return { label: "Close", color: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "Not Yet", color: "bg-red-50 text-red-700 border-red-200" };
}

function formatQualType(v: string | null) {
  return (v ?? "").replace(/_/g, " ");
}

export default function TargetsClient({ targets: initialTargets, aps, witsAps, gradeYear }: Props) {
  const [targets, setTargets] = useState(initialTargets);
  const [removing, setRemoving] = useState<Record<number, boolean>>({});

  const apsForTarget = (t: TargetRow) =>
    isWitsAbbreviation(t.universities?.abbreviation ?? null) ? witsAps : aps;

  async function handleRemove(targetId: number) {
    if (removing[targetId]) return;
    setRemoving((prev) => ({ ...prev, [targetId]: true }));

    const res = await fetch(`/api/targets/${targetId}`, { method: "DELETE" });
    if (res.ok) {
      setTargets((prev) => prev.filter((t) => t.id !== targetId));
    }

    setRemoving((prev) => ({ ...prev, [targetId]: false }));
  }

  const isGrade11 = gradeYear === "Grade 11";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_32%,#fafaf9_100%)]">
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
        <Link
          href="/programmes"
          className="mb-5 inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-600 shadow-sm hover:bg-stone-50"
        >
          <ArrowLeft size={14} />
          Browse programmes
        </Link>

        <div className="mb-6 overflow-hidden rounded-3xl border border-orange-100 bg-white shadow-[0_16px_48px_rgba(249,115,22,0.1)]">
          <div className="relative isolate px-5 py-6 sm:px-8">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.14),transparent_36%)]" />
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100">
                <Target size={22} className="text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-stone-950">My Target Programmes</h1>
                <p className="mt-1 text-sm text-stone-500">
                  {isGrade11
                    ? "Programmes you're aiming for in Grade 12. Keep improving your marks to reach them."
                    : "Programmes you've saved for reference."}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-2 text-center">
                <p className="text-lg font-black text-stone-900">{targets.length}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">Saved</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-center">
                <p className="text-lg font-black text-emerald-700">
                  {targets.filter((t) => t.faculties && apsForTarget(t) >= t.faculties.aps_minimum).length}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-500">On Track</p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-orange-50 px-4 py-2 text-center">
                <p className="text-lg font-black text-orange-700">{aps}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-400">
                  {isGrade11 ? "Projected APS" : "Your APS"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {targets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100">
              <Bookmark size={24} className="text-stone-400" />
            </div>
            <h2 className="text-lg font-bold text-stone-900">No targets saved yet</h2>
            <p className="mt-2 text-sm text-stone-500">
              Browse programmes and tap &quot;Save as target&quot; to build your wishlist.
            </p>
            <Link
              href="/programmes"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
            >
              <GraduationCap size={16} />
              Explore programmes
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {targets.map((target) => {
              const faculty = target.faculties;
              const uni = target.universities;
              if (!faculty || !uni) return null;

              const studentAps = apsForTarget(target);
              const status = getStatusForAps(studentAps, faculty.aps_minimum);
              const apsShortfall = Math.max(0, faculty.aps_minimum - studentAps);

              return (
                <div
                  key={target.id}
                  className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"
                >
                  <div className="px-5 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${status.color}`}>
                            {status.label}
                          </span>
                          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-600">
                            {uni.abbreviation ?? uni.name}
                          </span>
                        </div>
                        <h3 className="mt-2 text-base font-bold text-stone-950">{faculty.name}</h3>
                        <p className="mt-1 text-sm text-stone-500">{uni.name}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-500">
                          <span className="rounded-full bg-stone-100 px-2.5 py-1">APS required: {faculty.aps_minimum}</span>
                          {faculty.duration_years && (
                            <span className="rounded-full bg-stone-100 px-2.5 py-1">{faculty.duration_years} years</span>
                          )}
                          {faculty.qualification_type && (
                            <span className="rounded-full bg-stone-100 px-2.5 py-1">{formatQualType(faculty.qualification_type)}</span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemove(target.id)}
                        disabled={removing[target.id]}
                        className="shrink-0 rounded-xl border border-red-100 bg-red-50 p-2 text-red-400 transition hover:bg-red-100 hover:text-red-600 disabled:opacity-40"
                        title="Remove target"
                      >
                        <BookmarkX size={16} />
                      </button>
                    </div>

                    {apsShortfall > 0 && isGrade11 && (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                        You need <span className="font-bold">{apsShortfall} more APS point{apsShortfall !== 1 ? "s" : ""}</span> to reach this programme&apos;s minimum. Keep improving your marks.
                      </div>
                    )}
                  </div>

                  {uni.application_url && !isGrade11 && (
                    <div className="border-t border-stone-100 px-5 py-3">
                      <a
                        href={uni.application_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700"
                      >
                        Apply now
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
