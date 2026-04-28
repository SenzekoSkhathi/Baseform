"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Menu,
  X,
  Check,
  Sparkles,
  Send,
  Mail,
  MessageCircle,
  Shield,
  GraduationCap,
  Trophy,
  Clock,
  Lock,
  RotateCcw,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import {
  DEFAULT_PLANS,
  type PublicPlan,
} from "@/lib/site-config/defaults";

const NAV_LINKS = [
  { href: "#try", label: "Try the AI" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#schools", label: "Schools" },
];

const ROTATING_PROMPTS = [
  "I got 65% in Maths. What can I actually study?",
  "How do I apply for NSFAS this year?",
  "I want to be a doctor but my marks aren't great — what now?",
  "What bursaries can I get if my family earns under R350k?",
  "I'm at a no-fee school. Can I still apply to UCT?",
];

const HOW_IT_WORKS = [
  {
    n: "01",
    title: "Ask",
    body: "Tell BaseBot what you got, what you like, what scares you. The AI knows every public university and bursary in SA.",
  },
  {
    n: "02",
    title: "Match",
    body: "Get a shortlist of degrees and bursaries that actually match your marks and life — not just the obvious ones your friends are picking.",
  },
  {
    n: "03",
    title: "Apply",
    body: "Upload your docs once. Track every application, every deadline, every outcome — from your phone, even on a slow connection.",
  },
];

const FOR_WHO = [
  {
    title: "First in your family",
    body: "No older sibling, no cousin, no parent who's been through it. BaseBot is the relative who already went to varsity.",
  },
  {
    title: "At a school without a counsellor",
    body: "Most South African schools don't have one. We give you the same depth of guidance the well-resourced kids get.",
  },
  {
    title: "Smart but unsure",
    body: "Good marks but no idea what to do with them? You're not behind. You just haven't been shown the options yet.",
  },
];

const HEADLINE_STATS = [
  { icon: GraduationCap, value: "26", label: "Public universities", color: "text-orange-500" },
  { icon: Trophy, value: "R2M+", label: "Bursaries tracked", color: "text-amber-500" },
  { icon: Clock, value: "24/7", label: "AI guidance", color: "text-emerald-500" },
];

const INSTITUTIONS = [
  "UCT", "Wits", "UP", "Stellenbosch", "UJ", "UKZN", "NWU", "UNISA",
  "Rhodes", "UFS", "UWC", "NMU", "CPUT", "DUT", "TUT", "VUT", "MUT",
  "CUT", "SPU", "UMP", "UFH", "UNIVEN", "UL", "WSU", "SMU", "UNIZULU",
  "NSFAS", "Funza Lushaka", "Sasol", "Investec", "ISFAP", "Allan Gray",
];

/* ---------- Live AI demo (real, wired to /api/basebot/public) ---------- */

function TryAi() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [streamed, setStreamed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [typedPlaceholder, setTypedPlaceholder] = useState("");
  const placeholderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rotating, typewriter-style placeholder
  useEffect(() => {
    if (submitted) return;
    const target = ROTATING_PROMPTS[promptIndex];
    let i = 0;
    let deleting = false;

    function tick() {
      if (!deleting) {
        i += 1;
        setTypedPlaceholder(target.slice(0, i));
        if (i >= target.length) {
          placeholderTimer.current = setTimeout(() => {
            deleting = true;
            tick();
          }, 1800);
          return;
        }
      } else {
        i -= 1;
        setTypedPlaceholder(target.slice(0, i));
        if (i <= 0) {
          setPromptIndex((p) => (p + 1) % ROTATING_PROMPTS.length);
          return;
        }
      }
      placeholderTimer.current = setTimeout(tick, deleting ? 25 : 55);
    }
    tick();
    return () => {
      if (placeholderTimer.current) clearTimeout(placeholderTimer.current);
    };
  }, [promptIndex, submitted]);

  function streamText(full: string) {
    if (streamTimer.current) clearTimeout(streamTimer.current);
    let i = 0;
    const tick = () => {
      i += 2;
      setStreamed(full.slice(0, i));
      if (i < full.length) {
        streamTimer.current = setTimeout(tick, 12);
      }
    };
    tick();
  }

  async function handleSubmit() {
    const value = input.trim() || ROTATING_PROMPTS[promptIndex];
    setSubmitted(value);
    setStreamed("");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/basebot/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        setError(data.error ?? "AI is unavailable right now. Try again in a moment.");
        setLoading(false);
        return;
      }
      setLoading(false);
      streamText(data.reply);
    } catch {
      setError("Network hiccup. Check your connection and try again.");
      setLoading(false);
    }
  }

  function reset() {
    if (streamTimer.current) clearTimeout(streamTimer.current);
    setSubmitted(null);
    setStreamed("");
    setInput("");
    setError(null);
    setLoading(false);
  }

  return (
    <div className="rounded-3xl border border-orange-100 bg-white/80 p-5 shadow-[0_20px_60px_rgba(249,115,22,0.16)] backdrop-blur-md sm:p-7">
      {!submitted ? (
        <>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-orange-700 sm:text-xs">
            <span className="grid size-6 place-items-center rounded-full bg-orange-500 text-[10px] font-black text-white">
              B
            </span>
            BaseBot · Live demo
          </div>

          <label
            htmlFor="ai-input"
            className="mt-4 block text-xl font-black leading-tight text-slate-900 sm:text-2xl"
          >
            Ask anything about your future.
          </label>
          <p className="mt-1 text-sm text-slate-500">
            Real AI. Real answers. No sign-up needed to try.
          </p>

          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
            <input
              id="ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder={typedPlaceholder + "▎"}
              className="w-full rounded-2xl border border-orange-100 bg-white px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-100"
              maxLength={500}
            />
            <button
              type="button"
              onClick={handleSubmit}
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3.5 text-sm font-black text-white shadow-[0_10px_28px_rgba(249,115,22,0.35)] transition-all hover:-translate-y-0.5 hover:bg-orange-400"
            >
              Ask BaseBot
              <Send size={14} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Free. No card. Press enter to ask, or hit the button to try the example.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <div className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-900 text-[11px] font-black text-white">
              You
            </div>
            <p className="text-sm leading-relaxed text-slate-800">{submitted}</p>
          </div>

          <div className="mt-5 flex items-start gap-3">
            <div className="grid size-7 shrink-0 place-items-center rounded-full bg-orange-500 text-[11px] font-black text-white">
              B
            </div>
            <div className="flex-1">
              {loading && !error && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="size-1.5 animate-pulse rounded-full bg-orange-500" />
                  BaseBot is thinking…
                </div>
              )}
              {error && (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
                  {error}
                </div>
              )}
              {!error && streamed && (
                <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-slate-800">
                  {streamed}
                </pre>
              )}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-[0_10px_28px_rgba(249,115,22,0.35)] transition-all hover:-translate-y-0.5 hover:bg-orange-400"
            >
              Continue free — get a personalised plan
              <ArrowRight size={14} />
            </Link>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              <RotateCcw size={13} />
              Ask something else
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Product screen mockups (Baseform-themed) ---------- */

function ScreenAsk() {
  return (
    <div className="overflow-hidden rounded-3xl border border-orange-100 bg-white/90 shadow-[0_20px_50px_rgba(249,115,22,0.14)] backdrop-blur-sm">
      <div className="flex items-center gap-2 bg-slate-900 px-4 py-3 text-white">
        <span className="grid size-6 place-items-center rounded-full bg-orange-500 text-[10px] font-black">
          B
        </span>
        <span className="text-xs font-bold uppercase tracking-wider">BaseBot</span>
        <span className="ml-auto text-[10px] font-semibold text-slate-300">online</span>
      </div>
      <div className="space-y-3 bg-orange-50/40 p-5">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2.5 text-sm text-white">
          What can I do with Geography, History and Maths Lit?
        </div>
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-sm text-slate-800 ring-1 ring-orange-100">
          More than you think. Tourism management, town planning, education, journalism, policing — and a few BCom programmes that take Maths Lit. Want me to rank the top 5 for you?
        </div>
        <div className="ml-auto max-w-[60%] rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2.5 text-sm text-white">
          Yes please. And what bursaries?
        </div>
        <div className="flex items-center gap-2 px-2 pt-1 text-[11px] font-medium text-slate-500">
          <span className="size-1.5 animate-pulse rounded-full bg-orange-500" />
          BaseBot is typing…
        </div>
      </div>
    </div>
  );
}

function ScreenMatch() {
  const matches = [
    { name: "BCom Information Systems", uni: "UJ", aps: "28", fit: 92 },
    { name: "BA Politics & Economics", uni: "Wits", aps: "32", fit: 84 },
    { name: "BSc Geoinformatics", uni: "UP", aps: "30", fit: 78 },
  ];
  return (
    <div className="overflow-hidden rounded-3xl border border-orange-100 bg-white/90 shadow-[0_20px_50px_rgba(249,115,22,0.14)] backdrop-blur-sm">
      <div className="border-b border-orange-100 bg-orange-50/60 px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-orange-700">
          Matched · 87% confidence
        </p>
        <h4 className="mt-1 text-lg font-black text-slate-900">
          5 degrees that actually fit you
        </h4>
      </div>
      <ul className="divide-y divide-orange-100/60">
        {matches.map((r) => (
          <li key={r.name} className="flex items-center gap-4 px-5 py-3.5">
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">{r.name}</p>
              <p className="text-xs text-slate-500">
                {r.uni} · APS {r.aps}
              </p>
            </div>
            <div className="w-24">
              <div className="h-1.5 overflow-hidden rounded-full bg-orange-100">
                <div
                  className="h-full rounded-full bg-orange-500"
                  style={{ width: `${r.fit}%` }}
                />
              </div>
              <p className="mt-1 text-right text-[10px] font-bold text-slate-700">{r.fit}%</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between bg-amber-50 px-5 py-3 text-xs font-semibold text-amber-800">
        <span>3 bursaries match these</span>
        <ArrowRight size={14} />
      </div>
    </div>
  );
}

function ScreenTrack() {
  const rows = [
    { uni: "UCT", color: "bg-emerald-500", days: "Awaiting outcome" },
    { uni: "Wits", color: "bg-emerald-500", days: "Awaiting outcome" },
    { uni: "UJ", color: "bg-orange-500", days: "Closes in 12 days" },
    { uni: "NSFAS", color: "bg-rose-500", days: "Upload payslip" },
    { uni: "Sasol Bursary", color: "bg-emerald-500", days: "Shortlisted" },
  ];
  return (
    <div className="overflow-hidden rounded-3xl border border-orange-100 bg-white/90 shadow-[0_20px_50px_rgba(249,115,22,0.14)] backdrop-blur-sm">
      <div className="border-b border-orange-100 bg-orange-50/60 px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-orange-700">
          Application tracker
        </p>
        <h4 className="mt-1 text-lg font-black text-slate-900">
          6 applications, 1 dashboard
        </h4>
      </div>
      <div className="space-y-2.5 p-4">
        {rows.map((r) => (
          <div
            key={r.uni}
            className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-white px-3.5 py-2.5"
          >
            <span className={`size-2 rounded-full ${r.color}`} />
            <span className="text-sm font-bold text-slate-900">{r.uni}</span>
            <span className="ml-auto text-[11px] font-semibold text-slate-500">{r.days}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function WebsitePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [plans, setPlans] = useState<PublicPlan[]>(DEFAULT_PLANS);

  // Pull plans from site-config so pricing stays in sync with the rest of the app.
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/site-config", { signal: controller.signal });
        if (!res.ok) return;
        const payload = await res.json();
        if (Array.isArray(payload?.plans) && payload.plans.length > 0) {
          setPlans(payload.plans as PublicPlan[]);
        }
      } catch {
        // keep defaults on failure
      }
    })();
    return () => controller.abort();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff9f2] text-slate-900">
      {/* Soft Baseform radial gradients (same recipe as the home page) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_12%_18%,rgba(251,146,60,0.28),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_86%_18%,rgba(236,72,153,0.12),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_70%_95%,rgba(56,189,248,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.5),rgba(255,247,237,0.78))]" />
      </div>

      <div className="relative z-10">
        {/* Top strip */}
        <div className="border-b border-orange-100/70 bg-white/60 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-[11px] sm:px-8 sm:text-xs lg:px-10">
            <span className="font-semibold uppercase tracking-wide text-orange-700">
              Class of 2026 · Free for every matric
            </span>
            <Link
              href="/onboarding"
              className="hidden items-center gap-1 font-bold text-slate-700 hover:text-orange-600 sm:inline-flex"
            >
              Start free
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* Nav */}
        <nav className="sticky top-0 z-50 border-b border-orange-100/70 bg-[#fff9f2]/85 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8 lg:px-10">
            <Link href="/" aria-label="Baseform home">
              <Logo variant="lockup" size="md" />
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
                className="text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                Sign in
              </Link>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-orange-500 px-4 py-2 text-sm font-black text-white shadow-[0_10px_28px_rgba(249,115,22,0.35)] transition-all hover:-translate-y-0.5 hover:bg-orange-400"
              >
                Sign up free
                <ArrowRight size={14} />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="grid size-10 place-items-center rounded-2xl border border-orange-100 bg-white/80 text-slate-700 lg:hidden"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          {menuOpen && (
            <div className="border-t border-orange-100/70 bg-[#fff9f2] px-4 py-4 sm:px-8 lg:hidden">
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
                <div className="mt-2 flex flex-col gap-2 border-t border-orange-100 pt-4">
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
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-orange-500 px-4 py-3 text-base font-black text-white"
                  >
                    Sign up free
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* HERO */}
        <section id="try" className="scroll-mt-24">
          <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-8 sm:pt-20 sm:pb-20 lg:px-10">
            <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-orange-300 bg-orange-100/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-orange-700 sm:text-xs">
                  <Sparkles size={12} /> AI career guidance · for SA matrics
                </span>

                <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                  Your future shouldn&apos;t depend on your{" "}
                  <span className="text-orange-500">postcode</span>.
                </h1>

                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                  Baseform is the AI career coach every South African matric should have.
                  Ask it anything. Find degrees that fit. Discover bursaries you qualify for.
                  Apply to all 26 public universities — from one place.{" "}
                  <span className="font-bold text-slate-900">Free, forever.</span>
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Check size={15} className="text-orange-500" /> Free for every matric
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check size={15} className="text-orange-500" /> Works on any phone
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check size={15} className="text-orange-500" /> POPIA compliant
                  </span>
                </div>

                <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
                  {HEADLINE_STATS.map(({ icon: Icon, value, label, color }) => (
                    <div
                      key={label}
                      className="rounded-2xl border border-orange-100 bg-white/85 p-3 text-center backdrop-blur-sm"
                    >
                      <Icon size={16} className={`${color} mx-auto`} />
                      <p className="mt-1.5 text-lg font-black leading-none text-slate-900">{value}</p>
                      <p className="mt-1 text-[11px] leading-tight text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6">
                <TryAi />
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="scroll-mt-24 border-t border-orange-100/70">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
            <div className="flex flex-col items-start gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                  How it works
                </p>
                <h2 className="mt-2 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
                  Three steps. From question to acceptance.
                </h2>
              </div>
              <p className="max-w-sm text-slate-600">
                You don&apos;t need to know what you want to be. You just need to start asking.
                BaseBot does the rest.
              </p>
            </div>

            <div className="mt-12 grid gap-x-8 gap-y-12 lg:grid-cols-3">
              {HOW_IT_WORKS.map((s, i) => {
                const Screen = i === 0 ? ScreenAsk : i === 1 ? ScreenMatch : ScreenTrack;
                return (
                  <div key={s.n}>
                    <div className="flex items-baseline gap-3">
                      <span className="text-sm font-black text-orange-500">{s.n}</span>
                      <h3 className="text-2xl font-black text-slate-900">{s.title}</h3>
                    </div>
                    <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-slate-600">
                      {s.body}
                    </p>
                    <div className="mt-7">
                      <Screen />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* WHO IT'S FOR */}
        <section className="border-t border-orange-100/70">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5">
                <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                  Who it&apos;s for
                </p>
                <h2 className="mt-2 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
                  Built for the matric{" "}
                  <span className="text-orange-500">no one&apos;s helping</span> yet.
                </h2>
                <p className="mt-5 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
                  In some SA schools, learners have a counsellor, alumni networks, and parents
                  who&apos;ve been to varsity. Most don&apos;t. That&apos;s not a talent gap —
                  that&apos;s a <span className="font-bold text-slate-900">guidance gap</span>.
                </p>
                <p className="mt-5 text-xl font-black leading-snug text-slate-900">
                  Same advice. Same depth. Same chance.
                  <br />
                  <span className="text-orange-500">For every matric in South Africa.</span>
                </p>
              </div>

              <div className="grid gap-4 lg:col-span-7">
                {FOR_WHO.map((p, i) => (
                  <div
                    key={p.title}
                    className="flex items-start gap-5 rounded-3xl border border-orange-100 bg-white/85 p-5 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(249,115,22,0.18)] sm:p-6"
                  >
                    <div className="shrink-0 rounded-2xl bg-orange-50 px-3 py-2 text-lg font-black text-orange-600">
                      0{i + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{p.title}</h3>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600">
                        {p.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* INSTITUTIONS */}
        <section className="border-t border-orange-100/70">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-8 sm:py-16 lg:px-10">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-2xl font-black leading-snug text-slate-900 sm:text-3xl">
                All 26 public universities. NSFAS. Major bursaries.{" "}
                <span className="text-slate-400">One place.</span>
              </h2>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                No partnership? Tell us — we&apos;ll add it.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              {INSTITUTIONS.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-orange-100 bg-white/85 px-3 py-1.5 text-xs font-bold text-slate-700 backdrop-blur-sm"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="scroll-mt-24 border-t border-orange-100/70">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24 lg:px-10">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                Pricing
              </p>
              <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
                Free for every matric.{" "}
                <span className="text-slate-400">Forever.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
                Most learners only ever need the free plan. Paid tiers are for those who want
                more — but the AI Coach, document vault, and reminders are free for everyone.
              </p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {plans
                .filter((p) => p.id !== "ultra")
                .map((p) => {
                  const isLocked = !p.available;
                  const isHighlighted = p.recommended;
                  const href = isLocked
                    ? "#pricing"
                    : p.id === "free"
                    ? "/onboarding"
                    : "/plans";

                  const cardCls = isHighlighted
                    ? "border-orange-500 bg-orange-50/60 shadow-[0_20px_50px_rgba(249,115,22,0.22)]"
                    : isLocked
                    ? "border-orange-100 bg-white/70 opacity-80"
                    : "border-orange-100 bg-white/90 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_rgba(249,115,22,0.18)]";

                  return (
                    <div
                      key={p.id}
                      className={`relative rounded-3xl border p-6 backdrop-blur-sm transition-all sm:p-7 ${cardCls}`}
                    >
                      {isHighlighted && (
                        <span className="absolute -top-3 left-6 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                          Most popular
                        </span>
                      )}
                      {isLocked && (
                        <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                          <Lock size={10} />
                          Coming soon
                        </span>
                      )}

                      <h3 className="text-2xl font-black text-slate-900">{p.name}</h3>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-4xl font-black text-slate-900">{p.price}</span>
                        <span className="text-sm text-slate-500">{p.period}</span>
                      </div>
                      {p.tagline && !isHighlighted && !isLocked && (
                        <p className="mt-1 text-sm text-slate-500">{p.tagline}</p>
                      )}

                      <ul className="mt-6 space-y-2.5">
                        {p.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                            <Check
                              size={15}
                              className={`mt-0.5 shrink-0 ${
                                isHighlighted ? "text-orange-500" : "text-orange-400"
                              }`}
                            />
                            {f}
                          </li>
                        ))}
                      </ul>

                      {isLocked ? (
                        <button
                          type="button"
                          disabled
                          className="mt-7 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-black uppercase tracking-wide text-slate-400"
                        >
                          Coming soon
                        </button>
                      ) : (
                        <Link
                          href={href}
                          className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black uppercase tracking-wide transition-all hover:-translate-y-0.5 ${
                            isHighlighted
                              ? "bg-orange-500 text-white shadow-[0_10px_28px_rgba(249,115,22,0.35)] hover:bg-orange-400"
                              : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-100"
                          }`}
                        >
                          {p.id === "free" ? "Start free" : `Choose ${p.name}`}
                          <ArrowRight size={14} />
                        </Link>
                      )}
                    </div>
                  );
                })}
            </div>

            <p className="mt-8 text-center text-xs text-slate-500">
              Prices in ZAR. Cancel anytime. BaseBot AI Coach available on every plan.
            </p>
          </div>
        </section>

        {/* SCHOOLS */}
        <section id="schools" className="scroll-mt-24 border-t border-orange-100/70">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-20 lg:px-10">
            <div className="overflow-hidden rounded-3xl border border-orange-200 bg-orange-50/70 p-7 backdrop-blur-sm sm:p-10">
              <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-7">
                  <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                    Schools, NGOs &amp; guidance counsellors
                  </p>
                  <h2 className="mt-2 text-2xl font-black leading-snug text-slate-900 sm:text-3xl">
                    Give every learner you serve a career coach.
                  </h2>
                  <p className="mt-3 max-w-xl text-slate-700">
                    Bulk licences for schools and NGOs. Cohort dashboards, deadline broadcasts to
                    whole grades, progress reports for your district or funder. Built for
                    Quintile 1–3 schools, scaled for the rest.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="mailto:info@baseformapplications.com?subject=Schools%20%26%20NGOs%20enquiry"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[0_10px_28px_rgba(249,115,22,0.35)] transition-all hover:-translate-y-0.5 hover:bg-orange-400"
                    >
                      Talk to us
                      <ArrowUpRight size={14} />
                    </Link>
                    <Link
                      href="/plans"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100"
                    >
                      See plans
                    </Link>
                  </div>
                </div>
                <ul className="grid gap-2 sm:grid-cols-2 lg:col-span-5">
                  {[
                    "Cohort dashboards",
                    "Bulk onboarding",
                    "AI Coach per learner",
                    "Deadline broadcasts",
                    "Progress reports",
                    "Dedicated support",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 rounded-2xl border border-orange-100 bg-white/90 px-3 py-2.5 text-xs font-bold text-slate-800"
                    >
                      <Check size={14} className="shrink-0 text-orange-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="border-t border-orange-100/70">
          <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-8 sm:py-24 lg:px-10">
            <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
              Sizokusiza · we&apos;ll help you
            </p>
            <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-black leading-[1.05] text-slate-900 sm:text-5xl">
              Your future starts with{" "}
              <span className="text-orange-500">one question</span>.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base text-slate-600 sm:text-lg">
              Ask the AI. Discover your paths. Apply with confidence — for free.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-7 py-4 text-base font-black uppercase tracking-wide text-white shadow-[0_10px_28px_rgba(249,115,22,0.35)] transition-all hover:-translate-y-0.5 hover:bg-orange-400"
              >
                Start free
                <ArrowRight size={18} />
              </Link>
              <Link
                href="#try"
                className="text-sm font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
              >
                Or try the AI right here ↑
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-orange-100/70 bg-[#fff9f2]/60 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <Logo variant="lockup" size="md" />
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
                  AI career guidance for every South African learner. From career question to
                  submitted application — public universities, NSFAS, and bursaries, all in one
                  place.
                </p>
                <div className="mt-5 flex flex-col gap-2 text-sm">
                  <Link
                    href="mailto:info@baseformapplications.com"
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
                  >
                    <Mail size={14} className="text-orange-500" />
                    info@baseformapplications.com
                  </Link>
                  <Link
                    href="mailto:support@baseformapplications.com"
                    className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
                  >
                    <MessageCircle size={14} className="text-orange-500" />
                    support@baseformapplications.com
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-2">
                <h4 className="text-[11px] font-black uppercase tracking-wide text-slate-900">
                  Product
                </h4>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  <li><Link href="#try" className="hover:text-slate-900">Try the AI</Link></li>
                  <li><Link href="#how" className="hover:text-slate-900">How it works</Link></li>
                  <li><Link href="#pricing" className="hover:text-slate-900">Pricing</Link></li>
                  <li><Link href="/onboarding" className="hover:text-slate-900">Sign up</Link></li>
                </ul>
              </div>

              <div className="lg:col-span-2">
                <h4 className="text-[11px] font-black uppercase tracking-wide text-slate-900">
                  Partners
                </h4>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  <li><Link href="#schools" className="hover:text-slate-900">Schools</Link></li>
                  <li><Link href="#schools" className="hover:text-slate-900">NGOs</Link></li>
                  <li>
                    <Link
                      href="mailto:info@baseformapplications.com"
                      className="hover:text-slate-900"
                    >
                      Press
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="lg:col-span-3">
                <h4 className="text-[11px] font-black uppercase tracking-wide text-slate-900">
                  Legal
                </h4>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  <li><Link href="/privacy" className="hover:text-slate-900">Privacy</Link></li>
                  <li><Link href="/terms" className="hover:text-slate-900">Terms</Link></li>
                  <li className="inline-flex items-center gap-2 text-slate-500">
                    <Shield size={12} className="text-orange-500" /> POPIA compliant
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-orange-100/70 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
              <span>© {new Date().getFullYear()} Lumen AI (Pty) Ltd · Made in South Africa.</span>
              <span className="font-semibold uppercase tracking-wide">
                Sizokusiza · we&apos;ll help you
              </span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
