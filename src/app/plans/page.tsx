"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, Zap, ChevronLeft } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_PLANS, type PublicPlan } from "@/lib/site-config/defaults";

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

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>(() => mapPlans(DEFAULT_PLANS));
  const [selected, setSelected] = useState<PlanId>("essential");
  const [loading, setLoading] = useState(false);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selected) ?? plans[0],
    [plans, selected]
  );

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

        setSelected((prev) => {
          const stillExists = incoming.some((p) => p.id === prev);
          if (stillExists) return prev;
          const recommended = incoming.find((p) => p.recommended && p.available)?.id;
          const available = incoming.find((p) => p.available)?.id;
          return recommended ?? available ?? incoming[0].id;
        });
      } catch {
        // Keep defaults when config fetch fails.
      }
    }

    void loadPlanConfig();

    return () => controller.abort();
  }, []);

  async function handleContinue() {
    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/plans?plan=${selected}`)}`);
      return;
    }

    if (selected === "free") {
      await supabase
        .from("profiles")
        .update({ tier: "free" })
        .eq("id", user.id);
      router.push("/dashboard");
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
              Choose your plan
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Start free and upgrade when you need more power. You can change your plan anytime.
            </p>

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
            {plans.map((plan) => {
              const isSelected = selected === plan.id;
              const isLocked = !plan.available;

              return (
                <button
                  key={plan.id}
                  onClick={() => plan.available && setSelected(plan.id)}
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
