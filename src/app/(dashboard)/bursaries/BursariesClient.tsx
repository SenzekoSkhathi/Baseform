"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ExternalLink, Search, Trophy, Bookmark, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

type Bursary = {
  id?: string | number;
  title?: string;
  provider?: string;
  description?: string;
  amount_per_year?: number | null;
  minimum_aps?: number;
  provinces_eligible?: string[] | string | null;
  fields_of_study?: string[] | string | null;
  requires_financial_need?: boolean | null;
  application_url?: string | null;
  detail_page_url?: string | null;
  application_links?: string[] | string | null;
  closing_date?: string | null;
  funding_value?: string | null;
  eligibility_requirements?: string | null;
  application_instructions?: string | null;
  source_category?: string | null;
  is_active?: boolean;
};

type TrackStatus = "saved" | "applied";

type TrackedBursary = {
  bursary_id: string;
  bursary_name: string;
  status: TrackStatus;
  updated_at: string;
};

type ViewMode = "discover" | "tracked";

type Props = {
  bursaries: Bursary[];
  aps: number;
  province: string | null;
  userId: string;
  initialTracked: TrackedBursary[];
};

function getBursaryId(bursary: Bursary, index: number) {
  return String(bursary.id ?? bursary.title ?? `bursary-${index}`);
}

function formatDateLabel(dateText: string | null): string {
  if (!dateText) return "No deadline listed";
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return "No deadline listed";
  return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function daysToDeadline(dateText: string | null): number | null {
  if (!dateText) return null;
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

function normalizeTextList(value: unknown, fallback: string | null = null): string | null {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return items.length ? items.join(", ") : fallback;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;

    // Handle JSON-serialized arrays from inconsistent sources.
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const items = parsed
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter(Boolean);
          return items.length ? items.join(", ") : fallback;
        }
      } catch {
        // Fall through and use raw text.
      }
    }

    return trimmed;
  }

  return fallback;
}

