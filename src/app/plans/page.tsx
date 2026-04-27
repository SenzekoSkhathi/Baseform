"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Lock, Zap, ChevronLeft } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_PLANS, GRADE11_PLANS, type PublicPlan } from "@/lib/site-config/defaults";
import { cacheGradeYear, readCachedGradeYear } from "@/lib/onboarding/grade-year";

type PlanId = "free" | "essential" | "pro" | "ultra";

type Plan = {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  available: boolean;
  recommended: boolean;
};

function toPlanId(value: string): PlanId {
  if (value === "free" || value === "essential" || value === "pro" || value === "ultra") {
    return value;
  }
  return "essential";
}

function mapPlans(rows: PublicPlan[]): Plan[] {
  return rows.map((plan) => ({
    id: toPlanId(plan.slug),
    name: plan.name,
    price: plan.price,
    period: plan.period,
    tagline: plan.tagline,
    features: plan.features,
    available: plan.available,
    recommended: plan.recommended,
  }));
}

function PlansPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawParamPlan = searchParams.get("plan");
  const paramPlan: PlanId | null = rawParamPlan ? toPlanId(rawParamPlan) : null;

  const [plans, setPlans] = useState<Plan[]>(() => mapPlans(DEFAULT_PLANS));
  // Fall back to the recommended plan from the default pool so that, before
  // anything else loads, the highlighted card already matches the badge.
  const initialRecommendedSlug =
    DEFAULT_PLANS.find((p) => p.recommended && p.available)?.slug ??
    DEFAULT_PLANS.find((p) => p.available)?.slug;
  const initialSelected: PlanId = paramPlan ?? (initialRecommendedSlug ? toPlanId(initialRecommendedSlug) : "free");
  const [selected, setSelected] = useState<PlanId>(initialSelected);
  // Tracks whether the user (or URL) has pinned a choice. When false, we keep
  // re-picking the recommended plan as the active pool changes (e.g. Grade 11
  // resolves, or site-config loads a different recommendation).
  const [userPicked, setUserPicked] = useState<boolean>(paramPlan !== null);
  const [loading, setLoading] = useState(false);
  // gradeYear starts null and resolves once auth + profile fetch land. We
  // intentionally do NOT seed synchronously from a shared cache — that leaked
  // grade between users on shared devices.
  const [gradeYear, setGradeYear] = useState<string | null>(null);
  const [gradeResolved, setGradeResolved] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    async function resolveGradeYear() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Per-user cache: safe to read once we know who the user is.
          const cached = readCachedGradeYear(user.id);
          if (cached && !cancelled) setGradeYear(cached);

          const { data: profile } = await supabase
            .from("profiles")
            .select("grade_year")
            .eq("id", user.id)
            .maybeSingle();
          if (cancelled) return;
          const grade = profile?.grade_year ?? null;
          setGradeYear(grade);
          cacheGradeYear(user.id, grade);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setGradeResolved(true);
      }
    }
    void resolveGradeYear();
    return () => { cancelled = true; };
  }, []);

  const isGrade11 = gradeYear === "Grade 11";

  // Grade 11 users see a different plan set optimised for planning/preparation
  const activePlans = isGrade11 ? GRADE11_PLANS : plans;

  const selectedPlan = useMemo(
    () => activePlans.find((p) => p.id === selected) ?? activePlans[0],
    [activePlans, selected]
  );

  // Keep the selection aligned with the recommended plan until the user picks
  // one explicitly. Re-runs when the pool flips (Grade 11 resolves, config loads).
  useEffect(() => {
    if (userPicked) return;
    const recommended = activePlans.find((p) => p.recommended && p.available)?.id;
    const fallback = activePlans.find((p) => p.available)?.id;
    const next = recommended ?? fallback;
    if (next && next !== selected) setSelected(toPlanId(String(next)));
  }, [activePlans, userPicked, selected]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlanConfig() {
      try {
        const res = await fetch("/api/site-config", { signal: controller.signal });
        if (!res.ok) return;
        const payload = await res.json();
        const incoming = Array.isArray(payload?.plans)
          ? mapPlans(payload.plans as PublicPlan[])
          : [];
        if (incoming.length === 0) return;

        setPlans(incoming);
        // Don't touch `selected` here — the recommended-sync effect handles it
        // when the user hasn't picked, and we must not override an explicit pick.
      } catch {
        // Keep defaults when config fetch fails.
      }
    }

    void loadPlanConfig();

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleContinue() {
    setLoading(true);

    if (selected === "free") {
      const res = await fetch("/api/billing/downgrade", { method: "POST" });
      if (!res.ok) {
        // Not authed — send to login first
        router.push(`/login?next=${encodeURIComponent("/plans?plan=free")}`);
        return;
      }
      router.push("/dashboard");
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/plans?plan=${selected}`)}`);
      return;
    }

    // Grade 12: essential plan has its own dedicated page
    if (!isGrade11 && selected === "essential") {
      router.push("/plans/essential");
      return;
    }

    router.push(`/payment?plan=${selected}`);
  }

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/reveal");
  }

  // If we have no cached grade year and the profile fetch hasn't resolved yet,
  // show a skeleton instead of rendering Grade 12 defaults momentarily.
  if (!gradeResolved && gradeYear === null) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#fff9f2]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(65%_55%_at_12%_10%,rgba(251,146,60,0.18),transparent_62%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(50%_45%_at_90%_15%,rgba(56,189,248,0.10),transparent_70%)]" />
        </div>
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4">
          <div className="flex items-center gap-3 text-slate-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-orange-300 border-t-orange-500" />
            <span className="text-sm font-medium">Loading your plans…</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff9f2]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(65%_55%_at_12%_10%,rgba(251,146,60,0.18),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_45%_at_90%_15%,rgba(56,189,248,0.10),transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:grid lg:grid-cols-12 lg:gap-8 lg:px-10 lg:py-10">
        <section className="lg:col-span-4">
          <div className="lg:sticky lg:top-8">
            <button
              onClick={handleBack}
              className="mb-4 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/85 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white"
            >
              <ChevronLeft size={16} />
              Back
            </button>

            <Logo variant="lockup" size="md" className="mb-7" />

            <h1 className="text-3xl font-black leading-tight text-slate-900">
              {isGrade11 ? "Choose your planning tier" : "Choose your plan"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {isGrade11
                ? "Start free and unlock more tools as you prepare. You can upgrade anytime before applications open."
                : "Start free and upgrade when you need more power. You can change your plan anytime."}
            </p>

            {isGrade11 && (
              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Planning Mode</p>
                <p className="mt-1 text-sm text-blue-800">
                  Your account is set up for Grade 11. You&apos;ll get your projected APS, target programmes, subject gap analysis, and planning tools — all designed to get you ready for Grade 12 applications.
                </p>
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-orange-100 bg-white/90 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Selected plan</p>
              <p className="mt-1 text-xl font-black text-slate-900">{selectedPlan?.name}</p>
              <p className="text-sm text-slate-500">
                {selectedPlan?.price}
                {selectedPlan?.period}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 lg:col-span-8 lg:mt-0">
          <div className="grid gap-3 sm:grid-cols-2">
            {activePlans.map((plan) => {
              const isSelected = selected === plan.id;
              const isLocked = !plan.available;

              return (
                <button
                  key={plan.id}
                  onClick={() => {
                    if (!plan.available) return;
                    // Grade 12 essential has its own page; all other plans just select
                    if (!isGrade11 && plan.id === "essential") {
                      router.push("/plans/essential");
                      return;
                    }
                    setSelected(plan.id as PlanId);
                    setUserPicked(true);
                  }}
                  disabled={isLocked}
                  className={`w-full text-left rounded-3xl border p-4 transition-all sm:p-5 ${
                    isLocked
                      ? "border-gray-200 bg-white/55 opacity-70 cursor-not-allowed"
                      : isSelected
                      ? "border-orange-500 bg-orange-50/80 shadow-[0_10px_28px_rgba(249,115,22,0.18)]"
                      : "border-gray-200 bg-white/90 hover:border-orange-200 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold text-slate-900">{plan.name}</span>

                        {plan.recommended && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                            <Zap size={10} />
                            Recommended
                          </span>
                        )}

                        {isLocked && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                            <Lock size={10} />
                            {plan.tagline}
                          </span>
                        )}

                        {!isLocked && !plan.recommended && (
                          <span className="text-xs text-gray-400">{plan.tagline}</span>
                        )}
                      </div>

                      <div className="mb-3 flex items-baseline gap-0.5">
                        <span className="text-3xl font-black leading-none text-slate-900">{plan.price}</span>
                        <span className="text-sm text-gray-400">{plan.period}</span>
                      </div>

                      <ul className="space-y-1.5">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                            <Check
                              size={14}
                              className={`mt-0.5 shrink-0 ${
                                isSelected ? "text-orange-500" : "text-gray-300"
                              }`}
                            />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {!isLocked && (
                      <div
                        className={`mt-1 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected ? "border-orange-500 bg-orange-500" : "border-gray-300"
                        }`}
                      >
                        {isSelected && <div className="h-2 w-2 rounded-full bg-white" />}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-3xl border border-orange-100 bg-white/95 p-4 shadow-sm sm:p-5">
            <button
              onClick={handleContinue}
              disabled={loading}
              className="w-full rounded-2xl bg-orange-500 py-4 text-base font-semibold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {loading
                ? "Setting up your account..."
                : `Continue with ${selectedPlan?.name ?? "selected plan"}`}
            </button>

            <p className="mt-3 text-center text-xs text-slate-500">
              No credit card required. Cancel or change anytime.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function PlansPage() {
  return (
    <Suspense>
      <PlansPageInner />
    </Suspense>
  );
}
