"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, GraduationCap } from "lucide-react";

function WaitlistForm() {
  const params = useSearchParams();
  const name = params.get("name") ?? "";
  const aps = params.get("aps") ?? "";
  const firstName = name.split(" ")[0];

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState(name);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const raw = typeof window !== "undefined" ? localStorage.getItem("bf_onboarding") : null;
    const onboarding = raw ? JSON.parse(raw) : null;

    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        fullName: fullName || null,
        aps: aps ? Number(aps) : null,
        province: onboarding?.province ?? null,
        fieldOfInterest: onboarding?.fieldOfInterest ?? null,
        gradeYear: onboarding?.gradeYear ?? "Grade 11",
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50">
          <Check size={26} className="text-green-600" />
        </div>
        <h2 className="text-xl font-black text-gray-900">You&apos;re on the list!</h2>
        <p className="mt-2 text-sm text-gray-500">
          We&apos;ll notify you when 2027 applications open. Keep studying hard.
        </p>
        {aps && (
          <p className="mt-3 inline-flex rounded-full bg-orange-50 px-4 py-1.5 text-sm font-bold text-orange-700">
            APS {aps} · Looking strong
          </p>
        )}
        <div className="mt-6">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Recalculate APS
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
          <GraduationCap size={26} className="text-orange-500" />
        </div>
        <h1 className="text-2xl font-black text-gray-900">
          {firstName ? `${firstName}, you're ahead of the game` : "Join the 2027 waitlist"}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Applications for 2027 aren&apos;t open yet — but we&apos;ll guide you the moment they are.
        </p>
        {aps && (
          <span className="mt-3 inline-flex rounded-full bg-orange-50 px-4 py-1.5 text-sm font-bold text-orange-700">
            APS {aps} · Already qualifying for universities
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Your name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Thabo Mokoena"
            className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group flex items-center justify-center gap-2 rounded-2xl bg-orange-500 py-4 text-base font-bold text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Join the waitlist"}
          {!loading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
        </button>

        <p className="text-center text-xs text-gray-400">
          No spam. One email when 2027 applications open.
        </p>

        <p className="text-center text-xs text-gray-400">
          Already in Grade 12?{" "}
          <Link href="/onboarding" className="font-semibold text-orange-500">
            Create an account instead
          </Link>
        </p>
      </form>
    </>
  );
}

export default function WaitlistPage() {
  return (
    <main className="relative min-h-screen bg-[#fff9f2]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(65%_55%_at_12%_10%,rgba(251,146,60,0.18),transparent_62%)]" />
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-orange-100 bg-white/95 p-7 shadow-[0_18px_50px_rgba(249,115,22,0.14)]">
          <Suspense>
            <WaitlistForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
