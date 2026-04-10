"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  AlertTriangle,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  GraduationCap,
  MapPin,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import { parseProgrammeRequirements, checkQualifications, sortProgrammesByQualification } from "@/lib/dashboard/qualifications";
import { getUniversityLogo } from "@/lib/dashboard/universityLogos";
import { Programme, type QualificationCheckResult, StudentSubject } from "@/lib/dashboard/types";

type University = {
  id: string;
  name: string;
  abbreviation: string | null;
  province: string | null;
  city: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  applicationUrl: string | null;
  applicationFee: number | null;
  closingDate: string | null;
};

type Props = {
  aps: number;
  studentSubjects: StudentSubject[];
  fieldOfInterest: string | null;
  universities: University[];
  programmes: Programme[];
};

type StatusFilter = "all" | "qualified" | "marginal" | "not-qualified";

type UniversityGroup = {
  university: University;
  programmes: QualificationCheckResult[];
  fields: Array<{
    field: string;
    programmes: QualificationCheckResult[];
  }>;
};

const STATUS_COPY: Record<StatusFilter, string> = {
  all: "All",
  qualified: "Qualified",
  marginal: "Marginal",
  "not-qualified": "Not qualified",
};

function formatCurrency(amount: number | null) {
  if (amount === null) return "Free / not listed";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateValue: string | null) {
  if (!dateValue) return "Not listed";

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return dateValue;

  return parsed.toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatQualificationType(value: string | null) {
  if (!value) return "Unknown";
  return value.replace(/_/g, " ");
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getStatusStyles(status: StatusFilter) {
  switch (status) {
    case "qualified":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "marginal":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "not-qualified":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getStatusLabel(status: QualificationCheckResult["status"]) {
  if (status === "qualified") return "Qualified";
  if (status === "marginal") return "Marginal";
  return "Not qualified";
}

function getStatusStylesForResult(status: QualificationCheckResult["status"]) {
  switch (status) {
    case "qualified":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "marginal":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "not-qualified":
      return "bg-red-50 text-red-700 border-red-200";
  }
}

function UniversityCardLogo({
  abbreviation,
  logoUrl,
  universityName,
}: {
  abbreviation: string;
  logoUrl: string | null;
  universityName: string;
}) {
  const [failed, setFailed] = useState(false);
  const fallbackText = (abbreviation || universityName.slice(0, 3)).slice(0, 3);

  if (!logoUrl || failed) {
    return (
      <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-white">
        <span className="text-xs font-black uppercase text-stone-500">{fallbackText}</span>
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={`${universityName} logo`}
      className="mt-0.5 h-11 w-11 shrink-0 rounded-xl border border-stone-200 bg-white object-contain p-1"
      onError={() => setFailed(true)}
    />
  );
}

export default function ProgrammesClient({
  aps,
  studentSubjects,
  fieldOfInterest,
  universities,
  programmes,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<StatusFilter>("all");
  const [openUniversityIds, setOpenUniversityIds] = useState<Record<string, boolean>>({});
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(null);
  const [universityFieldFilters, setUniversityFieldFilters] = useState<Record<string, string>>({});
  const hasSetInitialOpenState = useRef(false);

  const universityMap = useMemo(
    () => new Map(universities.map((university) => [university.id, university])),
    [universities]
  );

  const qualificationResults = useMemo(
    () => sortProgrammesByQualification(checkQualifications(programmes, aps, studentSubjects)),
    [aps, programmes, studentSubjects]
  );

  const filteredResults = useMemo(() => {
    const query = normalize(searchQuery);

    return qualificationResults.filter((result) => {
      if (activeTab !== "all" && result.status !== activeTab) return false;

      if (!query) return true;

      const haystack = [
        result.programme.name,
        result.programme.fieldOfStudy,
        result.programme.universityName,
        result.programme.universityAbbreviation,
        result.programme.qualificationType,
        result.programme.additionalRequirements,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeTab, qualificationResults, searchQuery]);

  const universityGroups = useMemo<UniversityGroup[]>(() => {
    const groups = new Map<string, UniversityGroup>();

    for (const result of filteredResults) {
      const university = universityMap.get(result.programme.universityId) ?? {
        id: result.programme.universityId,
        name: result.programme.universityName,
        abbreviation: result.programme.universityAbbreviation,
        province: null,
        city: null,
        logoUrl: null,
        websiteUrl: null,
        applicationUrl: null,
        applicationFee: null,
        closingDate: null,
      };

      if (!groups.has(university.id)) {
        groups.set(university.id, {
          university,
          programmes: [],
          fields: [],
        });
      }

      groups.get(university.id)!.programmes.push(result);
    }

    for (const group of groups.values()) {
      const fieldGroups = new Map<string, QualificationCheckResult[]>();

      for (const result of group.programmes) {
        const field = result.programme.fieldOfStudy?.trim() || "Other";
        if (!fieldGroups.has(field)) {
          fieldGroups.set(field, []);
        }
        fieldGroups.get(field)!.push(result);
      }

      group.fields = Array.from(fieldGroups.entries()).map(([field, items]) => ({
        field,
        programmes: items,
      }));

      group.fields.sort((left, right) => left.field.localeCompare(right.field));
      group.programmes.sort((left, right) => {
        const statusRank: Record<QualificationCheckResult["status"], number> = {
          qualified: 0,
          marginal: 1,
          "not-qualified": 2,
        };

        const statusDiff = statusRank[left.status] - statusRank[right.status];
        if (statusDiff !== 0) return statusDiff;

        if (left.programme.fieldOfStudy !== right.programme.fieldOfStudy) {
          return (left.programme.fieldOfStudy ?? "").localeCompare(right.programme.fieldOfStudy ?? "");
        }

        return left.programme.name.localeCompare(right.programme.name);
      });
    }

    return Array.from(groups.values()).sort((left, right) =>
      left.university.name.localeCompare(right.university.name)
    );
  }, [filteredResults, universityMap]);

  const stats = useMemo(() => {
    return {
      universities: universityGroups.length,
      programmes: filteredResults.length,
      qualified: filteredResults.filter((result) => result.status === "qualified").length,
      marginal: filteredResults.filter((result) => result.status === "marginal").length,
      notQualified: filteredResults.filter((result) => result.status === "not-qualified").length,
    };
  }, [filteredResults, universityGroups.length]);

  useEffect(() => {
    if (hasSetInitialOpenState.current) return;
    if (universityGroups.length === 0) return;

    setOpenUniversityIds({ [universityGroups[0].university.id]: true });
    hasSetInitialOpenState.current = true;
  }, [universityGroups]);

  useEffect(() => {
    if (filteredResults.length === 0) {
      setSelectedProgrammeId(null);
      return;
    }

    const flatIds = new Set(filteredResults.map((result) => result.programme.id));
    if (!selectedProgrammeId || !flatIds.has(selectedProgrammeId)) {
      setSelectedProgrammeId(filteredResults[0].programme.id);
    }
  }, [filteredResults, selectedProgrammeId]);

  const selectedProgramme = useMemo(
    () => filteredResults.find((result) => result.programme.id === selectedProgrammeId) ?? filteredResults[0] ?? null,
    [filteredResults, selectedProgrammeId]
  );

  const selectedUniversity = selectedProgramme
    ? universityMap.get(selectedProgramme.programme.universityId) ?? null
    : null;

  const selectedRequirements = useMemo(
    () => parseProgrammeRequirements(selectedProgramme?.programme.additionalRequirements ?? null),
    [selectedProgramme]
  );

  const emptyState = filteredResults.length === 0;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_32%,#fafaf9_100%)]">
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 overflow-hidden rounded-4xl border border-orange-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="relative isolate px-5 py-6 sm:px-8 sm:py-8">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(251,146,60,0.12),transparent_28%)]" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-stone-950 sm:text-4xl">
                    Programmes and Admission Requirements
                  </h1>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-136">
                <StatCard label="Universities" value={stats.universities} icon={<Building2 size={16} />} />
                <StatCard label="Programmes" value={stats.programmes} icon={<GraduationCap size={16} />} />
                <StatCard label="Qualified" value={stats.qualified} icon={<CheckCircle2 size={16} />} accent="emerald" />
                <StatCard label="APS" value={aps} icon={<Target size={16} />} accent="orange" />
              </div>
            </div>

            {fieldOfInterest && fieldOfInterest !== "Not sure yet" && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700">
                <Target size={16} />
                Showing programmes that align with your field of interest: {fieldOfInterest}
              </div>
            )}
          </div>
        </div>

        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative block">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by programme, university, faculty, or requirement"
              className="w-full rounded-2xl border border-stone-200 bg-white py-3.5 pl-11 pr-4 text-sm text-stone-900 shadow-sm outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUS_COPY) as StatusFilter[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setActiveTab(status)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  activeTab === status ? getStatusStyles(status) : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                }`}
              >
                {STATUS_COPY[status]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.85fr]">
          <div className="space-y-4">
            {!emptyState && (
              <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">Browse universities</p>
                    <p className="text-xs text-stone-500">
                      Tap a university to expand its fields and the programmes inside it.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold text-stone-500">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{stats.qualified} qualified</span>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{stats.marginal} marginal</span>
                    <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">{stats.notQualified} not qualified</span>
                  </div>
                </div>
              </div>
            )}

            {emptyState && (
              <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
                  <BookOpen size={24} />
                </div>
                <h2 className="text-lg font-bold text-stone-950">No programmes match your filters</h2>
                <p className="mt-2 text-sm leading-6 text-stone-500">
                  Try clearing search terms or changing the qualification status filter.
                </p>
              </div>
            )}

            {universityGroups.map((group) => {
              const isOpen = Boolean(openUniversityIds[group.university.id]);
              const selectedField = universityFieldFilters[group.university.id] ?? "all";
              const hasSelectedField = group.fields.some((fieldGroup) => fieldGroup.field === selectedField);
              const effectiveField = hasSelectedField ? selectedField : "all";
              const visibleFields = effectiveField === "all"
                ? group.fields
                : group.fields.filter((fieldGroup) => fieldGroup.field === effectiveField);

              return (
                <article
                  key={group.university.id}
                  className={`overflow-hidden rounded-[1.75rem] border bg-white shadow-sm transition ${
                    isOpen ? "border-orange-200 shadow-[0_16px_48px_rgba(249,115,22,0.12)]" : "border-stone-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenUniversityIds((current) => ({
                        ...current,
                        [group.university.id]: !isOpen,
                      }))
                    }
                    className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <UniversityCardLogo
                        abbreviation={group.university.abbreviation ?? ""}
                        logoUrl={getUniversityLogo(group.university.abbreviation ?? "", group.university.logoUrl)}
                        universityName={group.university.name}
                      />

                      <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-600">
                          {group.university.abbreviation ?? "UNI"}
                        </span>
                        <span className="text-xs font-semibold text-stone-400">
                          {group.programmes.length} programme{group.programmes.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <h2 className="mt-2 text-xl font-black tracking-tight text-stone-950">
                        {group.university.name}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-stone-500">
                        {(group.university.province || group.university.city) && (
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin size={14} />
                            {[group.university.city, group.university.province].filter(Boolean).join(", ")}
                          </span>
                        )}
                        <span>{group.fields.length} field{group.fields.length !== 1 ? "s" : ""}</span>
                        <span>Deadline: {formatDate(group.university.closingDate)}</span>
                      </div>
                    </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <div className="hidden rounded-2xl bg-stone-100 px-4 py-2 text-right sm:block">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">Application fee</p>
                        <p className="text-sm font-bold text-stone-900">{formatCurrency(group.university.applicationFee)}</p>
                      </div>
                      <div className={`rounded-full border p-2 ${isOpen ? "border-orange-200 bg-orange-50 text-orange-600" : "border-stone-200 bg-white text-stone-400"}`}>
                        <ChevronDown size={18} className={`transition ${isOpen ? "rotate-180" : "rotate-0"}`} />
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-stone-100 px-5 py-5">
                      <div className="space-y-5">
                        <div className="rounded-2xl border border-stone-200 bg-white p-3">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                            Filter faculties in {group.university.abbreviation ?? "this university"}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setUniversityFieldFilters((current) => ({
                                ...current,
                                [group.university.id]: "all",
                              }))}
                              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                effectiveField === "all"
                                  ? "bg-stone-900 text-white"
                                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                              }`}
                            >
                              All faculties ({group.programmes.length})
                            </button>

                            {group.fields.map((fieldGroup) => (
                              <button
                                key={`${group.university.id}-${fieldGroup.field}`}
                                type="button"
                                onClick={() => setUniversityFieldFilters((current) => ({
                                  ...current,
                                  [group.university.id]: fieldGroup.field,
                                }))}
                                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                  effectiveField === fieldGroup.field
                                    ? "bg-orange-500 text-white"
                                    : "bg-orange-50 text-orange-700 hover:bg-orange-100"
                                }`}
                              >
                                {fieldGroup.field} ({fieldGroup.programmes.length})
                              </button>
                            ))}
                          </div>
                        </div>

                        {visibleFields.map((fieldGroup) => (
                          <section key={fieldGroup.field} className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-stone-500">
                                  {fieldGroup.field}
                                </h3>
                                <p className="text-xs text-stone-400">
                                  {fieldGroup.programmes.length} programme{fieldGroup.programmes.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-500 shadow-sm">
                                Faculty / field of study
                              </span>
                            </div>

                            <div className="space-y-2">
                              {fieldGroup.programmes.map((result) => {
                                const isSelected = selectedProgrammeId === result.programme.id;

                                return (
                                  <button
                                    key={result.programme.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedProgrammeId(result.programme.id);
                                      setOpenUniversityIds((current) => ({
                                        ...current,
                                        [result.programme.universityId]: true,
                                      }));
                                    }}
                                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                                      isSelected
                                        ? "border-orange-300 bg-white shadow-[0_10px_28px_rgba(249,115,22,0.12)]"
                                        : "border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${getStatusStylesForResult(result.status)}`}>
                                            {getStatusLabel(result.status)}
                                          </span>
                                          <span className="text-xs font-semibold text-stone-400">
                                            APS {result.programme.apsMinimum}
                                          </span>
                                        </div>
                                        <h4 className="mt-2 text-sm font-bold text-stone-950 sm:text-base">
                                          {result.programme.name}
                                        </h4>
                                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-500">
                                          <span className="rounded-full bg-stone-100 px-2.5 py-1">
                                            {formatQualificationType(result.programme.qualificationType)}
                                          </span>
                                          <span className="rounded-full bg-stone-100 px-2.5 py-1">
                                            {result.programme.durationYears} years
                                          </span>
                                          <span className="rounded-full bg-stone-100 px-2.5 py-1">
                                            NQF {result.programme.nqfLevel}
                                          </span>
                                        </div>
                                      </div>

                                      <ArrowRight size={16} className="mt-1 shrink-0 text-stone-300" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </section>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <aside className="lg:sticky lg:top-6">
            <div className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="bg-[linear-gradient(135deg,#0f172a_0%,#1f2937_50%,#ea580c_140%)] px-5 py-5 text-white">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-100">
                  <GraduationCap size={14} />
                  Programme details
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {selectedProgramme?.programme.name ?? "Select a programme"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Click any programme on the left to inspect APS, subjects, qualification type, duration, and application requirements.
                </p>
              </div>

              {selectedProgramme && selectedUniversity ? (
                <div className="space-y-5 px-5 py-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${getStatusStylesForResult(selectedProgramme.status)}`}>
                      {getStatusLabel(selectedProgramme.status)}
                    </span>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                      {selectedProgramme.programme.universityAbbreviation}
                    </span>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                      {selectedProgramme.programme.fieldOfStudy || "Other"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <DetailMetric label="APS required" value={selectedProgramme.programme.apsMinimum.toString()} />
                    <DetailMetric label="Your APS" value={aps.toString()} tone={aps >= selectedProgramme.programme.apsMinimum ? "emerald" : "rose"} />
                    <DetailMetric label="Duration" value={`${selectedProgramme.programme.durationYears} years`} />
                    <DetailMetric label="Qualification" value={formatQualificationType(selectedProgramme.programme.qualificationType)} />
                    <DetailMetric label="NQF" value={selectedProgramme.programme.nqfLevel.toString()} />
                    <DetailMetric label="Places" value={selectedProgramme.programme.placesAvailable?.toString() ?? "Not listed"} />
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-stone-900">
                      <BookOpen size={16} className="text-orange-500" />
                      University
                    </div>
                    <p className="font-semibold text-stone-950">{selectedUniversity.name}</p>
                    <p className="mt-1 text-sm text-stone-500">
                      {[selectedUniversity.city, selectedUniversity.province].filter(Boolean).join(", ") || "Location not listed"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-600">
                      <span className="rounded-full bg-white px-3 py-1 shadow-sm">Fee: {formatCurrency(selectedUniversity.applicationFee)}</span>
                      <span className="rounded-full bg-white px-3 py-1 shadow-sm">Deadline: {formatDate(selectedUniversity.closingDate)}</span>
                    </div>
                  </div>

                  {selectedProgramme.programme.nativeScoreMinimum !== null && (
                    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-orange-700">
                        <Target size={16} />
                        Scoring system
                      </div>
                      <p className="mt-2 text-sm leading-6 text-orange-900">
                        {selectedProgramme.programme.scoringSystem} · Native score minimum {selectedProgramme.programme.nativeScoreMinimum}
                      </p>
                    </div>
                  )}

                  <div className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-stone-900">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      Subject requirements
                    </div>

                    {selectedRequirements.subjectRequirements.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedRequirements.subjectRequirements.map((subject) => (
                          <span
                            key={subject.subject}
                            className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-700"
                          >
                            {subject.subject}{subject.minimumMark !== null ? ` ≥ ${subject.minimumMark}%` : ""}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-stone-500">No explicit subject requirement was found in the seed text.</p>
                    )}

                    {selectedProgramme.missingSubjects.length > 0 && (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertTriangle size={16} />
                          You are missing
                        </div>
                        <p className="mt-2 leading-6">{selectedProgramme.missingSubjects.join(", ")}</p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-bold text-stone-900">
                      <Clock3 size={16} className="text-stone-500" />
                      Extra notes
                    </div>

                    {selectedProgramme.additionalNotes.length > 0 ? (
                      <ul className="space-y-2 text-sm leading-6 text-stone-600">
                        {selectedProgramme.additionalNotes.map((note) => (
                          <li key={note} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-stone-500">No extra notes were captured for this programme.</p>
                    )}
                  </div>

                  {selectedProgramme.programme.additionalRequirements && (
                    <div className="rounded-2xl border border-stone-200 bg-white p-4">
                      <div className="mb-2 text-sm font-bold text-stone-900">Seed text</div>
                      <p className="text-sm leading-6 text-stone-600">
                        {selectedProgramme.programme.additionalRequirements}
                      </p>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedUniversity.applicationUrl ? (
                      <a
                        href={selectedUniversity.applicationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
                      >
                        Open application portal
                        <ExternalLink size={16} />
                      </a>
                    ) : (
                      <div className="rounded-2xl border border-stone-200 bg-stone-100 px-4 py-3 text-center text-sm font-semibold text-stone-500">
                        Application link not listed
                      </div>
                    )}

                    {selectedUniversity.websiteUrl ? (
                      <a
                        href={selectedUniversity.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-bold text-stone-800 shadow-sm transition hover:border-stone-300 hover:bg-stone-50"
                      >
                        Visit university website
                        <ExternalLink size={16} />
                      </a>
                    ) : (
                      <div className="rounded-2xl border border-stone-200 bg-stone-100 px-4 py-3 text-center text-sm font-semibold text-stone-500">
                        Website not listed
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
                    <div className="mb-2 flex items-center gap-2 font-bold text-stone-900">
                      <Sparkles size={16} className="text-orange-500" />
                      Fit summary
                    </div>
                    <p className="leading-6">{selectedProgramme.overallMessage}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 px-5 py-5">
                  <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5 text-sm leading-6 text-stone-500">
                    Use the programme list on the left to inspect admission details. The panel will update with APS, subject requirements, and application links.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailMetric label="APS required" value="—" />
                    <DetailMetric label="Duration" value="—" />
                    <DetailMetric label="Qualification" value="—" />
                    <DetailMetric label="NQF" value="—" />
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent = "stone",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: "stone" | "orange" | "emerald";
}) {
  const accentStyles =
    accent === "orange"
      ? "bg-orange-50 text-orange-600"
      : accent === "emerald"
        ? "bg-emerald-50 text-emerald-600"
        : "bg-stone-100 text-stone-600";

  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${accentStyles}`}>
        {icon}
      </div>
      <div className="text-2xl font-black tracking-tight text-stone-950">{value}</div>
      <div className="text-xs font-medium text-stone-400">{label}</div>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  tone = "stone",
}: {
  label: string;
  value: string;
  tone?: "stone" | "emerald" | "rose";
}) {
  const toneStyles =
    tone === "emerald"
      ? "text-emerald-700 bg-emerald-50"
      : tone === "rose"
        ? "text-rose-700 bg-rose-50"
        : "text-stone-900 bg-stone-50";

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">{label}</div>
      <div className={`mt-2 rounded-xl px-3 py-2 text-sm font-bold ${toneStyles}`}>{value}</div>
    </div>
  );
}
