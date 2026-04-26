"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { ArrowRight, Check, Sparkles, ShieldCheck, Mail } from "lucide-react";
import { normalizeBillingTermMonths, type BillingTermMonths } from "@/lib/billing-options";

type PlanId = "essential" | "pro" | "ultra";
type Phase = "verifying" | "success" | "slow" | "failed";

const POLL_INTERVAL_MS = 2000;
const SLOW_AFTER_MS = 30_000;
const GIVE_UP_AFTER_MS = 90_000;

const VERIFYING_PHRASES = [
  "Confirming your payment",
  "Notifying our servers",
  "Activating your plan",
  "Loading up your credits",
  "Wrapping up the upgrade",
] as const;

type Perk = { icon: React.ReactNode; title: string; body: string };

function planLabel(plan: PlanId): string {
  return plan === "pro" ? "Pro" : plan === "ultra" ? "Ultra" : "Essential";
}

function termLabel(plan: PlanId, term: BillingTermMonths | null): string {
  if (plan === "pro") return "monthly subscription";
  if (term === 3) return "3 months";
  if (term === 6) return "6 months";
  if (term === 9) return "9 months";
  return "active";
}

function perksFor(plan: PlanId): Perk[] {
  const common: Perk[] = [
    {
      icon: <Sparkles size={16} />,
      title: "BaseBot AI Coach",
      body: "Ask anything about APS, universities, programmes, bursaries — with file uploads.",
    },
    {
      icon: <Mail size={16} />,
      title: "Gmail agent",
      body: "Auto-detects acceptance, rejection, waitlist and document requests in your inbox.",
    },
    {
      icon: <ShieldCheck size={16} />,
      title: "Document Vault",
      body: "Secure storage + scanner for IDs, transcripts, and motivation letters.",
    },
  ];

  if (plan === "pro") {
    return [
      {
        icon: <Sparkles size={16} />,
        title: "90 Base Credits every 7 days",
        body: "Powers AI Coach, bursary alerts, Gmail checks, and motivation letter drafts.",
      },
      ...common,
    ];
  }

  if (plan === "ultra") {
    return common;
  }

  return [
    {
      icon: <Sparkles size={16} />,
      title: "60 Base Credits every 7 days",
      body: "Powers AI Coach, bursary alerts, Gmail checks, and motivation letter drafts.",
    },
    ...common,
  ];
}

