"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock3, Sparkles } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { ESSENTIAL_BILLING_OPTIONS, type BillingTermMonths } from "@/lib/billing-options";

export default function EssentialPlanPage() {
  const router = useRouter();
  const [selectedMonths, setSelectedMonths] = useState<BillingTermMonths>(3);

  const selectedOption = useMemo(
    () => ESSENTIAL_BILLING_OPTIONS.find((option) => option.months === selectedMonths) ?? ESSENTIAL_BILLING_OPTIONS[0],
    [selectedMonths]
  );

  function handleContinue() {
    router.push(`/payment?plan=essential&term=${selectedMonths}`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff9f2]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(65%_55%_at_12%_10%,rgba(251,146,60,0.18),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_45%_at_90%_15%,rgba(56,189,248,0.10),transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/plans"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white/90 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-white"
          >
            <ArrowLeft size={16} />
            Back
          </Link>

          <Logo variant="lockup" size="md" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
              <Sparkles size={14} />
              Essential plan
            </div>

            <h1 className="mt-4 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
              Choose your Essential term
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
              Select how long you want access for. The 3-month option is shown on the main plans page, and longer terms give you better value.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {ESSENTIAL_BILLING_OPTIONS.map((option) => {
                const isSelected = option.months === selectedMonths;
                return (
                  <button
                    key={option.months}
                    type="button"
                    onClick={() => setSelectedMonths(option.months)}
                    className={`rounded-3xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-50 shadow-[0_10px_28px_rgba(249,115,22,0.16)]"
                        : "border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{option.label}</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{option.price}</p>
                      </div>
                      {isSelected && <Check className="text-orange-500" size={18} />}
                    </div>

                    <p className="mt-3 text-sm text-slate-600">{option.description}</p>

                    {option.recommended && (
                      <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                        <Clock3 size={10} />
                        Recommended
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Selected billing term</p>
            <h2 className="mt-2 text-2xl font-black text-gray-900">{selectedOption.label}</h2>
            <p className="mt-1 text-sm text-gray-500">{selectedOption.description}</p>

            <div className="mt-6 rounded-2xl border border-gray-100 bg-[#fffaf5] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Amount due</p>
              <p className="mt-2 text-4xl font-black tracking-tight text-gray-900">{selectedOption.price}</p>
              <p className="mt-1 text-sm text-gray-500">One-time payment for {selectedOption.label}</p>
            </div>

            <div className="mt-5 space-y-3 text-sm text-gray-600">
              <p className="flex gap-2"><Check size={16} className="mt-0.5 text-orange-500" /> Unlimited application tracking</p>
              <p className="flex gap-2"><Check size={16} className="mt-0.5 text-orange-500" /> Bursary matching and discovery</p>
              <p className="flex gap-2"><Check size={16} className="mt-0.5 text-orange-500" /> Document vault and AI Coach guidance</p>
            </div>

            <button
              type="button"
              onClick={handleContinue}
              className="mt-6 w-full rounded-2xl bg-orange-500 py-4 text-base font-semibold text-white transition-colors hover:bg-orange-600"
            >
              Continue to payment
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}