export default function BursariesClient({ bursaries, aps, province, initialTracked }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<ViewMode>("discover");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Keyed by bursary_id for O(1) lookups
  const [trackedMap, setTrackedMap] = useState<Record<string, TrackedBursary>>(() =>
    Object.fromEntries(initialTracked.map((t) => [t.bursary_id, t]))
  );

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard");
  }

  async function updateTracked(id: string, name: string, status: TrackStatus) {
    // Optimistic update
    setTrackedMap((prev) => ({
      ...prev,
      [id]: { bursary_id: id, bursary_name: name, status, updated_at: new Date().toISOString() },
    }));

    startTransition(async () => {
      await fetch("/api/bursary-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bursaryId: id, bursaryName: name, status }),
      });
    });
  }

  async function removeTracked(id: string) {
    // Optimistic update
    setTrackedMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

    startTransition(async () => {
      await fetch("/api/bursary-tracker", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bursaryId: id }),
      });
    });
  }

  const normalized = useMemo(() => {
    return bursaries.map((bursary, index) => {
      const id = getBursaryId(bursary, index);
      const name = bursary.title ?? "Bursary";
      const description = bursary.description ?? null;
      const amount = bursary.amount_per_year != null
        ? `R ${bursary.amount_per_year.toLocaleString("en-ZA")} / year`
        : null;
      const deadline = bursary.closing_date ?? null;
      const links = Array.isArray(bursary.application_links)
        ? bursary.application_links.filter((item): item is string => typeof item === "string")
        : [];
      const firstExternalLink = links.find((link) => link && !link.startsWith("mailto:")) ?? null;
      const applicationWebsite = firstExternalLink ?? bursary.application_url ?? null;
      const sourceWebsite = bursary.detail_page_url ?? null;
      const website = applicationWebsite ?? sourceWebsite;
      const minAps = bursary.minimum_aps ?? null;
      const provinces = normalizeTextList(bursary.provinces_eligible, "All provinces") ?? "All provinces";
      const fieldsOfStudy = normalizeTextList(bursary.fields_of_study, null);
      const needsBased = bursary.requires_financial_need ?? false;
      const provider = bursary.provider ?? null;
      const fundingValue = bursary.funding_value ?? null;
      const eligibility = bursary.eligibility_requirements ?? null;
      const sourceCategory = bursary.source_category ?? null;
      return {
        id,
        name,
        description,
        amount,
        deadline,
        website,
        applicationWebsite,
        sourceWebsite,
        minAps,
        provinces,
        fieldsOfStudy,
        needsBased,
        provider,
        fundingValue,
        eligibility,
        sourceCategory,
      };
    });
  }, [bursaries]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.description ?? "").toLowerCase().includes(q) ||
        (b.provider ?? "").toLowerCase().includes(q) ||
        (b.sourceCategory ?? "").toLowerCase().includes(q) ||
        (b.fieldsOfStudy ?? "").toLowerCase().includes(q)
    );
  }, [normalized, query]);

  const trackedList = useMemo(
    () => searched.filter((b) => Boolean(trackedMap[b.id])),
    [searched, trackedMap]
  );

  const appliedCount = Object.values(trackedMap).filter((item) => item.status === "applied").length;
  const savedCount = Object.values(trackedMap).filter((item) => item.status === "saved").length;

  const activeList = mode === "discover" ? searched : trackedList;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fff9f2]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_10%_8%,rgba(251,146,60,0.18),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_35%_at_92%_14%,rgba(56,189,248,0.10),transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-6 md:px-6 md:pt-8">
        <header className="rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-[0_16px_45px_rgba(249,115,22,0.12)] md:p-6">
          <button
            onClick={handleBack}
            className="mb-3 inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft size={14} />
            Back
          </button>

          <h1 className="text-3xl font-black tracking-tight text-gray-900">Bursaries</h1>
          <p className="mt-1 text-sm font-medium text-gray-500">
            Discover bursaries, apply, and keep track of what you have already submitted.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700">APS {aps}+</span>
            {province && (
              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">{province}</span>
            )}
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600">{bursaries.length} matched</span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
              <p className="text-xs text-gray-400">Matched</p>
              <p className="mt-0.5 text-2xl font-black text-gray-900">{bursaries.length}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
              <p className="text-xs text-gray-400">Saved</p>
              <p className="mt-0.5 text-2xl font-black text-amber-600">{savedCount}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 col-span-2 sm:col-span-1">
              <p className="text-xs text-gray-400">Applied</p>
              <p className="mt-0.5 text-2xl font-black text-green-600">{appliedCount}</p>
            </div>
          </div>
        </header>

        <section className="mt-5 rounded-3xl border border-gray-100 bg-white/95 p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex rounded-2xl bg-gray-100 p-1">
              <button
                onClick={() => setMode("discover")}
                className={[
                  "rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors",
                  mode === "discover" ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-200",
                ].join(" ")}
              >
                Discover bursaries
              </button>
              <button
                onClick={() => setMode("tracked")}
                className={[
                  "rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors",
                  mode === "tracked" ? "bg-orange-500 text-white" : "text-gray-600 hover:bg-gray-200",
                ].join(" ")}
              >
                My tracked bursaries
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <Search size={15} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search bursaries"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 md:w-72"
              />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {activeList.length === 0 ? (
              <div className="mt-2 rounded-2xl border border-gray-100 bg-white p-10 text-center">
                <Trophy size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="font-semibold text-gray-700">
                  {mode === "discover" ? "No bursaries found" : "No tracked bursaries yet"}
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  {mode === "discover"
                    ? "Try adjusting your profile details to unlock more matches."
                    : "Save or apply to bursaries to track them here."}
                </p>
              </div>
            ) : (
              activeList.map((bursary) => {
                const tracked = trackedMap[bursary.id];

                return (
                  <article key={bursary.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold leading-snug text-gray-900">{bursary.name}</h3>
                        {bursary.provider && (
                          <p className="mt-0.5 text-xs font-semibold text-gray-500">{bursary.provider}</p>
                        )}
                        {bursary.fieldsOfStudy && (
                          <p className="mt-0.5 text-xs font-semibold text-orange-500">{bursary.fieldsOfStudy}</p>
                        )}
                      </div>

                      {bursary.website && (
                        <a
                          href={bursary.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-gray-50 p-2 text-gray-400 transition-colors hover:text-gray-700"
                          title="Open bursary website"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {bursary.minAps !== null && (
                        <span className="rounded-lg bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">Min APS: {bursary.minAps}</span>
                      )}
                      {bursary.amount && (
                        <span className="rounded-lg bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">{bursary.amount}</span>
                      )}
                      {bursary.fundingValue && (
                        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Funding details available</span>
                      )}
                      {bursary.sourceCategory && (
                        <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">{bursary.sourceCategory}</span>
                      )}
                      <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">{bursary.provinces}</span>
                      {bursary.needsBased && (
                        <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700">Needs-based</span>
                      )}
                      {tracked?.status === "saved" && (
                        <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                          Saved
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {bursary.applicationWebsite && (
                        <a
                          href={bursary.applicationWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          <ExternalLink size={14} />
                          Open application
                        </a>
                      )}
                      {bursary.sourceWebsite && bursary.sourceWebsite !== bursary.applicationWebsite && (
                        <a
                          href={bursary.sourceWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          <ExternalLink size={14} />
                          View source
                        </a>
                      )}

                      {!tracked || tracked.status === "saved" ? (
                        <button
                          onClick={() => {
                            updateTracked(bursary.id, bursary.name, "applied");
                            const applyTarget = bursary.applicationWebsite ?? bursary.sourceWebsite;
                            if (applyTarget) window.open(applyTarget, "_blank", "noopener,noreferrer");
                          }}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-60"
                        >
                          <CheckCircle2 size={14} />
                          Apply now
                        </button>
                      ) : null}

                      {tracked?.status === "applied" && (
                        <button
                          onClick={() => updateTracked(bursary.id, bursary.name, "saved")}
                          disabled={isPending}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                        >
                          Mark as saved
                        </button>
                      )}

                      {!tracked && (
                        <button
                          onClick={() => updateTracked(bursary.id, bursary.name, "saved")}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-60"
                        >
                          <Bookmark size={14} />
                          Save
                        </button>
                      )}

                      {tracked && (
                        <button
                          onClick={() => removeTracked(bursary.id)}
                          disabled={isPending}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-60"
                        >
                          Remove from tracking
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
