"use client";

import Link from "next/link";
import { ArrowRight, UserPlus, FileUp, Send, Menu, X, Check, ChevronDown } from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#institutions", label: "Institutions" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

const PLANS = [
  {
    name: "Free",
    price: "R0",
    cadence: "forever",
    blurb: "Get applying without paying a cent.",
    cta: "Start free",
    href: "/onboarding",
    highlighted: false,
    features: [
      "1 active profile",
      "Up to 3 institution applications",
      "Document storage (ID, results, proof of residence)",
      "NSFAS application support",
    ],
  },
  {
    name: "Plus",
    price: "R49",
    cadence: "/month",
    blurb: "For learners applying widely.",
    cta: "Choose Plus",
    href: "/plans",
    highlighted: true,
    features: [
      "Unlimited institution applications",
      "Bursary auto-matching",
      "Deadline reminders via SMS + email",
      "Priority support",
    ],
  },
  {
    name: "Family",
    price: "R99",
    cadence: "/month",
    blurb: "Multiple learners, one bill.",
    cta: "Choose Family",
    href: "/plans",
    highlighted: false,
    features: [
      "Up to 4 learner profiles",
      "Everything in Plus",
      "Parent dashboard",
      "Shared document vault",
    ],
  },
];

const FAQS = [
  {
    q: "Is Baseform free to use?",
    a: "Yes. The Free plan lets you create a profile, upload documents, and apply to up to 3 institutions including NSFAS at no cost. Paid plans unlock unlimited applications and extra features.",
  },
  {
    q: "Can I apply for NSFAS through Baseform?",
    a: "Yes. NSFAS support is on every plan, including Free. Baseform helps you compile the right documents and track your application status alongside your university applications.",
  },
  {
    q: "Which institutions can I apply to?",
    a: "We support South African universities, TVET colleges, and bursary funds. We're adding more partners every month — if your institution isn't listed yet, you can still upload documents and we'll help you submit.",
  },
  {
    q: "How is my personal information protected?",
    a: "Your data is stored securely and handled in line with the Protection of Personal Information Act (POPIA). You control what gets shared with each institution, and you can delete your account at any time.",
  },
  {
    q: "What documents do I need?",
    a: "Typically: a copy of your South African ID, your latest school results (Grade 11 or matric), and proof of residence. Some institutions or bursaries ask for extras like a parent's payslip — Baseform tells you exactly what's missing for each application.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. Baseform is built mobile-first and works on data-saver settings. You can complete an entire application from a phone.",
  },
  {
    q: "Can I get a refund if I cancel?",
    a: "Paid plans are month-to-month. Cancel anytime in your account settings — you'll keep access until the end of the billing period and won't be charged again.",
  },
];

const STEPS = [
  {
    icon: UserPlus,
    title: "Create your profile",
    body: "Sign up free and fill in your details once — name, ID, school, subjects, and contact info.",
  },
  {
    icon: FileUp,
    title: "Upload your documents",
    body: "ID, latest results, proof of residence — stored securely and reused for every application.",
  },
  {
    icon: Send,
    title: "Apply to multiple institutions",
    body: "Pick universities, TVETs, NSFAS or bursaries and submit. Track everything from one dashboard.",
  },
];

const INSTITUTIONS = [
  "University of Cape Town",
  "Wits University",
  "University of Pretoria",
  "Stellenbosch University",
  "UJ",
  "UKZN",
  "NWU",
  "UNISA",
  "CPUT",
  "DUT",
  "TUT",
  "NSFAS",
  "Funza Lushaka",
  "Sasol Bursary",
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
        aria-expanded={open}
      >
        <span className="text-base font-bold text-slate-900">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-6 py-4 text-sm text-slate-600">{a}</div>
      )}
    </div>
  );
}

export default function WebsitePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/website" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-orange-500 text-sm font-black text-white">
              B
            </span>
            <span className="text-lg font-black tracking-tight text-slate-900">Baseform</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900"
            >
              Sign in
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-400"
            >
              Sign up
              <ArrowRight size={14} />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-700 md:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-200 bg-white px-6 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-base font-semibold text-slate-700"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-slate-200 pt-4">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-base font-semibold text-slate-700"
                >
                  Sign in
                </Link>
                <Link
                  href="/onboarding"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 py-3 text-base font-bold text-white"
                >
                  Sign up
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <header>
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

        <section id="how-it-works" className="mt-24 scroll-mt-24">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-orange-600">
              How it works
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Three steps. One application engine.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Stop filling in the same form ten times. Baseform turns one profile into many applications.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="absolute -top-4 left-6 grid size-9 place-items-center rounded-xl bg-slate-900 text-sm font-black text-white">
                    {i + 1}
                  </div>
                  <Icon size={28} className="mt-2 text-orange-500" />
                  <h3 className="mt-4 text-lg font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="institutions" className="mt-24 scroll-mt-24">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-orange-600">
              Institutions
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Apply where it matters.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Built around the universities, TVET colleges, and funding bodies that South African learners actually apply to.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {INSTITUTIONS.map((name) => (
              <span
                key={name}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
              >
                {name}
              </span>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-slate-500">
            More institutions added as we expand. Logos and partnerships coming soon.
          </p>
        </section>

        <section id="features" className="mt-24 grid scroll-mt-24 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

        <section id="pricing" className="mt-24 scroll-mt-24">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-orange-600">
              Pricing
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Simple plans, no surprises.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Start free. Upgrade only if you need unlimited applications or extra learners.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 shadow-sm ${
                  plan.highlighted
                    ? "border-orange-500 bg-white ring-2 ring-orange-500"
                    : "border-slate-200 bg-white"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-6 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-slate-600">{plan.blurb}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-sm font-semibold text-slate-500">{plan.cadence}</span>
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check size={16} className="mt-0.5 shrink-0 text-orange-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.href}
                  className={`mt-8 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition-colors ${
                    plan.highlighted
                      ? "bg-orange-500 text-white hover:bg-orange-400"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Prices in ZAR. Cancel anytime. NSFAS applications are free on every plan.
          </p>
        </section>

        <section id="faq" className="mt-24 scroll-mt-24">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-orange-600">
              FAQ
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Questions, answered.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              The things SA learners and parents ask us most often.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl gap-3">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </section>

        <section className="mt-24 rounded-3xl bg-slate-900 p-10 text-center text-white sm:p-16">
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
