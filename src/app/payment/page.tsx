"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/ui/Logo";
import { DEFAULT_PLANS, GRADE11_PLANS, type PublicPlan } from "@/lib/site-config/defaults";
import {
  ESSENTIAL_BILLING_OPTIONS,
  normalizeBillingTermMonths,
  type BillingTermMonths,
} from "@/lib/billing-options";
import { cacheGradeYear, readCachedGradeYear } from "@/lib/onboarding/grade-year";

declare global {
  interface Window {
    payfast_do_onsite_payment: (
      params: { uuid: string },
      callback?: (result: boolean) => void
    ) => void;
  }
}

type PlanId = "essential" | "pro" | "ultra";

function getEssentialOption(months: BillingTermMonths | null) {
  return ESSENTIAL_BILLING_OPTIONS.find((o) => o.months === months) ?? ESSENTIAL_BILLING_OPTIONS[0];
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load PayFast engine."));
    document.head.appendChild(script);
  });
}

function mapPlans(rows: PublicPlan[]) {
  return rows.reduce<Record<string, PublicPlan>>(
    (acc, p) => ({ ...acc, [p.slug]: p }),
    {}
  );
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  // Seed from the onboarding cache so the order summary doesn't flash the
  // Grade 12 price before the profile fetch resolves.
  const [gradeYear, setGradeYear] = useState<string | null>(() => readCachedGradeYear());
  const [gradeResolved, setGradeResolved] = useState<boolean>(() => readCachedGradeYear() !== null);
  const [planMap, setPlanMap] = useState<Record<string, PublicPlan>>(() =>
    mapPlans(readCachedGradeYear() === "Grade 11" ? GRADE11_PLANS : DEFAULT_PLANS)
  );

  const plan = useMemo(() => {
    const raw = (searchParams.get("plan") ?? "essential") as PlanId;
    return raw === "essential" || raw === "pro" || raw === "ultra" ? raw : "essential";
  }, [searchParams]);

  const term = useMemo(() => {
    if (plan !== "essential") return null;
    return normalizeBillingTermMonths(searchParams.get("term")) ?? 3;
  }, [plan, searchParams]);

  const essentialOption = useMemo(() => getEssentialOption(term), [term]);
  const planData = planMap[plan];

  const displayPrice = useMemo(() => {
    if (plan === "essential") return essentialOption.price;
    return planData?.price ?? "";
  }, [plan, essentialOption, planData]);

  const displayPeriod = useMemo(() => {
    if (plan === "essential") return essentialOption.label;
    return planData?.period ?? "";
  }, [plan, essentialOption, planData]);

  // Resolve grade year from profile, then set the correct plan prices
  useEffect(() => {
    let cancelled = false;
    async function resolveGrade() {
      let grade: string | null = null;
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("grade_year")
            .eq("id", user.id)
            .maybeSingle();
          grade = profile?.grade_year ?? null;
        }
      } catch {
        // fall through
      }

      if (cancelled) return;

      if (grade) {
        setGradeYear(grade);
        cacheGradeYear(grade);
      }

      if (grade === "Grade 11") {
        setPlanMap(mapPlans(GRADE11_PLANS));
        setGradeResolved(true);
        return;
      }

      // Grade 12 / unknown: load from site config
      try {
        const res = await fetch("/api/site-config");
        if (res.ok) {
          const payload = await res.json();
          if (!cancelled && Array.isArray(payload?.plans)) {
            setPlanMap(mapPlans(payload.plans as PublicPlan[]));
          }
        }
      } catch {
        // keep defaults
      }

      if (!cancelled) setGradeResolved(true);
    }
    void resolveGrade();
    return () => { cancelled = true; };
  }, []);

  // PayFast return callback handling
  // Success path is now handled by /payment/success — a dedicated upgrade
  // experience with polling, perks, and proper failure states. We only
  // handle the cancelled/legacy success bounce here for back-compat.
  useEffect(() => {
    const status = searchParams.get("status");
    if (!status) return;

    if (status === "cancelled") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotice("Payment was cancelled. You can try again whenever you are ready.");
      return;
    }

    if (status === "success") {
      // Legacy return_url some old PayFast flows might still use — bounce to
      // the dedicated success page so users get the same experience.
      const params = new URLSearchParams({ plan });
      if (term) params.set("term", String(term));
      router.replace(`/payment/success?${params.toString()}`);
    }
  }, [plan, router, searchParams, term]);

  async function handlePayNow() {
    setLoading(true);
    setError("");
    setNotice("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // 1. Generate PayFast UUID via server
    const res = await fetch("/api/payments/payfast/onsite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, term }),
    });

    const payload = (await res.json().catch(() => null)) as {
      error?: string;
      uuid?: string;
      engineUrl?: string;
    } | null;

    if (!res.ok || !payload?.uuid || !payload.engineUrl) {
      setError(payload?.error ?? "Could not start payment. Please try again.");
      setLoading(false);
      return;
    }

    // 2. Load PayFast engine.js
    try {
      await loadScript(payload.engineUrl);
    } catch {
      setError("Could not load the payment engine. Please refresh and try again.");
      setLoading(false);
      return;
    }

    // 3. Open the PayFast modal.
    // Safety timeout: if the PayFast callback never fires (modal blocked, sandbox
    // issue, network problem) reset the button so the user isn't stuck forever.
    let callbackFired = false;
    const safetyTimer = setTimeout(() => {
      if (!callbackFired) {
        setLoading(false);
        setError(
          "The payment window didn't open. Check that pop-ups aren't blocked and try again."
        );
      }
    }, 30_000);

    window.payfast_do_onsite_payment({ uuid: payload.uuid }, (result) => {
      callbackFired = true;
      clearTimeout(safetyTimer);
      setLoading(false);
      if (result) {
        // Hand off to the dedicated upgrade-success page — it handles polling,
        // perks, animations, and the "still working" / failure states uniformly
        // with the redirect-flow return_url.
        const params = new URLSearchParams({ plan });
        if (term) params.set("term", String(term));
        router.push(`/payment/success?${params.toString()}`);
      } else {
        setNotice("Payment was cancelled. You can try again whenever you are ready.");
      }
    });
  }

  const features = planData?.features ?? [];
  const planName = planData?.name ?? "Essential";

  // Don't render the order summary until we know the grade year, otherwise
  // Grade 11 users briefly see the Grade 12 price on first paint.
  if (!gradeResolved && gradeYear === null) {
    return (
      <main className="min-h-screen w-full bg-[#fff9f2] flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-orange-300 border-t-orange-500" />
          <span className="text-sm font-medium">Loading your plan…</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[#fff9f2] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-4">
        <Logo variant="lockup" size="md" />

        {/* Order summary card */}
        <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-orange-500 px-6 py-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-orange-100">
              Order summary
            </p>
            <p className="mt-1 text-2xl font-black text-white">{planName} Plan</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-white">{displayPrice}</span>
              <span className="text-sm text-orange-200">{displayPeriod}</span>
            </div>
          </div>

          {/* Features */}
          {features.length > 0 && (
            <ul className="px-6 py-5 space-y-2.5">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-gray-700">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orange-100">
                    <Check size={10} className="text-orange-500" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          )}

          {/* Divider + total */}
          <div className="mx-6 border-t border-gray-100" />
          <div className="flex items-center justify-between px-6 py-4">
            <span className="text-sm font-semibold text-gray-500">Total due today</span>
            <span className="text-lg font-black text-gray-900">{displayPrice}</span>
          </div>
        </div>

        {/* Notices */}
        {notice && (
          <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </p>
        )}
        {error && (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handlePayNow}
          disabled={loading}
          className="w-full rounded-2xl bg-orange-500 py-4 text-base font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "Opening payment…" : `Pay ${displayPrice} securely`}
        </button>

        {/* Trust badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <ShieldCheck size={13} className="text-gray-300" />
          Secured by PayFast · 256-bit SSL encryption
        </div>
      </div>
    </main>
  );
}
