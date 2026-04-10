"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, X, Check, ChevronLeft, Search } from "lucide-react";
import { checkQualifications } from "@/lib/dashboard/qualifications";
import { Programme, StudentSubject } from "@/lib/dashboard/types";
import { getUniversityLogo } from "@/lib/dashboard/universityLogos";
import {
  KZN_CAO_MAX_CHOICES,
  getUniversityChoiceLimit,
  isKznCaoUniversity,
  normalizeUniversityAbbr,
} from "@/lib/dashboard/applicationRules";

// ─── Types ───────────────────────────────────────────────────────────────────

type AppProgramme = {
  applicationId: string;
  facultyId: string;
  facultyName: string;
  apsMinimum: number;
  fieldOfStudy: string;
  status: string;
  sourceUniversityId: string;
  sourceUniversityName: string;
  sourceUniversityAbbreviation: string;
  appliedAt: string | null;
};

type UniversityGroup = {
  universityId: string;
  universityName: string;
  universityAbbreviation: string;
  universityLogoUrl: string | null;
  isCaoGroup: boolean;
  programmes: AppProgramme[];
};

type Props = {
  universityGroups: UniversityGroup[];
  aps: number;
  studentSubjects: StudentSubject[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DONE_STATUSES = new Set(["submitted", "accepted", "rejected", "waitlisted"]);

function deriveStatus(programmes: AppProgramme[]): "not_started" | "in_progress" | "completed" {
  if (programmes.length === 0) return "not_started";

  const statuses = programmes.map((p) => p.status ?? "planning");

  // If any programme has reached a terminal/submitted state → Completed
  if (statuses.some((s) => DONE_STATUSES.has(s))) return "completed";

  // If any programme has been started by the email agent → In Progress
  if (statuses.some((s) => s === "in_progress")) return "in_progress";

  // Everything is still planning — nothing detected yet
  return "not_started";
}

const STATUS_CONFIG = {
  not_started: { label: "Not Started",  badge: "bg-gray-100 text-gray-500",   border: "border-l-gray-300" },
  in_progress: { label: "In Progress",  badge: "bg-blue-100 text-blue-600",   border: "border-l-blue-500" },
  completed:   { label: "Completed",    badge: "bg-green-100 text-green-700", border: "border-l-green-500" },
};

const ABBR_COLORS: Record<string, string> = {
  UWC: "bg-teal-600", SU: "bg-red-700", UP: "bg-blue-800", NWU: "bg-yellow-600",
  CPUT: "bg-blue-600", UCT: "bg-sky-700", WITS: "bg-blue-700", UJ: "bg-orange-600",
  DUT: "bg-green-700", MUT: "bg-purple-700", TUT: "bg-rose-600", VUT: "bg-indigo-700",
  UNISA: "bg-gray-700", RU: "bg-amber-700", UFH: "bg-emerald-700", WSU: "bg-cyan-700",
  UKZN: "bg-violet-700", UL: "bg-lime-700", SMU: "bg-orange-700", NMU: "bg-teal-700",
};

function abbrColor(abbr: string) {
  return ABBR_COLORS[abbr] ?? "bg-gray-600";
}

function UniversityAvatar({
  abbreviation,
  logoUrl,
  imgClassName,
  fallbackClassName,
  textClassName,
}: {
  abbreviation: string;
  logoUrl: string | null;
  imgClassName: string;
  fallbackClassName: string;
  textClassName: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!logoUrl || failed) {
    return (
      <div className={fallbackClassName}>
        <span className={textClassName}>{abbreviation}</span>
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={abbreviation}
      className={imgClassName}
      onError={() => setFailed(true)}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardDetailClient({ universityGroups, aps, studentSubjects }: Props) {
  const router = useRouter();
  const [panelStep, setPanelStep] = useState<"closed" | "pick-uni" | "pick-programmes">("closed");
  const [isPanelMounted, setIsPanelMounted] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [universities, setUniversities] = useState<{ id: string; name: string; abbreviation: string | null }[]>([]);
  const [selectedUni, setSelectedUni] = useState<{ id: string; name: string; abbreviation: string | null } | null>(null);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<Set<string>>(new Set());
  const [programmeFacultyFilter, setProgrammeFacultyFilter] = useState<string>("all");
  const [uniSearch, setUniSearch] = useState("");
  const [progSearch, setProgSearch] = useState("");
  const [loadingProgrammes, setLoadingProgrammes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [groupsState, setGroupsState] = useState<UniversityGroup[]>(universityGroups);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setGroupsState(universityGroups);
  }, [universityGroups]);

  // Already-added faculty IDs (to prevent duplicates)
  const addedFacultyIds = new Set(groupsState.flatMap((g) => g.programmes.map((p) => p.facultyId)));

  const caoGroup = groupsState.find((group) => group.isCaoGroup);
  const caoUsedChoices = caoGroup?.programmes.length ?? 0;

  const displayedGroups = [...groupsState].sort((a, b) => Number(b.isCaoGroup) - Number(a.isCaoGroup));

  const selectedAbbreviation = normalizeUniversityAbbr(selectedUni?.abbreviation);
  const selectedIsKzn = isKznCaoUniversity(selectedAbbreviation);
  const selectedLimit = selectedUni ? getUniversityChoiceLimit(selectedUni.abbreviation) : null;
  const selectedCurrentChoices = selectedUni
    ? selectedIsKzn
      ? caoUsedChoices
      : (groupsState.find((group) => group.universityId === selectedUni.id)?.programmes.length ?? 0)
    : 0;
  const selectedRemainingChoices = selectedLimit === null ? null : Math.max(0, selectedLimit - selectedCurrentChoices);

  // Track if a university already has entries (for the "add more" label)

  // Load universities when panel opens
  useEffect(() => {
    if (panelStep !== "pick-uni") return;
    fetch("/api/programmes/universities")
      .then((r) => r.json())
      .then((data: { id: string; name: string; abbreviation: string | null }[]) => {
        // Some seeds contain duplicate university rows; keep one per institution.
        const unique = new Map<string, { id: string; name: string; abbreviation: string | null }>();
        for (const uni of data || []) {
          const key = (uni.abbreviation || uni.name).trim().toLowerCase();
          if (!unique.has(key)) unique.set(key, uni);
        }
        setUniversities(Array.from(unique.values()));
      })
      .catch(() => {});
  }, [panelStep]);

  // Load programmes for selected university
  useEffect(() => {
    if (!selectedUni) return;
    setLoadingProgrammes(true);
    fetch(`/api/programmes?universityId=${selectedUni.id}`)
      .then((r) => r.json())
      .then((data: Programme[] | { error?: string }) => {
        if (!Array.isArray(data)) {
          setProgrammes([]);
          setLoadingProgrammes(false);
          return;
        }

        const unique = new Map<string, Programme>();
        for (const programme of data) {
          const key = [
            selectedUni.id,
            programme.name,
            programme.fieldOfStudy ?? "",
            programme.qualificationType ?? "",
          ]
            .map((value) => String(value ?? "").trim().toLowerCase())
            .join("|");

          if (!unique.has(key)) unique.set(key, programme);
        }

        setProgrammes(Array.from(unique.values()));
        setLoadingProgrammes(false);
      })
      .catch(() => setLoadingProgrammes(false));
  }, [selectedUni]);

  function openPanel() {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setUniSearch("");
    setProgSearch("");
    setProgrammeFacultyFilter("all");
    setSaveFeedback(null);
    setSelectedUni(null);
    setProgrammes([]);
    setSelectedFacultyIds(new Set());
    setIsPanelMounted(true);
    setPanelStep("pick-uni");
    requestAnimationFrame(() => setIsPanelOpen(true));
  }

  function closePanel() {
    setIsPanelOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      setPanelStep("closed");
      setIsPanelMounted(false);
      closeTimerRef.current = null;
    }, 220);
  }

  function pickUniversity(uni: { id: string; name: string; abbreviation: string | null }) {
    setSelectedUni(uni);
    setProgSearch("");
    setProgrammeFacultyFilter("all");
    setSaveFeedback(null);
    setSelectedFacultyIds(new Set());
    setPanelStep("pick-programmes");
  }

  function toggleFaculty(id: string) {
    setSelectedFacultyIds((prev) => {
      const isAlreadySelected = prev.has(id);

      if (!isAlreadySelected && selectedRemainingChoices !== null && prev.size >= selectedRemainingChoices) {
        const targetLabel = selectedIsKzn ? "CAO" : (selectedUni?.name || "this university");
        setSaveFeedback(`Limit reached for ${targetLabel}.`);
        return prev;
      }

      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      if (next.size === 0) setSaveFeedback(null);
      return next;
    });
  }

  async function saveApplications() {
    if (selectedFacultyIds.size === 0 || !selectedUni) return;
    setSaving(true);
    setSaveFeedback(null);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facultyIds: Array.from(selectedFacultyIds),
          universityId: selectedUni.id,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setSaveFeedback(payload?.error || "Could not add programme right now. Please try again.");
        return;
      }

      if ((payload?.added ?? 0) === 0) {
        setSaveFeedback("These programmes were already in your applications.");
        return;
      }

      closePanel();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Qualification check for programmes in the panel
  const qualResults = programmes.length
    ? checkQualifications(programmes, aps, studentSubjects)
    : [];

  const facultyOptions = Array.from(
    new Set(programmes.map((p) => p.fieldOfStudy?.trim() || "Other"))
  ).sort((a, b) => a.localeCompare(b));

  const filteredQualResults = qualResults.filter((r) => {
    const programmeFaculty = r.programme.fieldOfStudy?.trim() || "Other";
    const matchesFaculty = programmeFacultyFilter === "all" || programmeFaculty === programmeFacultyFilter;
    const matchesSearch =
      r.programme.name.toLowerCase().includes(progSearch.toLowerCase()) ||
      r.programme.fieldOfStudy?.toLowerCase().includes(progSearch.toLowerCase());

    return matchesFaculty && matchesSearch;
  });

  const filteredUniversities = universities.filter((u) =>
    u.name.toLowerCase().includes(uniSearch.toLowerCase()) ||
    (u.abbreviation || "").toLowerCase().includes(uniSearch.toLowerCase())
  );

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fff9f2]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_10%_10%,rgba(251,146,60,0.18),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_40%_at_92%_15%,rgba(56,189,248,0.10),transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-6 md:px-6 md:pt-8">
        {/* Header */}
        <div className="rounded-3xl border border-orange-100 bg-white/90 p-4 shadow-[0_14px_40px_rgba(249,115,22,0.12)] md:p-5">
          <button
            onClick={handleBack}
            className="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft size={16} />
            Back
          </button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900">My Applications</h1>
              <p className="mt-1 text-sm font-medium text-gray-500">Select universities and programmes to apply to</p>
            </div>
            <button
              onClick={openPanel}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-transform active:scale-95"
            >
              <Plus size={16} />
              Add
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-orange-50 px-3 py-2 text-xs text-orange-700">
            <span className="font-semibold">{displayedGroups.length}</span>
            <span>institution{displayedGroups.length !== 1 ? "s" : ""} shown</span>
          </div>
        </div>

        {/* University cards */}
        <div className="mt-4">
          {displayedGroups.length === 0 ? (
            <div className="mt-2 rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm">
              <p className="mb-3 text-4xl">🎓</p>
              <p className="text-base font-bold text-gray-800">No institutions yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-gray-400">
                Tap <span className="font-semibold text-orange-500">+ Add</span> to pick universities and programmes you want to apply to.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {displayedGroups.map((group) => (
                <UniversityCard
                  key={group.universityId}
                  group={group}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Add University panel ── */}
      {isPanelMounted && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className={[
              "absolute inset-0 transition-opacity duration-200",
              isPanelOpen ? "bg-black/40" : "bg-black/0",
            ].join(" ")}
            onClick={closePanel}
          />

          {/* Right drawer */}
          <div
            className={[
              "relative bg-white h-full w-[92vw] sm:w-170 max-w-full rounded-l-3xl flex flex-col shadow-2xl border-l border-gray-100",
              "transition-transform duration-300 ease-out",
              isPanelOpen ? "translate-x-0" : "translate-x-full",
            ].join(" ")}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                {panelStep === "pick-programmes" && (
                  <button onClick={() => setPanelStep("pick-uni")} className="p-1.5 rounded-lg bg-gray-100 text-gray-500">
                    <ChevronLeft size={18} />
                  </button>
                )}
                <div>
                  <h2 className="font-extrabold text-gray-900 text-base">
                    {panelStep === "pick-uni" ? "Choose a University" : selectedIsKzn ? `${selectedUni?.name} (CAO pool)` : selectedUni?.name}
                  </h2>
                  {panelStep === "pick-programmes" && (
                    <p className="text-xs text-gray-400 mt-0.5">Select programmes to apply for</p>
                  )}
                </div>
              </div>
              <button onClick={closePanel} className="p-2 rounded-xl bg-gray-100 text-gray-500">
                <X size={18} />
              </button>
            </div>

            {/* Step 1 — Pick university */}
            {panelStep === "pick-uni" && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-5 pt-3 pb-2 shrink-0">
                  <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
                    <Search size={15} className="text-gray-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search universities..."
                      value={uniSearch}
                      onChange={(e) => setUniSearch(e.target.value)}
                      className="bg-transparent text-sm flex-1 outline-none text-gray-800 placeholder:text-gray-400"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 px-5 pb-6 space-y-2 pt-2">
                  {filteredUniversities.map((uni) => {
                    const alreadyAdded = groupsState.some((g) => g.universityId === uni.id);
                    const logoUrl = getUniversityLogo(uni.abbreviation || "");
                    const isKznUni = isKznCaoUniversity(uni.abbreviation);
                    const choiceLimit = getUniversityChoiceLimit(uni.abbreviation);
                    const usedChoices = isKznUni
                      ? caoUsedChoices
                      : (groupsState.find((g) => g.universityId === uni.id)?.programmes.length ?? 0);
                    const limitLabel = choiceLimit === null
                      ? "No fixed limit"
                      : `${usedChoices}/${choiceLimit} used`;
                    return (
                      <button
                        key={uni.id}
                        onClick={() => pickUniversity(uni)}
                        className="w-full flex items-center gap-4 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-left hover:border-orange-200 hover:bg-orange-50/50 transition-colors"
                      >
                        <UniversityAvatar
                          abbreviation={uni.abbreviation || uni.name.slice(0, 4).toUpperCase()}
                          logoUrl={logoUrl}
                          imgClassName="w-11 h-11 rounded-xl object-contain bg-gray-50 border border-gray-100 p-1 shrink-0"
                          fallbackClassName={`w-11 h-11 rounded-xl ${abbrColor(uni.abbreviation || "") } flex items-center justify-center shrink-0`}
                          textClassName="text-white font-black text-xs"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{uni.name}</p>
                          <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                            {isKznUni ? "CAO pool" : "Direct"} · {limitLabel}
                          </p>
                          {alreadyAdded && !isKznUni && (
                            <p className="text-[11px] text-orange-500 font-medium mt-0.5">Already added · add more programmes</p>
                          )}
                        </div>
                        <ChevronRight size={16} className="text-gray-300 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2 — Pick programmes */}
            {panelStep === "pick-programmes" && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="px-5 pt-3 pb-2 shrink-0">
                  <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2.5">
                    <Search size={15} className="text-gray-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search programmes..."
                      value={progSearch}
                      onChange={(e) => setProgSearch(e.target.value)}
                      className="bg-transparent text-sm flex-1 outline-none text-gray-800 placeholder:text-gray-400"
                    />
                  </div>
                  {selectedLimit !== null && (
                    <div className="mt-2 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700">
                      {selectedIsKzn ? "CAO limit" : "University limit"}: {selectedCurrentChoices}/{selectedLimit} used · {selectedRemainingChoices} remaining
                    </div>
                  )}
                  <div className="mt-3 overflow-x-auto">
                    <div className="flex gap-1.5 min-w-max">
                      <button
                        onClick={() => setProgrammeFacultyFilter("all")}
                        className={[
                          "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
                          programmeFacultyFilter === "all"
                            ? "bg-orange-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                        ].join(" ")}
                      >
                        All Faculties
                      </button>
                      {facultyOptions.map((faculty) => (
                        <button
                          key={faculty}
                          onClick={() => setProgrammeFacultyFilter(faculty)}
                          className={[
                            "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
                            programmeFacultyFilter === faculty
                              ? "bg-orange-500 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                          ].join(" ")}
                        >
                          {faculty}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 px-5 pb-2 space-y-2 pt-1">
                  {loadingProgrammes ? (
                    <div className="space-y-2 pt-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
                      ))}
                    </div>
                  ) : filteredQualResults.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm pt-8">No programmes found</p>
                  ) : (
                    filteredQualResults.map(({ programme, status, overallMessage }) => {
                      const alreadyAdded = addedFacultyIds.has(programme.id);
                      const selected = selectedFacultyIds.has(programme.id);
                      const wouldExceedLimit =
                        !alreadyAdded &&
                        !selected &&
                        selectedRemainingChoices !== null &&
                        selectedFacultyIds.size >= selectedRemainingChoices;
                      const qualColor =
                        status === "qualified" ? "border-green-200 bg-green-50/50"
                        : status === "marginal" ? "border-amber-200 bg-amber-50/50"
                        : "border-red-100 bg-red-50/30";
                      const qualBadge =
                        status === "qualified" ? "bg-green-100 text-green-700"
                        : status === "marginal" ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-600";
                      const qualLabel =
                        status === "qualified" ? "Qualifies" : status === "marginal" ? "Marginal" : "Does not qualify";

                      return (
                        <button
                          key={programme.id}
                          onClick={() => !alreadyAdded && toggleFaculty(programme.id)}
                          disabled={alreadyAdded || wouldExceedLimit}
                          className={[
                            "w-full text-left border rounded-2xl px-4 py-3.5 transition-all",
                            alreadyAdded ? "opacity-50 cursor-not-allowed bg-gray-50 border-gray-100"
                            : wouldExceedLimit ? "opacity-60 cursor-not-allowed bg-gray-50 border-gray-100"
                            : selected ? "border-orange-400 bg-orange-50 ring-1 ring-orange-300"
                            : qualColor,
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 text-sm leading-snug">{programme.name}</p>
                              <p className="text-[11px] text-gray-400 mt-0.5">{programme.fieldOfStudy}</p>
                              <p className="text-[11px] text-gray-500 mt-1">APS required: <span className="font-bold">{programme.apsMinimum}</span></p>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${qualBadge}`}>
                                {alreadyAdded ? "Added" : wouldExceedLimit ? "Limit reached" : qualLabel}
                              </span>
                              {!alreadyAdded && !wouldExceedLimit && (
                                <div className={[
                                  "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                                  selected ? "bg-orange-500 border-orange-500" : "border-gray-300",
                                ].join(" ")}>
                                  {selected && <Check size={12} className="text-white" strokeWidth={3} />}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Save button */}
                <div className="px-5 py-4 border-t border-gray-100 bg-white shrink-0">
                  {saveFeedback && (
                    <p className="text-xs text-red-500 mb-2">{saveFeedback}</p>
                  )}
                  <button
                    onClick={saveApplications}
                    disabled={selectedFacultyIds.size === 0 || saving}
                    className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-2xl disabled:opacity-40 active:scale-95 transition-all"
                  >
                    {saving
                      ? "Saving..."
                      : `Add ${selectedFacultyIds.size > 0 ? `${selectedFacultyIds.size} ` : ""}Programme${selectedFacultyIds.size !== 1 ? "s" : ""}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── University Card ──────────────────────────────────────────────────────────

function UniversityCard({
  group,
}: {
  group: UniversityGroup;
}) {
  const router = useRouter();
  const status = deriveStatus(group.programmes);
  const config = STATUS_CONFIG[status];
  const total = group.programmes.length;
  const maxChoices = group.isCaoGroup
    ? KZN_CAO_MAX_CHOICES
    : (getUniversityChoiceLimit(group.universityAbbreviation) ?? total);
  const progressPct = maxChoices > 0 ? Math.min(100, Math.round((total / maxChoices) * 100)) : 0;
  const progressColor = "bg-blue-500";
  const logoUrl = getUniversityLogo(group.universityAbbreviation, group.universityLogoUrl);

  return (
    <div
      className={[
        `block rounded-3xl border-l-4 border p-5 shadow-sm ${config.border}`,
        "bg-white/95 border-gray-100 overflow-hidden",
      ].join(" ")}
    >
      {/* Top row */}
      <div className="flex items-start gap-3 mb-4">
        <UniversityAvatar
          abbreviation={group.universityAbbreviation}
          logoUrl={logoUrl}
          imgClassName="w-12 h-12 rounded-xl object-contain bg-gray-50 border border-gray-100 p-1 shrink-0"
          fallbackClassName={`w-12 h-12 rounded-xl ${abbrColor(group.universityAbbreviation)} flex items-center justify-center shrink-0`}
          textClassName="text-white font-black text-[11px] text-center leading-tight px-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold leading-snug text-gray-900">{group.universityName}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 ${config.badge}`}>
              {config.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {`${total} programme${total !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl bg-gray-50 px-3 py-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-gray-400 font-medium">Choices</p>
          <p className="text-xs font-bold text-gray-700">{total}/{maxChoices} used</p>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* View details */}
      <button
        type="button"
        onClick={() => router.push(`/dashboard/detail/${group.universityId}`)}
        className="mt-4 flex w-full items-center justify-between"
      >
        <span className="text-sm font-semibold text-orange-500">View details</span>
        <ChevronRight size={16} className="text-orange-400" />
      </button>
    </div>
  );
}
