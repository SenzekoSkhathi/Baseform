"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, Share2, GraduationCap, ArrowRight } from "lucide-react";

type Props = {
  firstName: string;
  aps: number;
  rating: string;
  school: string | null;
  gradeYear: string | null;
  shareUrl: string;
};

export default function ShareCardClient({
  firstName,
  aps,
  rating,
  school,
  gradeYear,
  shareUrl,
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${firstName}'s APS Score — Baseform`,
          text: `${firstName} scored ${aps}/42 on their APS. See their university qualification breakdown on Baseform.`,
          url: shareUrl,
        });
      } catch {
        // User cancelled — no-op
      }
    } else {
      copyLink();
    }
  }

  const ratingColor =
    aps >= 35
      ? "text-emerald-600"
      : aps >= 28
      ? "text-green-600"
      : aps >= 21
      ? "text-amber-600"
      : "text-orange-600";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff9f2]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(65%_55%_at_12%_10%,rgba(251,146,60,0.22),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_92%_15%,rgba(56,189,248,0.12),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,247,237,0.95))]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center px-5 py-12">
        {/* Branding */}
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
            <GraduationCap size={12} />
            Shared via Baseform
          </span>
        </div>

        {/* Card */}
        <div className="w-full rounded-3xl border border-orange-100 bg-white/95 p-6 shadow-[0_18px_50px_rgba(249,115,22,0.16)] sm:p-8">
          <p className="mb-1 text-sm font-medium text-gray-400">
            {firstName}&apos;s APS Result
          </p>
          {gradeYear && (
            <p className="mb-4 text-xs text-gray-400">{gradeYear}{school ? ` · ${school}` : ""}</p>
          )}

          {/* Score block */}
          <div className="rounded-2xl bg-orange-500 p-6 text-center text-white">
            <p className="text-xs uppercase tracking-widest text-orange-200">APS Score</p>
            <p className="mt-2 text-7xl font-black leading-none">{aps}</p>
            <p className="mt-1 text-sm text-orange-200">out of 42</p>
            <span className="mt-3 inline-flex rounded-full bg-white/20 px-4 py-1 text-sm font-bold">
              {rating}
            </span>
          </div>

          {/* APS explanation */}
          <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">
            Calculated from the best 6 subjects, excluding Life Orientation — the standard used by all SA public universities.
          </p>

          {/* Share buttons */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={nativeShare}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
            >
              <Share2 size={15} />
              Share
            </button>
            <button
              onClick={copyLink}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>

        {/* Viral CTA */}
        <div className="mt-6 w-full rounded-2xl border border-orange-100 bg-white/80 p-5 text-center">
          <p className="text-sm font-semibold text-gray-700">
            Want to find out your APS and what you qualify for?
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Free · Takes 2 minutes · No credit card needed
          </p>
          <Link
            href="/onboarding"
            className="mt-4 group inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition-colors"
          >
            Calculate my APS
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </main>
  );
}
