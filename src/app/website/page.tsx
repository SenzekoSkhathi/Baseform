"use client";

import Link from "next/link";
import {
  ArrowRight,
  UserPlus,
  FileUp,
  Send,
  Menu,
  X,
  Check,
  ChevronDown,
  Shield,
  Lock,
  Sparkles,
  Building2,
  GraduationCap,
  Wallet,
  Smartphone,
  Clock,
  MessageCircle,
  Mail,
  Bell,
  FileText,
  HeartHandshake,
} from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#institutions", label: "Institutions" },
  { href: "#pricing", label: "Pricing" },
  { href: "#schools", label: "For schools" },
  { href: "#faq", label: "FAQ" },
];

const STATS = [
  { value: "26", label: "Public universities supported" },
  { value: "50+", label: "TVET colleges & private institutions" },
  { value: "Free", label: "NSFAS support on every plan" },
  { value: "POPIA", label: "Compliant — your data, your control" },
];

const COMPARISON = [
  { old: "Filling the same form 10 times", now: "Fill your profile once — apply many" },
  { old: "Documents scattered across emails", now: "One secure vault, reused everywhere" },
  { old: "Missed application deadlines", now: "SMS + email reminders before every cut-off" },
  { old: "NSFAS forgotten until it's too late", now: "NSFAS guidance built into every plan" },
  { old: "Bursaries hidden behind Google searches", now: "Curated SA bursary matches in your dashboard" },
  { old: "Endless trips to print and certify", now: "Upload from your phone — designed for data-saver" },
];

const INSTITUTION_GROUPS = [
  {
    icon: GraduationCap,
    title: "Universities",
    items: [
      "University of Cape Town",
      "Wits University",
      "University of Pretoria",
      "Stellenbosch",
      "UJ",
      "UKZN",
      "NWU",
      "UNISA",
      "Rhodes",
      "UFS",
    ],
  },
  {
    icon: Building2,
    title: "TVET & private colleges",
    items: ["CPUT", "DUT", "TUT", "VUT", "Boland", "False Bay", "Damelin", "Varsity College"],
  },
  {
    icon: Wallet,
    title: "Bursaries & funding",
    items: ["NSFAS", "Funza Lushaka", "Sasol", "Investec", "ISFAP", "Allan Gray Orbis"],
  },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "One profile, many applications",
    body: "Fill your details, subjects, and APS once. Apply to every institution without retyping.",
  },
  {
    icon: FileUp,
    title: "Documents, sorted",
    body: "Upload your ID, latest results, and proof of residence into one secure vault.",
  },
  {
    icon: Bell,
    title: "Deadline engine",
    body: "Every institution and bursary deadline tracked. SMS and email reminders before each one.",
  },
  {
    icon: Shield,
    title: "Built for SA",
    body: "Designed around how universities, TVET colleges, NSFAS, and bursary funds actually work.",
  },
  {
    icon: Smartphone,
    title: "Mobile-first, data-light",
    body: "Works on the phone in your pocket — even on slow or capped connections.",
  },
  {
    icon: HeartHandshake,
    title: "Free where it matters",
    body: "A real free tier that gets you applying. Paid plans only when you need more.",
  },
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

