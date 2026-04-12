"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, Share2, GraduationCap, ArrowRight } from "lucide-react";

type Props = {
  fullName: string;
  aps: number;
  rating: string;
  school: string | null;
  gradeYear: string | null;
  subjects: string[];
  shareUrl: string;
};

export default function ShareCardClient({
  fullName,
  aps,
  rating,
  school,
  gradeYear,
  subjects,
  shareUrl,
}: Props) {
  const [copied, setCopied] = useState(false);
  const websiteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://baseform.co.za";
  const firstName = fullName.split(" ")[0] || "Student";
  const shareMessage = `${fullName} calculated an APS of ${aps}/42 on Baseform. View the full APS card and calculate yours: ${websiteUrl}`;

  async function copyLink() {
    await navigator.clipboard.writeText(`${shareMessage}\n${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function nativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `${fullName}'s APS Card - Baseform`,
          text: shareMessage,
          url: shareUrl,
        });
      } catch {
        // User cancelled — no-op
      }
    } else {
      copyLink();
    }
  }

  const motivationalMessage =
    aps >= 35
      ? "Excellent academic standing. Keep applying with confidence."
      : aps >= 28
      ? "Strong progress. A few focused improvements can lift your options further."
      : aps >= 21
      ? "Good foundation. Stay consistent and your opportunities will expand."
      : "Every subject counts. Keep improving one assessment at a time.";

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
          <p className="mb-1 text-sm font-semibold text-gray-900">
            APS Academic Profile
          </p>
          <h1 className="text-xl font-black text-gray-900">{fullName}</h1>
          <p className="mt-1 text-xs text-gray-500">
            {gradeYear ?? "Grade not specified"}
            {school ? ` · ${school}` : ""}
          </p>

          {/* Score block */}
          <div className="mt-5 rounded-2xl bg-orange-500 p-6 text-center text-white">
            <p className="text-xs uppercase tracking-widest text-orange-200">APS Score</p>
            <p className="mt-2 text-7xl font-black leading-none">{aps}</p>
            <p className="mt-1 text-sm text-orange-200">out of 42</p>
            <span className="mt-3 inline-flex rounded-full bg-white/20 px-4 py-1 text-sm font-bold">
              {rating}
            </span>
          </div>

          {/* Academic details */}
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Subjects</p>
            {subjects.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {subjects.map((subject) => (
                  <span
                    key={subject}
                    className="inline-flex rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-500">No subjects listed</p>
            )}
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-gray-500">
            APS is calculated from the best 6 subjects, excluding Life Orientation, based on common SA university rules.
          </p>

          {/* Share buttons */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={nativeShare}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
            >
              <Share2 size={15} />
              Share APS Card
            </button>
            <button
              onClick={copyLink}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>

          <p className="mt-4 text-center text-xs font-medium text-gray-600">
            {motivationalMessage}
          </p>
        </div>

        {/* Viral CTA */}
        <div className="mt-6 w-full rounded-2xl border border-orange-100 bg-white/80 p-5 text-center">
          <p className="text-sm font-semibold text-gray-700">
            Calculate your APS and explore university opportunities
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Free · Takes 2 minutes · Built for South African learners
          </p>
          <Link
            href="/onboarding"
            className="mt-4 group inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition-colors"
          >
            Start on Baseform
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-3 text-[11px] text-gray-500">{websiteUrl}</p>
        </div>
      </div>
    </main>
  );
}
