"use client";

import Link from "next/link";
import {
  ArrowRight,
  UserPlus,
  Send,
  Menu,
  X,
  Check,
  ChevronDown,
  Shield,
  Lock,
  Sparkles,
  GraduationCap,
  Wallet,
  Smartphone,
  Clock,
  MessageCircle,
  Mail,
  Bell,
  FileText,
  Brain,
  Compass,
  Target,
  Users,
  MessageSquare,
  FolderKanban,
  CalendarClock,
  ListChecks,
  LineChart,
  Zap,
} from "lucide-react";
import { useState } from "react";

const NAV_LINKS = [
  { href: "#manifesto", label: "Why Baseform" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#ai", label: "The AI" },
  { href: "#journey", label: "Your journey" },
  { href: "#institutions", label: "Institutions" },
  { href: "#pricing", label: "Pricing" },
  { href: "#schools", label: "For schools" },
  { href: "#faq", label: "FAQ" },
];

const STATS = [
  { value: "1:1", label: "AI career coaching, on demand" },
  { value: "26", label: "Public universities covered" },
  { value: "1,000s", label: "Bursaries matched to you automatically" },
  { value: "Free", label: "For every matric — forever" },
];

const COMPARISON = [
  {
    old: "No one to ask which course actually fits you",
    now: "An AI career coach, available 24/7",
  },
  {
    old: "Picking a degree by elimination or peer pressure",
    now: "Paths matched to your subjects, marks, and ambitions",
  },
  {
    old: "Discovering bursaries by accident — usually too late",
    now: "AI surfaces funding you qualify for, automatically",
  },
  {
    old: "Filling the same application form ten times",
    now: "Fill your profile once — apply many",
  },
  {
    old: "Documents scattered across emails and WhatsApp",
    now: "One secure vault, reused for every application",
  },
  {
    old: "First-gen with no one in your family to ask",
    now: "A career mentor in every learner's pocket",
  },
];

const INSTITUTION_GROUPS = [
  {
    icon: GraduationCap,
    title: "Public universities",
    items: [
      "UCT",
      "Wits",
      "UP",
      "Stellenbosch",
      "UJ",
      "UKZN",
      "NWU",
      "UNISA",
      "Rhodes",
      "UFS",
      "UWC",
      "NMU",
      "CPUT",
      "DUT",
      "TUT",
      "VUT",
      "MUT",
      "CUT",
      "SPU",
      "UMP",
      "UFH",
      "UNIVEN",
      "UL",
      "WSU",
      "SMU",
      "UNIZULU",
    ],
  },
  {
    icon: Wallet,
    title: "Bursaries & funding",
    items: ["NSFAS", "Funza Lushaka", "Sasol", "Investec", "ISFAP", "Allan Gray Orbis"],
  },
];

const JOURNEY = [
  {
    icon: FolderKanban,
    title: "Organize",
    body: "Every university, bursary, and document in one place. No more juggling tabs, emails, and WhatsApp threads — your whole application life lives on one dashboard.",
    items: [
      "All your applications, one view",
      "Document vault with version history",
      "Per-institution requirements checklist",
    ],
  },
  {
    icon: CalendarClock,
    title: "Plan",
    body: "See every deadline, task, and missing document on one timeline. Baseform builds your personal application calendar from the moment you sign up — and updates it as you go.",
    items: [
      "Personal application calendar",
      "AI-suggested next steps each week",
      "SMS + email reminders before every cut-off",
    ],
  },
  {
    icon: LineChart,
    title: "Track",
    body: "Watch every application move from drafted, to submitted, to outcome. See exactly where each one is — and what's still standing between you and acceptance.",
    items: [
      "Live status for every application",
      "Outcome tracking & follow-ups",
      "Progress reports for parents and counsellors",
    ],
  },
];

const FEATURES = [
  {
    icon: Brain,
    title: "AI career coach",
    body: "Ask anything about careers, courses, and admissions. Get clear, current answers in plain English — day or night.",
  },
  {
    icon: Compass,
    title: "Subjects → careers",
    body: "Turn your matric subjects, marks, and interests into the paths that genuinely fit you — not just the obvious ones.",
  },
  {
    icon: Target,
    title: "Bursary matching",
    body: "AI surfaces funding you qualify for. NSFAS, Funza Lushaka, corporate bursaries — found for you, automatically.",
  },
  {
    icon: FileText,
    title: "Documents, sorted",
    body: "One secure vault for ID, results, and proof of residence. Uploaded once, reused for every application.",
  },
  {
    icon: Bell,
    title: "Deadline engine",
    body: "Every institution and bursary cut-off tracked. SMS and email reminders so you never miss a chance.",
  },
  {
    icon: Smartphone,
    title: "Built for SA",
    body: "Mobile-first and data-light. Works on the phone in your pocket, even on slow or capped connections.",
  },
];

const PLANS = [
  {
    name: "Free",
    tagline: "Get started",
    price: "R0",
    cadence: "/month",
    cta: "Start free",
    href: "/onboarding",
    highlighted: false,
    comingSoon: false,
    badge: null as string | null,
    features: [
      "Application tracking (up to 3 universities)",
      "Interactive AI Coach (BaseBot)",
      "Secure document vault & scanner",
      "Automated deadline reminders",
    ],
  },
  {
    name: "Essential",
    tagline: null,
    price: "R89.99",
    cadence: "/3 months",
    cta: "Choose Essential",
    href: "/plans",
    highlighted: true,
    comingSoon: false,
    badge: "Recommended" as string | null,
    features: [
      "Everything in Free",
      "Unlimited application tracking",
      "Dedicated WhatsApp guidance bot",
      "Autonomous progress tracking",
      "Intelligent email monitoring (Gmail Agent)",
    ],
  },
  {
    name: "Pro",
    tagline: null,
    price: "R249.99",
    cadence: "/month",
    cta: "Coming soon",
    href: "/plans",
    highlighted: false,
    comingSoon: true,
    badge: "Coming soon" as string | null,
    features: [
      "Everything in Essential",
      "Autonomous application submission agent",
      "Priority support",
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
    body: "Documents encrypted at rest and in transit. Only you decide what gets shared.",
  },
  {
    icon: FileText,
    title: "Granular sharing",
    body: "Choose exactly which documents go to each institution — no blanket access.",
  },
  {
    icon: Clock,
    title: "Delete any time",
    body: "Erase your account and all associated data with one click. Your right under POPIA.",
  },
];

const FAQS = [
  {
    q: "What if I don't know what I want to do?",
    a: "That's exactly why Baseform exists. Tell our AI coach about the subjects you enjoy, what you're good at, and what life you want — it will surface careers you may never have considered, with the courses and institutions that lead there. No pressure to decide on day one.",
  },
  {
    q: "Is the AI career guidance actually free?",
    a: "Yes. Every matric gets full access to the AI career coach on the Free plan — including subject-to-career mapping and bursary matching. Paid plans only unlock unlimited applications and extras.",
  },
  {
    q: "How does the AI work? Can I trust it?",
    a: "Our AI is trained on the South African application landscape — all 26 public universities, NSFAS, and the major bursaries. It explains reasoning, links to sources, and flags when it isn't sure. It's a coach, not an oracle: you stay in control of every decision.",
  },
  {
    q: "Can I apply for NSFAS through Baseform?",
    a: "Yes. NSFAS support is on every plan, including Free. Baseform helps you compile the right documents, understand eligibility, and track your application alongside your university applications.",
  },
  {
    q: "I'm the first in my family to apply to university — can Baseform help?",
    a: "That's exactly who we built this for. The AI explains every step in plain language, answers the questions no one in your family has been through, and walks you from career idea to submitted application.",
  },
  {
    q: "How is my personal information protected?",
    a: "Your data is stored securely and handled in line with POPIA. You control what gets shared with each institution, and you can delete your account at any time.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. Baseform is mobile-first and works on data-saver settings. You can hold an entire career conversation and submit applications from a phone.",
  },
  {
    q: "I'm a parent or counsellor — can I help my learner?",
    a: "Yes. Parents and counsellors can support a learner directly from their account — see status updates, document checklists, and upcoming deadlines. Schools and NGOs can request bulk access — see the 'For schools' section.",
  },
];

const STEPS = [
  {
    icon: UserPlus,
    title: "Tell Baseform about you",
    body: "Your subjects, marks, interests, and what kind of life you want. No long forms — just a conversation.",
  },
  {
    icon: Sparkles,
    title: "Get matched by AI",
    body: "We map career paths, courses, and bursaries that actually fit you. Not generic advice — yours.",
  },
  {
    icon: Send,
    title: "Apply with confidence",
    body: "Submit to public universities, NSFAS, and bursaries from one dashboard. Track every step.",
  },
];

const AI_CONVERSATIONS = [
  {
    user: "I got 65% in Maths. What can I still apply for?",
    ai: "Plenty. Several BCom programmes at UJ and UNISA, BSc Geology at NWU, and a number of degree streams at other public universities are within reach. Want me to rank the top 5 based on your full profile?",
  },
  {
    user: "What's the difference between NSFAS and a bursary?",
    ai: "NSFAS is government funding that converts to a grant if you finish. Bursaries are private — Sasol, Investec, ISFAP — usually with work-back agreements. I can list the ones you qualify for right now.",
  },
  {
    user: "I'm scared I'll pick the wrong course.",
    ai: "That's the most common worry I hear. Tell me what you genuinely enjoy and what you're good at — I'll show you 3 paths that fit, with what the work actually looks like day to day.",
  },
];

const EQUITY_POINTS = [
  {
    icon: Users,
    title: "First-gen friendly",
    body: "Built for learners with no one in their family to ask. The AI explains every step.",
  },
  {
    icon: MessageSquare,
    title: "Plain language",
    body: "Career talk without the jargon. No insider terms, no assumed knowledge.",
  },
  {
    icon: Smartphone,
    title: "On any phone",
    body: "Designed for the device most SA learners actually have. Light on data, easy on battery.",
  },
];

const FOOTER_LINKS = {
  Product: [
    { label: "Why Baseform", href: "#manifesto" },
    { label: "The AI coach", href: "#ai" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
  ],
  Resources: [
    { label: "How it works", href: "#how-it-works" },
    { label: "Your journey", href: "#journey" },
    { label: "Institutions", href: "#institutions" },
    { label: "FAQ", href: "#faq" },
    { label: "Status", href: "https://baseform.betteruptime.com" },
  ],
  Company: [
    { label: "For schools & NGOs", href: "#schools" },
    { label: "Sign in", href: "/login" },
    { label: "Sign up", href: "/onboarding" },
    { label: "Contact", href: "mailto:info@baseformapplications.com" },
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
        {/* AI conversation card */}
        <div className="rotate-[-1.5deg] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
          <div className="flex items-center gap-2">
            <div className="grid size-6 place-items-center rounded-full bg-orange-500 text-[10px] font-black text-white">
              B
            </div>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              AI career coach
            </span>
          </div>
          <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">
            What can I do with Maths Lit and a love for design?
          </p>
          <p className="mt-2 rounded-xl bg-orange-50 px-3 py-2 text-xs text-slate-700">
            Plenty — UX design, marketing, architecture (with bridging), and several BA programmes.
            Shall I show 5 that fit?
          </p>
        </div>

        {/* Career match card */}
        <div className="relative rotate-1 rounded-2xl border border-orange-200 bg-white p-5 shadow-2xl shadow-orange-500/10 ring-1 ring-orange-200/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Career match
            </span>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
              92% fit
            </span>
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900">UX & Product Design — UJ</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full w-11/12 rounded-full bg-orange-500" />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Matches your subjects, marks, and creative interests.
          </p>
        </div>

        {/* Bursary card */}
        <div className="rotate-[-0.5deg] rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-xl">
          <div className="flex items-center gap-2">
            <Wallet size={14} className="text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-300">
              Bursary match
            </span>
          </div>
          <p className="mt-2 text-sm font-bold">NSFAS · ISFAP · Sasol Foundation</p>
          <p className="mt-1 text-xs text-slate-300">
            3 funding sources you qualify for. Closes 31 Aug.
          </p>
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
          <span className="text-slate-200">
            AI career guidance, free for every SA matric.
          </span>
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
          <Link href="/website" className="flex items-center" aria-label="Baseform home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Baseform" className="h-8 w-auto" />
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
              <Brain size={12} />
              AI career guidance · Built for South Africa
            </span>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Career guidance shouldn&apos;t depend on your{" "}
              <span className="bg-linear-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                postcode.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Baseform is an AI career guide for every South African matric. Discover paths that
              fit your subjects and dreams, organize your documents, plan every deadline, and
              track every application to all 26 public universities and NSFAS — from one place.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/onboarding"
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-black text-white shadow-[0_10px_35px_rgba(249,115,22,0.55)] transition-all hover:-translate-y-0.5 hover:bg-orange-400"
              >
                Get free career guidance
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="#ai"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-4 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                See the AI in action
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-emerald-500" /> Free for every matric
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} className="text-emerald-500" /> No card needed
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

      {/* Manifesto / Why Baseform */}
      <section id="manifesto" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-orange-600">
              Why Baseform exists
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              A guidance counsellor in every learner&apos;s pocket.
            </h2>
          </div>

          <div className="mx-auto mt-10 max-w-3xl space-y-5 text-lg leading-relaxed text-slate-600">
            <p>
              In some South African schools, learners have a career counsellor, alumni networks,
              and parents who&apos;ve been to university. In most, they don&apos;t. The result
              isn&apos;t a talent gap — it&apos;s a{" "}
              <span className="font-bold text-slate-900">guidance gap</span>. Thousands of capable
              matrics miss bursaries, university places, and life-changing opportunities because
              no one ever told them what was possible.
            </p>
            <p>
              Baseform exists to close that gap. Our AI gives every learner the same depth of
              career guidance — for free. Whether you&apos;re first in your family to apply to
              university, applying from a rural school, or just unsure what comes next, you get a
              coach that listens, explains, and helps you act.
            </p>
            <p className="font-bold text-slate-900">
              Same advice. Same depth. Same chance. For every matric in South Africa.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {EQUITY_POINTS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
                >
                  <div className="grid size-10 place-items-center rounded-xl bg-orange-500 text-white">
                    <Icon size={18} />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-orange-600">
              How it works
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              From &ldquo;what should I do?&rdquo; to &ldquo;I&apos;m in.&rdquo;
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Three steps from a question about your future to applications submitted.
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

      {/* AI in action */}
      <section id="ai" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-orange-600">
              Your AI coach
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Ask anything. Get clear answers.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Trained on the South African application landscape — all 26 public universities,
              NSFAS, and the major bursaries. Real, current, and personal to you.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-4">
            {AI_CONVERSATIONS.map((c) => (
              <div
                key={c.user}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/60 p-5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-black text-white">
                    You
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700">{c.user}</p>
                </div>
                <div className="flex items-start gap-3 p-5">
                  <div className="grid size-8 shrink-0 place-items-center rounded-full bg-orange-500 text-xs font-black text-white">
                    B
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700">{c.ai}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-slate-500">
            The AI is a coach, not an oracle. It explains its reasoning, links to sources, and
            flags when it isn&apos;t sure. You stay in control of every decision.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-24 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-orange-600">
              What you get
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Career guidance, end to end.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Everything a SA matric needs to go from career question to submitted application.
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

      {/* Journey: Organize · Plan · Track */}
      <section id="journey" className="scroll-mt-24 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-orange-600">
              Your application journey
            </span>
            <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
              Organize. Plan. Track.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Applying to university is a six-month project with twenty moving parts. Baseform
              turns the chaos into a clear journey — so nothing slips, nothing gets forgotten, and
              you always know what&apos;s next.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {JOURNEY.map((stage, i) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.title}
                  className="relative flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-12 place-items-center rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/30">
                      <Icon size={22} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 text-2xl font-black text-slate-900">{stage.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{stage.body}</p>
                  <ul className="mt-5 space-y-2 border-t border-slate-100 pt-5">
                    {stage.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm font-semibold text-slate-700"
                      >
                        <Check size={16} className="mt-0.5 shrink-0 text-orange-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Mock dashboard preview */}
          <div className="mt-14 overflow-hidden rounded-3xl border border-slate-200 bg-linear-to-br from-slate-50 to-white p-6 shadow-sm sm:p-10">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <ListChecks size={14} className="text-orange-500" />
                  This week
                </div>
                <ul className="mt-4 space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-orange-500" />
                    <span className="text-slate-700">
                      Upload certified ID copy{" "}
                      <span className="text-slate-400">· UCT BCom</span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-orange-500" />
                    <span className="text-slate-700">
                      Confirm Wits subject choices{" "}
                      <span className="text-slate-400">· closes Fri</span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-emerald-500" />
                    <span className="text-slate-500 line-through">
                      Submit NSFAS application
                    </span>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <CalendarClock size={14} className="text-orange-500" />
                  Upcoming deadlines
                </div>
                <ul className="mt-4 space-y-3 text-sm">
                  <li className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">UJ — BCom Accounting</span>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                      3 days
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Funza Lushaka</span>
                    <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                      2 weeks
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Stellenbosch — BSc</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      1 month
                    </span>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <LineChart size={14} className="text-orange-500" />
                  Application status
                </div>
                <ul className="mt-4 space-y-3 text-sm">
                  <li>
                    <div className="flex items-center justify-between font-semibold text-slate-700">
                      <span>UCT — BCom</span>
                      <span className="text-emerald-600">Submitted</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-full bg-emerald-500" />
                    </div>
                  </li>
                  <li>
                    <div className="flex items-center justify-between font-semibold text-slate-700">
                      <span>Wits — BSc Eng</span>
                      <span className="text-orange-600">In progress</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-2/3 bg-orange-500" />
                    </div>
                  </li>
                  <li>
                    <div className="flex items-center justify-between font-semibold text-slate-700">
                      <span>UP — BCom</span>
                      <span className="text-slate-500">Drafted</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full w-1/4 bg-slate-400" />
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              A glimpse of your dashboard — every application, deadline, and document at a glance.
            </p>
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
              Choosing your future shouldn&apos;t depend on luck, location, or who your parents
              know.
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
              When you know where you&apos;re going, applying is easy.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Once the AI has matched you to the right paths, all 26 South African public
              universities and the major funders are one tap away.
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
            All 26 SA public universities supported. TVET and private college support coming
            later — for now, Baseform focuses on getting you into the right public university or
            funded by the right bursary.
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
              Free where it matters.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              BaseBot AI coach, document vault, and deadline reminders — free for every matric.
              Upgrade when you want unlimited tracking and automation.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-7 shadow-sm transition-all ${
                  plan.highlighted
                    ? "border-orange-500 bg-white ring-2 ring-orange-500 hover:-translate-y-1"
                    : plan.comingSoon
                      ? "border-slate-200 bg-slate-50/50"
                      : "border-slate-200 bg-white hover:-translate-y-1"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900">{plan.name}</h3>
                  {plan.tagline && (
                    <span className="text-sm font-semibold text-slate-500">{plan.tagline}</span>
                  )}
                  {plan.badge && plan.highlighted && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-bold text-white">
                      <Zap size={11} className="fill-white" />
                      {plan.badge}
                    </span>
                  )}
                  {plan.badge && plan.comingSoon && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                      <Lock size={11} />
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-sm font-semibold text-slate-500">{plan.cadence}</span>
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check
                        size={16}
                        className={`mt-0.5 shrink-0 ${plan.comingSoon ? "text-slate-400" : "text-orange-500"}`}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.comingSoon ? (
                  <button
                    type="button"
                    disabled
                    className="mt-8 inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-bold text-slate-500"
                  >
                    <Lock size={14} />
                    {plan.cta}
                  </button>
                ) : (
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
                )}
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Prices in ZAR. Cancel anytime. BaseBot AI coach is free on every plan.
          </p>
        </div>
      </section>

      {/* Security & Trust */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wide text-orange-600">
              Built on trust
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
                  Career guidance for every learner you serve.
                </h2>
                <p className="mt-4 max-w-xl text-slate-300">
                  Bulk licences for schools and NGOs. Give every learner an AI career coach, track
                  cohort progress, push deadlines to a whole grade, and run reports for your
                  district or funder.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="mailto:info@baseformapplications.com?subject=Schools%20%26%20NGOs%20enquiry"
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
                  "AI coach for every learner",
                  "Deadline broadcasts",
                  "Progress reporting",
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
              href="mailto:support@baseformapplications.com"
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
              <h2 className="text-3xl font-black sm:text-4xl">
                Your future starts with one question.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-slate-300">
                Ask the AI. Discover your paths. Apply with confidence — for free.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-black text-white shadow-[0_10px_35px_rgba(249,115,22,0.55)] transition-all hover:-translate-y-0.5 hover:bg-orange-400"
                >
                  Start free
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon.svg" alt="" className="h-9 w-9" />
                <span className="text-lg font-black tracking-tight text-white">Baseform</span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
                AI career guidance for every South African learner. From career question to
                submitted application — public universities, NSFAS, and bursaries, all in one
                place.
              </p>
              <div className="mt-5 flex flex-col gap-2 text-sm">
                <Link
                  href="mailto:info@baseformapplications.com"
                  className="inline-flex items-center gap-2 text-slate-300 hover:text-white"
                >
                  <Mail size={14} className="text-orange-400" /> info@baseformapplications.com
                </Link>
                <Link
                  href="mailto:support@baseformapplications.com"
                  className="inline-flex items-center gap-2 text-slate-300 hover:text-white"
                >
                  <MessageCircle size={14} className="text-orange-400" />{" "}
                  support@baseformapplications.com
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