const SECURITY = [
  {
    icon: Shield,
    title: "POPIA compliant",
    body: "Data handled in line with the Protection of Personal Information Act.",
  },
  {
    icon: Lock,
    title: "Encrypted end-to-end",
    body: "Your documents are encrypted at rest and in transit. Only you decide what gets shared.",
  },
  {
    icon: FileText,
    title: "Granular sharing",
    body: "Choose exactly which documents get sent to each institution — no blanket access.",
  },
  {
    icon: Clock,
    title: "Delete any time",
    body: "Erase your account and all associated data with one click. Your right under POPIA.",
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
  {
    q: "I'm a parent or counsellor — can I help my learner?",
    a: "Yes. The Family plan includes a parent dashboard so you can track each learner's progress. Schools and NGOs can request bulk access — see the 'For schools' section.",
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

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "Plans", href: "/plans" },
  ],
  Resources: [
    { label: "FAQ", href: "#faq" },
    { label: "Institutions", href: "#institutions" },
    { label: "For schools & NGOs", href: "#schools" },
    { label: "Status", href: "https://baseform.betteruptime.com" },
  ],
  Company: [
    { label: "Sign in", href: "/login" },
    { label: "Sign up", href: "/onboarding" },
    { label: "Contact", href: "mailto:hello@baseform.co.za" },
  ],
  Legal: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "POPIA", href: "/privacy#popia" },
  ],
};

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
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
        <div className="border-t border-slate-100 px-6 py-4 text-sm leading-relaxed text-slate-600">
          {a}
        </div>
      )}
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:mx-0">
      <div className="absolute -inset-6 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.25),transparent_60%)] blur-2xl" />
      <div className="relative grid gap-3">
        {/* Application progress card */}
        <div className="rotate-[-1.5deg] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              UCT — BCom
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Submitted
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-full rounded-full bg-emerald-500" />
          </div>
          <p className="mt-2 text-xs text-slate-500">All documents received. Awaiting outcome.</p>
        </div>

        {/* In-progress card */}
        <div className="relative rotate-1 rounded-2xl border border-orange-200 bg-white p-5 shadow-2xl shadow-orange-500/10 ring-1 ring-orange-200/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              NSFAS funding
            </span>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
              In progress
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-3/5 rounded-full bg-orange-500" />
          </div>
          <p className="mt-2 text-xs text-slate-500">2 of 3 documents uploaded. Closes 31 Aug.</p>
        </div>

        {/* Document vault card */}
        <div className="rotate-[-0.5deg] rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-xl">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-300">
              Document vault
            </span>
          </div>
          <ul className="mt-3 space-y-2 text-xs text-slate-200">
            <li className="flex items-center gap-2">
              <Check size={12} className="text-emerald-400" /> SA ID — verified
            </li>
            <li className="flex items-center gap-2">
              <Check size={12} className="text-emerald-400" /> Grade 11 results
            </li>
            <li className="flex items-center gap-2">
              <Check size={12} className="text-emerald-400" /> Proof of residence
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function WebsitePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Announcement bar */}
      <div className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-6 py-2 text-xs sm:text-sm">
          <span className="hidden rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide sm:inline-block">
            Class of 2026
          </span>
          <span className="text-slate-200">University and bursary applications are open.</span>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1 font-bold text-orange-300 hover:text-orange-200"
          >
            Start free
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/website" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-orange-500 text-sm font-black text-white shadow-md shadow-orange-500/30">
              B
            </span>
            <span className="text-lg font-black tracking-tight text-slate-900">Baseform</span>
          </Link>

          <div className="hidden items-center gap-7 lg:flex">
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white shadow-md shadow-orange-500/30 transition-all hover:-translate-y-0.5 hover:bg-orange-400"
            >
              Sign up
              <ArrowRight size={14} />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-700 lg:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-200 bg-white px-6 py-4 lg:hidden">
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

      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-b from-orange-50/60 via-white to-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_15%,rgba(249,115,22,0.12),transparent_55%)]" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-700 ring-1 ring-orange-200/60">
              <Sparkles size={12} />
              Built for South African matrics
            </span>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              One platform for{" "}
              <span className="bg-linear-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                every SA matric application.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Baseform helps Grade 11 and 12 learners apply to universities, TVET colleges,
              bursaries, and NSFAS — from one profile, one set of documents, one dashboard.
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

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-emerald-500" /> Free forever tier
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-emerald-500" /> No card required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-emerald-500" /> POPIA compliant
              </span>
            </div>
          </div>

          <HeroVisual />
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-10 sm:py-14 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center sm:text-left">
              <div className="text-3xl font-black text-orange-400 sm:text-4xl">{stat.value}</div>
              <div className="mt-2 text-sm leading-snug text-slate-300">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-orange-600">
              How it works
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Three steps. One application engine.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Stop filling in the same form ten times. Baseform turns one profile into many
              applications.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="absolute -top-4 left-6 grid size-9 place-items-center rounded-xl bg-slate-900 text-sm font-black text-white">
                    {i + 1}
                  </div>
                  <Icon size={28} className="mt-2 text-orange-500" />
                  <h3 className="mt-4 text-lg font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-orange-600">
              Features
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Everything you need, nothing you don&apos;t.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Purpose-built for SA learners — not retrofitted from a US-style admissions portal.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg"
                >
                  <div className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-600 transition-colors group-hover:bg-orange-500 group-hover:text-white">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-orange-600">
              The difference
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              The old way vs Baseform.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Applying to university shouldn&apos;t be a part-time job. Here&apos;s what changes.
            </p>
          </div>

          <div className="mt-12 overflow-hidden rounded-3xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-2 bg-slate-100 text-sm font-bold">
              <div className="px-6 py-4 text-slate-500">The old way</div>
              <div className="px-6 py-4 text-orange-700">With Baseform</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div
                key={row.old}
                className={`grid grid-cols-2 text-sm ${i % 2 ? "bg-white" : "bg-slate-50/40"}`}
              >
                <div className="border-t border-slate-200 px-6 py-4 text-slate-500 line-through decoration-slate-300">
                  {row.old}
                </div>
                <div className="flex items-start gap-2 border-t border-l border-slate-200 px-6 py-4 font-semibold text-slate-800">
                  <Check size={16} className="mt-0.5 shrink-0 text-orange-500" />
                  <span>{row.now}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Institutions */}
      <section id="institutions" className="scroll-mt-24 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-orange-600">
              Institutions
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Apply where it matters.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Built around the universities, colleges, and funders that South African learners
              actually apply to.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {INSTITUTION_GROUPS.map((group) => {
              const Icon = group.icon;
              return (
                <div
                  key={group.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-orange-50 text-orange-600">
                      <Icon size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{group.title}</h3>
                  </div>
                  <ul className="mt-5 flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <li
                        key={item}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-center text-xs text-slate-500">
            More institutions added every month. Don&apos;t see yours? You can still apply — we&apos;ll
            guide you through manual submission.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
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
                className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition-all hover:-translate-y-1 ${
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
        </div>
      </section>

      {/* Security & Trust */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-orange-600">
              Security & trust
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Your data, your control.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              We treat your ID, results, and personal documents with the seriousness they deserve.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SECURITY.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="grid size-11 place-items-center rounded-xl bg-slate-900 text-orange-400">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* For schools / NGOs */}
      <section id="schools" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-br from-slate-900 to-slate-800 p-10 text-white sm:p-14">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <span className="text-sm font-bold uppercase tracking-wide text-orange-300">
                  Schools, NGOs & guidance counsellors
                </span>
                <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                  Help every learner apply — at scale.
                </h2>
                <p className="mt-4 max-w-xl text-slate-300">
                  Bulk licences for schools and NGOs. Track every learner&apos;s progress, push
                  deadlines to a whole grade, and run reports for your district or funder.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="mailto:hello@baseform.co.za?subject=Schools%20%26%20NGOs%20enquiry"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-orange-400"
                  >
                    Talk to us
                    <ArrowRight size={14} />
                  </Link>
                  <Link
                    href="/plans"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  >
                    See plans
                  </Link>
                </div>
              </div>

              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  "Cohort dashboards",
                  "Bulk learner onboarding",
                  "Deadline broadcasts",
                  "Progress reporting",
                  "Document oversight",
                  "Dedicated support",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 ring-1 ring-white/10"
                  >
                    <Check size={14} className="shrink-0 text-orange-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-orange-600">FAQ</span>
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

          <p className="mt-8 text-center text-sm text-slate-500">
            Still curious?{" "}
            <Link
              href="mailto:hello@baseform.co.za"
              className="font-semibold text-orange-600 hover:text-orange-500"
            >
              Email us
            </Link>{" "}
            and we&apos;ll get back within a working day.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 pb-20 sm:pb-24">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-10 text-center text-white sm:p-16">
            <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.35),transparent_60%)]" />
            <div className="relative">
              <h2 className="text-3xl font-black sm:text-4xl">Ready to apply the easier way?</h2>
              <p className="mx-auto mt-4 max-w-xl text-slate-300">
                Create your free Baseform account and start your first application in minutes.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-black text-white shadow-[0_10px_35px_rgba(249,115,22,0.55)] transition-all hover:-translate-y-0.5 hover:bg-orange-400"
                >
                  Get started for free
                  <ArrowRight size={18} />
                </Link>
                <Link
                  href="/plans"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Compare plans
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-xl bg-orange-500 text-sm font-black text-white">
                  B
                </span>
                <span className="text-lg font-black tracking-tight text-white">Baseform</span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
                One platform for every SA matric application. Universities, TVET colleges,
                bursaries, and NSFAS — handled.
              </p>
              <div className="mt-5 flex flex-col gap-2 text-sm">
                <Link
                  href="mailto:hello@baseform.co.za"
                  className="inline-flex items-center gap-2 text-slate-300 hover:text-white"
                >
                  <Mail size={14} className="text-orange-400" /> hello@baseform.co.za
                </Link>
                <Link
                  href="https://wa.me/27000000000"
                  className="inline-flex items-center gap-2 text-slate-300 hover:text-white"
                >
                  <MessageCircle size={14} className="text-orange-400" /> WhatsApp support
                </Link>
              </div>
            </div>

            {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
              <div key={heading}>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  {heading}
                </h4>
                <ul className="mt-4 space-y-2 text-sm">
                  {links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-slate-400 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-slate-800 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
            <span>© {new Date().getFullYear()} Baseform. Made in South Africa.</span>
            <span className="inline-flex items-center gap-2">
              <Shield size={12} className="text-orange-400" />
              POPIA compliant · Encrypted document storage
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}