export default function SuccessClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const plan = useMemo<PlanId>(() => {
    const raw = (searchParams.get("plan") ?? "essential") as PlanId;
    return raw === "essential" || raw === "pro" || raw === "ultra" ? raw : "essential";
  }, [searchParams]);

  const term = useMemo<BillingTermMonths | null>(() => {
    if (plan !== "essential") return null;
    return normalizeBillingTermMonths(searchParams.get("term"));
  }, [plan, searchParams]);

  const [phase, setPhase] = useState<Phase>("verifying");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Rotate verifying microcopy every 2.4s while in verifying/slow.
  useEffect(() => {
    if (phase !== "verifying" && phase !== "slow") return;
    const id = window.setInterval(() => {
      setPhraseIdx((i) => (i + 1) % VERIFYING_PHRASES.length);
    }, 2400);
    return () => window.clearInterval(id);
  }, [phase]);

  // Tick the elapsed counter for the "slow" microcopy.
  useEffect(() => {
    if (phase !== "verifying" && phase !== "slow") return;
    const id = window.setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  // Poll verify-return until tier matches OR we hit the give-up threshold.
  useEffect(() => {
    let cancelled = false;
    const start = Date.now();

    async function check() {
      if (cancelled) return;
      try {
        const res = await fetch("/api/payments/payfast/verify-return", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, term }),
        });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; pending?: boolean } | null;
        if (cancelled) return;

        if (res.ok && json?.ok) {
          setPhase("success");
          return;
        }

        const elapsed = Date.now() - start;
        if (elapsed >= GIVE_UP_AFTER_MS) {
          setPhase("failed");
          return;
        }
        if (elapsed >= SLOW_AFTER_MS) setPhase("slow");

        window.setTimeout(check, POLL_INTERVAL_MS);
      } catch {
        const elapsed = Date.now() - start;
        if (elapsed >= GIVE_UP_AFTER_MS) {
          if (!cancelled) setPhase("failed");
          return;
        }
        window.setTimeout(check, POLL_INTERVAL_MS);
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [plan, term]);

  // Auto-redirect to dashboard 4 seconds after success so the user can read the perks.
  useEffect(() => {
    if (phase !== "success") return;
    const id = window.setTimeout(() => router.push("/dashboard"), 4000);
    return () => window.clearTimeout(id);
  }, [phase, router]);

  const perks = perksFor(plan);
  const planTitle = planLabel(plan);
  const subtitle = termLabel(plan, term);

  return (
    <main className="relative min-h-screen w-full bg-[#fff9f2] px-4 py-10 overflow-hidden">
      {/* Background flourishes — celebratory but quiet */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_-10%,rgba(251,146,60,0.18),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(40%_30%_at_90%_10%,rgba(56,189,248,0.10),transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center text-center">
        <Logo />

        {/* Status crest */}
        <div className="mt-6 flex h-20 w-20 items-center justify-center">
          {phase === "success" ? (
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500 text-white shadow-[0_16px_45px_rgba(16,185,129,0.35)] animate-[upgrade-pop_400ms_ease-out]">
              <Check size={36} strokeWidth={2.5} />
            </div>
          ) : phase === "failed" ? (
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-50 text-red-500 border border-red-100">
              <span className="text-3xl font-black">!</span>
            </div>
          ) : (
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-3xl border-4 border-orange-200 border-t-orange-500 animate-spin" />
              <div className="absolute inset-2 rounded-2xl bg-orange-500 flex items-center justify-center text-white">
                <Sparkles size={26} />
              </div>
            </div>
          )}
        </div>

        {/* Headline + subhead — phase-driven */}
        {phase === "success" ? (
          <>
            <h1 className="mt-6 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
              Welcome to {planTitle} ✨
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-500">
              Your plan is active — {subtitle}.
            </p>
          </>
        ) : phase === "failed" ? (
          <>
            <h1 className="mt-6 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
              Hmm, that's taking longer than expected
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-500">
              PayFast confirmed your payment, but we haven't seen the upgrade signal yet.
              Don't worry — your money is safe and we'll resolve this within a few minutes.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-6 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
              Activating your {planTitle} plan
            </h1>
            <p
              key={VERIFYING_PHRASES[phraseIdx]}
              className="mt-2 text-sm font-medium text-gray-500 animate-[fade-in_300ms_ease-out]"
            >
              {VERIFYING_PHRASES[phraseIdx]}
              <span className="inline-block ml-0.5 animate-pulse">…</span>
            </p>
            {phase === "slow" && (
              <p className="mt-2 text-xs text-amber-700">
                Still working ({secondsElapsed}s) — sometimes PayFast takes a moment to notify us.
              </p>
            )}
          </>
        )}

        {/* Plan summary card — visible in all phases so the user sees what they bought */}
        <div className="mt-6 w-full rounded-3xl border border-orange-100 bg-white/95 p-5 shadow-[0_16px_45px_rgba(249,115,22,0.10)] text-left">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-orange-500">Your plan</p>
              <p className="mt-0.5 text-lg font-black text-gray-900">{planTitle}</p>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
            <div
              className={[
                "rounded-xl px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide",
                phase === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : phase === "failed"
                  ? "bg-red-50 text-red-700 border border-red-100"
                  : "bg-orange-50 text-orange-700 border border-orange-100",
              ].join(" ")}
            >
              {phase === "success" ? "Active" : phase === "failed" ? "Pending review" : "Activating"}
            </div>
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
              {phase === "success" ? "What you've unlocked" : "What's coming up"}
            </p>
            <ul className="mt-3 space-y-3">
              {perks.map((perk) => (
                <li key={perk.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                    {perk.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">{perk.title}</p>
                    <p className="text-[12px] leading-5 text-gray-500">{perk.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA / fallback */}
        {phase === "success" && (
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(249,115,22,0.35)] hover:bg-orange-600 transition-colors"
          >
            Go to dashboard
            <ArrowRight size={16} />
          </Link>
        )}

        {phase === "success" && (
          <p className="mt-2 text-[11px] text-gray-400">Redirecting automatically…</p>
        )}

        {phase === "failed" && (
          <div className="mt-6 flex flex-col items-center gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Continue to dashboard
            </Link>
            <p className="text-[11px] text-gray-500">
              Still stuck after a few minutes? Email{" "}
              <a className="font-semibold text-orange-600 hover:underline" href="mailto:hello@baseformapplications.com">
                hello@baseformapplications.com
              </a>{" "}
              with this URL — we'll fix it within the day.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes upgrade-pop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </main>
  );
}
