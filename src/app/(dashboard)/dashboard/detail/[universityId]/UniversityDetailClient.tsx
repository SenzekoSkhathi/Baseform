"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Calendar, Globe, GripVertical, X } from "lucide-react";
import { QualificationCheckResult } from "@/lib/dashboard/types";
import { getUniversityLogo } from "@/lib/dashboard/universityLogos";
import { getUniversityChoiceLimit } from "@/lib/dashboard/applicationRules";

type Programme = {
  applicationId: string;
  applicationStatus: string;
  sourceUniversityAbbreviation?: string | null;
  programme: {
    id: string;
    name: string;
    fieldOfStudy: string;
    apsMinimum: number;
    qualificationType: string;
    durationYears: number;
    additionalRequirements: string | null;
  };
  qualification: QualificationCheckResult;
};

type University = {
  id: string;
  name: string;
  abbreviation: string;
  logoUrl: string | null;
  province: string | null;
  city: string | null;
  closing_date: string | null;
  website_url: string | null;
  application_url: string | null;
  application_fee: number | null;
};

type Props = {
  university: University;
  programmes: Programme[];
  aps: number;
};

// Maps real DB status values to display
const APP_STATUS: Record<string, { label: string; className: string }> = {
  planning:    { label: "Planning",    className: "bg-gray-100 text-gray-500" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-600" },
  submitted:   { label: "Submitted",   className: "bg-purple-100 text-purple-600" },
  accepted:    { label: "Accepted",    className: "bg-green-100 text-green-700" },
  rejected:    { label: "Rejected",    className: "bg-red-100 text-red-600" },
  waitlisted:  { label: "Waitlisted",  className: "bg-amber-100 text-amber-700" },
};

const QUAL_STYLE = {
  qualified:       { bar: "bg-green-500", badge: "bg-green-100 text-green-700",  label: "Qualifies" },
  marginal:        { bar: "bg-amber-400", badge: "bg-amber-100 text-amber-700",  label: "Marginal" },
  "not-qualified": { bar: "bg-red-400",   badge: "bg-red-100 text-red-600",      label: "Doesn't Qualify" },
};

const ABBR_COLORS: Record<string, string> = {
  UWC: "bg-teal-600", SU: "bg-red-700", UP: "bg-blue-800", NWU: "bg-yellow-600",
  CPUT: "bg-blue-600", UCT: "bg-sky-700", WITS: "bg-blue-700", UJ: "bg-orange-600",
  DUT: "bg-green-700", MUT: "bg-purple-700", TUT: "bg-rose-600", VUT: "bg-indigo-700",
};

export default function UniversityDetailClient({ university, programmes, aps }: Props) {
  const router = useRouter();
  const [programmesState, setProgrammesState] = useState(programmes);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [cardFeedback, setCardFeedback] = useState<string | null>(null);
  const color = ABBR_COLORS[university.abbreviation] ?? "bg-gray-600";
  const choiceLimit = getUniversityChoiceLimit(university.abbreviation);

  const deadline = university.closing_date
    ? new Date(university.closing_date).toLocaleDateString("en-ZA", {
        day: "numeric", month: "short", year: "numeric",
      })
    : null;
  const applyUrl = university.application_url || university.website_url;

  useEffect(() => {
    setProgrammesState(programmes);
  }, [programmes]);

  function moveChoice(dragApplicationId: string, dropApplicationId: string) {
    if (dragApplicationId === dropApplicationId) return;

    const previous = programmesState;

    const orderedIds = programmesState.map((programme) => programme.applicationId);
    const from = orderedIds.indexOf(dragApplicationId);
    const to = orderedIds.indexOf(dropApplicationId);
    if (from < 0 || to < 0) return;

    const nextIds = [...orderedIds];
    const [moved] = nextIds.splice(from, 1);
    nextIds.splice(to, 0, moved);

    const byId = new Map(programmesState.map((programme) => [programme.applicationId, programme]));
    setProgrammesState(nextIds.map((id) => byId.get(id)).filter((item): item is Programme => Boolean(item)));

    fetch("/api/applications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedApplicationIds: nextIds }),
    })
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) {
          setCardFeedback(payload?.error || "Could not reorder right now.");
          setProgrammesState(previous);
        }
      })
      .catch(() => {
        setCardFeedback("Could not reorder right now.");
        setProgrammesState(previous);
      });
  }

  function removeChoice(applicationId: string) {
    const previous = programmesState;
    const nextProgrammes = previous.filter((programme) => programme.applicationId !== applicationId);
    setCardFeedback(null);
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.add(applicationId);
      return next;
    });

    setProgrammesState(nextProgrammes);

    fetch("/api/applications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId }),
    })
      .then((response) => response.json().then((payload) => ({ ok: response.ok, payload })))
      .then(({ ok, payload }) => {
        if (!ok) {
          setCardFeedback(payload?.error || "Could not remove this programme right now.");
          setProgrammesState(previous);
          return;
        }
        router.refresh();
        // When the last programme is removed, the university card on the
        // applications list is now empty — send the user back so the grid
        // reflects the removal without a hard refresh.
        if (nextProgrammes.length === 0) {
          router.replace("/dashboard/detail");
        }
      })
      .catch(() => {
        setCardFeedback("Could not remove this programme right now.");
        setProgrammesState(previous);
      })
      .finally(() => {
        setBusyIds((prev) => {
          const next = new Set(prev);
          next.delete(applicationId);
          return next;
        });
      });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fff9f2]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_12%_8%,rgba(251,146,60,0.18),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_40%_at_90%_12%,rgba(56,189,248,0.11),transparent_72%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-6 md:px-6 md:pt-8">
        <section className="rounded-3xl border border-orange-100 bg-white/90 p-4 shadow-[0_14px_40px_rgba(249,115,22,0.12)] md:p-6">
          <button
            onClick={() => router.back()}
            className="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            <ChevronLeft size={16} />
            My Applications
          </button>

          <div className="flex items-start gap-4">
            {getUniversityLogo(university.abbreviation, university.logoUrl) ? (
              <img
                src={getUniversityLogo(university.abbreviation, university.logoUrl)!}
                alt={university.abbreviation}
                className="h-14 w-14 shrink-0 rounded-2xl border border-gray-100 bg-gray-50 p-1 object-contain md:h-16 md:w-16"
              />
            ) : (
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl md:h-16 md:w-16 ${color}`}>
                <span className="px-1 text-center text-xs font-black text-white">{university.abbreviation}</span>
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">University Details</p>
              <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight text-gray-900 md:text-3xl">{university.name}</h1>
              <p className="mt-1 text-sm font-medium text-gray-500">
                {[university.city, university.province].filter(Boolean).join(", ") || "South Africa"}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {university.website_url && (
                  <a
                    href={university.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-100"
                  >
                    <Globe size={12} />
                    Visit website
                  </a>
                )}

                {applyUrl ? (
                  <a
                    href={applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-transform hover:bg-orange-600 active:scale-95"
                  >
                    Apply Now
                  </a>
                ) : (
                  <span className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-400">
                    Apply link unavailable
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 md:gap-3">
            <div className="rounded-2xl border border-orange-100 bg-orange-50 px-3 py-3">
              <p className="text-xl font-black leading-none text-orange-500">{programmesState.length}</p>
              <p className="mt-1 text-[11px] font-semibold text-orange-500/80">Selected</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-3">
              <p className="text-xl font-black leading-none text-blue-600">
                {university.application_fee !== null ? `R${university.application_fee}` : "N/A"}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-blue-500/80">Fee</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3">
              <p className="text-xl font-black leading-none text-gray-800">{aps}</p>
              <p className="mt-1 text-[11px] font-semibold text-gray-500">Your APS</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-rose-500">Deadline</p>
              <div className="mt-1 flex items-center gap-1.5">
                <Calendar size={13} className="shrink-0 text-rose-400" />
                <p className="text-xs font-semibold text-rose-500">{deadline ?? "Not set"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-gray-100 bg-white/90 p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-gray-900 md:text-xl">
                Programmes
              </h2>
              <p className="mt-0.5 text-xs font-medium text-gray-400">
                Your qualification view for this university
              </p>
            </div>
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-600">
              {programmesState.length}{choiceLimit ? ` / ${choiceLimit}` : ""} total
            </span>
          </div>

          {programmesState.length === 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
              <p className="text-sm font-medium text-gray-500">No programmes added for this university yet.</p>
            </div>
          )}

          {cardFeedback && (
            <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {cardFeedback}
            </div>
          )}

          <div className="space-y-3">
            {programmesState.map(({ applicationId, applicationStatus, sourceUniversityAbbreviation, programme, qualification }, index) => {
              const qual = QUAL_STYLE[qualification.status];
              const appStatus = APP_STATUS[applicationStatus] ?? APP_STATUS.planning;
              const progressPct = Math.min(100, Math.max(8, Math.round((aps / Math.max(programme.apsMinimum, 1)) * 100)));

              return (
                <article
                  key={applicationId}
                  draggable={!busyIds.has(applicationId)}
                  onDragStart={() => setDraggedId(applicationId)}
                  onDragEnd={() => setDraggedId(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (!draggedId) return;
                    moveChoice(draggedId, applicationId);
                  }}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] md:p-5"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <GripVertical size={14} className="text-gray-400" />
                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-600">
                          Choice {index + 1}
                        </span>
                        {university.abbreviation === "CAO" && sourceUniversityAbbreviation && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                            {sourceUniversityAbbreviation}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold leading-snug text-gray-900 md:text-[15px]">{programme.name}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {[
                          programme.fieldOfStudy,
                          programme.durationYears && `${programme.durationYears} yr`,
                          programme.qualificationType,
                        ].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${appStatus.className}`}>
                        {appStatus.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeChoice(applicationId)}
                        disabled={busyIds.has(applicationId)}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                        aria-label="Remove programme"
                        title="Remove programme"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 px-3 py-2.5">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-gray-500">Qualification Progress</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${qual.badge}`}>
                        {qual.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${qual.bar}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <p className="text-xs text-gray-500">
                      APS required: <span className="font-bold text-gray-800">{programme.apsMinimum}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Your APS: <span className="font-bold text-gray-800">{aps}</span>
                    </p>
                    {qualification.apsShortfall !== undefined && qualification.apsShortfall > 0 && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500">
                        {qualification.apsShortfall} short
                      </span>
                    )}
                  </div>

                  {qualification.missingSubjects.length > 0 && (
                    <p className="mt-2 text-[11px] font-medium text-amber-600">
                      Missing subjects: {qualification.missingSubjects.join(", ")}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
