"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { apsRating } from "@/lib/aps/calculator";
import { createClient } from "@/lib/supabase/client";
import { GraduationCap, Trophy, Clock, ArrowRight, Sparkles, ChevronLeft, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";

type RevealStats = {
  universitiesCount: number;
  programmesCount: number;
  bursariesCount: number;
  nearestDeadlineDays: number | null;
};

function RevealContent() {
  const router = useRouter();
  const params = useSearchParams();

  const aps = Number(params.get("aps") ?? 0);
  const name = params.get("name") ?? "there";
  const firstName = name.split(" ")[0];
  const rating = apsRating(aps);

  const [gradeYear, setGradeYear] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [stats, setStats] = useState<RevealStats | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("bf_onboarding");
    const onboarding = raw ? JSON.parse(raw) : null;
    setGradeYear(onboarding?.gradeYear ?? null);
  }, []);

  // Fetch share token if the user is already logged in (e.g. revisiting the page)
  useEffect(() => {
    fetch("/api/share")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.token) setShareToken(d.token); })
      .catch(() => {});
  }, []);

  async function downloadApsCard() {
    setDownloading(true);
    try {
      // Build query params for the image endpoint
      const params = new URLSearchParams({
        aps: String(aps),
        rating,
        submitted: "0",
        pending: "0",
      });

      // Fetch the image
      const response = await fetch(`/api/share/card-image?${params}`);
      if (!response.ok) throw new Error("Failed to generate image");

      // Convert to blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "aps-card.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download APS card:", error);
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    async function fetchStats() {
      try {
      const supabase = createClient();

      const raw = localStorage.getItem("bf_onboarding");
      const onboarding = raw ? JSON.parse(raw) : null;
      const fieldOfInterest: string | null = onboarding?.fieldOfInterest ?? null;

      // Programmes the student qualifies for (filtered by field if provided)
      let programmesQuery = supabase
        .from("faculties")
        .select("id, university_id", { count: "exact" })
        .lte("aps_minimum", aps);

      if (fieldOfInterest && fieldOfInterest !== "Not sure yet") {
        programmesQuery = programmesQuery.eq("field_of_study", fieldOfInterest);
      }

      const { data: qualifyingFaculties, count: programmesCount } =
        await programmesQuery;

      // Distinct universities
      const uniqueUniIds = new Set(
        (qualifyingFaculties ?? []).map((f) => f.university_id)
      );

      // Bursaries matched
      let bursariesQuery = supabase
        .from("bursaries")
        .select("id", { count: "exact" })
        .lte("minimum_aps", aps)
        .eq("is_active", true);

      if (onboarding?.province) {
        bursariesQuery = bursariesQuery.or(
          `provinces_eligible.cs.{"${onboarding.province}"},provinces_eligible.cs.{"All"}`
        );
      }

      const { count: bursariesCount } = await bursariesQuery;

      // Nearest application deadline from universities table
      const { data: universities } = await supabase
        .from("universities")
        .select("closing_date")
        .eq("is_active", true)
        .order("closing_date", { ascending: true })
        .limit(1);

      let nearestDeadlineDays: number | null = null;
      if (universities?.[0]?.closing_date) {
        const deadline = new Date(universities[0].closing_date);
        const today = new Date();
        const diff = Math.ceil(
          (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        nearestDeadlineDays = diff > 0 ? diff : 0;
      }

      setStats({
        universitiesCount: uniqueUniIds.size,
        programmesCount: programmesCount ?? 0,
        bursariesCount: bursariesCount ?? 0,
        nearestDeadlineDays,
      });
      } catch {
        // If DB queries fail, show zeros rather than breaking the page
        setStats({ universitiesCount: 0, programmesCount: 0, bursariesCount: 0, nearestDeadlineDays: null });
      }
    }

    fetchStats();
  }, [aps]);

  const loading = stats === null;

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/onboarding");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff9f2]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(65%_55%_at_12%_10%,rgba(251,146,60,0.22),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_92%_15%,rgba(56,189,248,0.12),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.85),rgba(255,247,237,0.95))]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-white"
          >
            <ChevronLeft size={16} />
            Back
          </button>
        </div>

        <header className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
            <Sparkles size={14} />
            Your Opportunity Report
          </div>

          <h1 className="mt-4 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
            {firstName}, here&apos;s what you qualify for
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Your APS result and opportunity snapshot are ready.
          </p>
        </header>

        <section className="mt-6 rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-[0_18px_50px_rgba(249,115,22,0.14)] sm:p-7">
          <div className="grid gap-5 sm:grid-cols-[1fr_1.2fr] sm:items-center">
            <div className="rounded-2xl bg-orange-500 p-5 text-center text-white sm:text-left">
              <p className="text-xs uppercase tracking-wide text-orange-100">Your APS Score</p>
              <p className="mt-2 text-6xl font-black leading-none">{aps}</p>
              <span className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">
                {rating}
              </span>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:p-5">
              <p className="text-sm font-semibold text-slate-700">How this score works</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                APS is calculated from your best 6 subjects, excluding Life Orientation.
                This gives you a realistic view of your university and bursary options.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center">
              <GraduationCap size={22} className="mx-auto mb-2 text-orange-500" />
              {loading ? (
                <div className="mx-auto mb-1 h-7 w-8 animate-pulse rounded bg-gray-100" />
              ) : (
                <div className="text-2xl font-black text-slate-900">{stats.universitiesCount}</div>
              )}
              <p className="mt-0.5 text-xs leading-tight text-slate-500">universities you qualify for</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center">
              <Trophy size={22} className="mx-auto mb-2 text-amber-500" />
              {loading ? (
                <div className="mx-auto mb-1 h-7 w-8 animate-pulse rounded bg-gray-100" />
              ) : (
                <div className="text-2xl font-black text-slate-900">{stats.bursariesCount}</div>
              )}
              <p className="mt-0.5 text-xs leading-tight text-slate-500">bursaries matched</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 text-center">
              <Clock size={22} className="mx-auto mb-2 text-rose-500" />
              {loading ? (
                <div className="mx-auto mb-1 h-7 w-8 animate-pulse rounded bg-gray-100" />
              ) : (
                <div className="text-2xl font-black text-slate-900">{stats.nearestDeadlineDays ?? "-"}</div>
              )}
              <p className="mt-0.5 text-xs leading-tight text-slate-500">days to nearest deadline</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 sm:px-5 sm:py-4">
            {loading ? (
              <div className="mx-auto h-5 w-3/4 animate-pulse rounded bg-orange-100" />
            ) : (
              <p className="text-center text-sm font-medium text-orange-800">
                You qualify for{" "}
                <span className="font-black text-orange-600">
                  {stats.programmesCount} programme{stats.programmesCount !== 1 ? "s" : ""}
                </span>{" "}
                across matching universities
              </p>
            )}
          </div>
        </section>

        <div className="mt-6">
          {gradeYear === "Grade 11" ? (
            <>
              <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-center">
                <p className="text-sm font-bold text-blue-800">You&apos;re Grade 11 — applications open in 2027</p>
                <p className="mt-1 text-xs text-blue-600">Join the waitlist and we&apos;ll guide you when the season opens.</p>
              </div>
              <Link
                href={`/waitlist?aps=${aps}&name=${encodeURIComponent(name)}`}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 text-base font-bold text-white shadow-[0_12px_30px_rgba(249,115,22,0.35)] transition-all hover:-translate-y-0.5 hover:bg-orange-600"
              >
                Join the 2027 waitlist
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="mt-3 text-center text-xs text-slate-500">
                Free · We&apos;ll remind you when applications open
              </p>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 text-base font-bold text-white shadow-[0_12px_30px_rgba(249,115,22,0.35)] transition-all hover:-translate-y-0.5 hover:bg-orange-600"
              >
                Create your free account
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <p className="mt-3 text-center text-xs text-slate-500">
                Free to use · No credit card needed · Takes 2 minutes
              </p>
            </>
          )}

          {shareToken && (
            <button
              onClick={downloadApsCard}
              disabled={downloading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Share2 size={15} />
                  Download your APS card
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function RevealPage() {
  return (
    <Suspense>
      <RevealContent />
    </Suspense>
  );
}
