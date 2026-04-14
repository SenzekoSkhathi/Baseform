"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";

type Props = {
  /** Icon to display — pass a lucide element */
  icon: React.ReactNode;
  /** Feature name, e.g. "BaseBot AI" */
  feature: string;
  /** Short sentence about what it does */
  description: string;
  /** 2–3 bullet points they unlock on a paid plan */
  bullets: string[];
  /** "full" = standalone page, "card" = embedded inside a card section */
  variant?: "full" | "card";
};

export default function UpgradeGate({
  icon,
  feature,
  description,
  bullets,
  variant = "full",
}: Props) {
  if (variant === "card") {
    return (
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100">
              <Lock size={13} className="text-orange-500" />
            </span>
            <p className="text-xs font-bold text-orange-700">Paid plan required</p>
          </div>
          <p className="text-xs text-orange-700 leading-relaxed">{description}</p>
          <ul className="mt-2 space-y-1">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-1.5 text-[11px] text-orange-600">
                <Sparkles size={10} className="mt-0.5 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>
        <Link
          href="/plans"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
        >
          <Sparkles size={14} />
          Upgrade Plan
        </Link>
      </div>
    );
  }

  // Full-page variant
  return (
    <div className="relative min-h-screen bg-[#fff9f2]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(251,146,60,0.18),transparent_65%)]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {/* Lock badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600">
              <Lock size={11} />
              Paid plan required
            </span>
          </div>

          {/* Feature icon */}
          <div className="flex justify-center mb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-[0_8px_30px_rgba(249,115,22,0.15)] border border-orange-100">
              {icon}
            </div>
          </div>

          <h1 className="text-center text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">
            {feature}
          </h1>
          <p className="mt-2 text-center text-sm text-gray-500 max-w-xs mx-auto">
            {description}
          </p>

          {/* What they unlock */}
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
              Unlock with Essential or above
            </p>
            <ul className="space-y-2.5">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-100">
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5l2 2 4-4" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-sm text-gray-700">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="mt-5 flex flex-col gap-3">
            <Link
              href="/plans"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 text-base font-bold text-white shadow-[0_8px_24px_rgba(249,115,22,0.3)] hover:bg-orange-600 transition-all hover:-translate-y-0.5"
            >
              <Sparkles size={16} />
              Upgrade Plan
            </Link>
            <Link
              href="/dashboard"
              className="flex w-full items-center justify-center rounded-2xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
