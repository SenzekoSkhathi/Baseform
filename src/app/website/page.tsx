"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function WebsitePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to home
        </Link>

        <header className="mt-10">
          <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-700">
            Baseform
          </span>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-6xl">
            One platform for every SA matric application.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            Baseform helps Grade 11 and 12 learners apply to universities,
            colleges, bursaries, and NSFAS — all from one profile, one set of
            documents, one dashboard.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/onboarding"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-black text-white shadow-[0_10px_35px_rgba(249,115,22,0.55)] transition-all hover:-translate-y-0.5 hover:bg-orange-400"
            >
              Get started for free
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/plans"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-4 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              View plans
            </Link>
          </div>
        </header>

        <section className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "One profile, many applications",
              body: "Fill in your details once. Apply to multiple institutions without retyping anything.",
            },
            {
              title: "Documents, sorted",
              body: "Upload your ID, results, and proof of residence in one secure place.",
            },
            {
              title: "Track every step",
              body: "See application status, deadlines, and what's still missing on a single dashboard.",
            },
            {
              title: "Built for SA",
              body: "Designed around how universities, TVET colleges, NSFAS, and bursary funds actually work.",
            },
            {
              title: "Mobile-first",
              body: "Works on the phone in your pocket — even on slow connections.",
            },
            {
              title: "Affordable",
              body: "A free tier that gets you applying, with paid plans when you need more.",
            },
          ].map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{feature.body}</p>
            </article>
          ))}
        </section>

        <section className="mt-20 rounded-3xl bg-slate-900 p-10 text-center text-white sm:p-16">
          <h2 className="text-3xl font-black sm:text-4xl">
            Ready to apply the easier way?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Create your free Baseform account and start your first application in minutes.
          </p>
          <Link
            href="/onboarding"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-black text-white transition-all hover:-translate-y-0.5 hover:bg-orange-400"
          >
            Get started for free
            <ArrowRight size={18} />
          </Link>
        </section>

        <footer className="mt-16 border-t border-slate-200 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Baseform. Made in South Africa.
        </footer>
      </div>
    </main>
  );
}
