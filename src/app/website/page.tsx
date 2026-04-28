"use client";

import Link from "next/link";
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
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ---------------------------------------------------------------------------
 * Baseform — homepage v2 ("Foolscap")
 * Design language:
 *   - Off-white "foolscap" paper background with faint ruled lines
 *   - Display: Fraunces (serif, warm, characterful) — loaded via next/font upstream
 *     or via <link> in the page head; falls back gracefully
 *   - Body: Inter / system grotesque (kept clean so the serif sings)
 *   - Accent palette: ink blue (#1E3A8A vibe) + orange (carry-over) + highlighter yellow
 *   - Hand-drawn underlines, circled words, marker arrows — implemented as inline SVG
 *     so they feel imperfect, not generic
 *   - South African phrases woven in as part of the typography, not multilingual toggles
 *   - Real product screen mockups, no tilted card stacks
 *   - Live AI input at the top: types -> example response streams back
 *
 * If you don't have Fraunces loaded yet, add this to your layout.tsx:
 *   import { Fraunces } from "next/font/google";
 *   const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display" });
 *   <html className={fraunces.variable}> ...
 * Then the .font-display class below will pick it up.
 * ------------------------------------------------------------------------- */

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

const SAMPLE_RESPONSE = [
  "Yes — and you'd be surprised how many doors are still open.",
  "",
  "With 65% in Maths, you qualify for around 40 BCom, BSc and BA programmes across the public universities. A few that fit you well:",
  "",
  "• BCom Information Systems at UJ (APS 28)",
  "• BSc Geoinformatics at UP (APS 30)",
  "• BA Politics & Economics at Wits (APS 32)",
  "",
  "Tell me your other subject marks and I'll narrow it down to the 5 strongest fits — and check which ones come with funding.",
];

const HOW_IT_WORKS = [
  {
    n: "01",
    siswati: "Buza",
    en: "Ask",
    body: "Tell BaseBot what you got, what you like, what scares you. No question is small. The AI knows every public university and bursary in SA.",
  },
  {
    n: "02",
    siswati: "Bona",
    en: "See",
    body: "Get a shortlist of degrees and bursaries that actually match your marks and life — not just the obvious ones your friends are picking.",
  },
  {
    n: "03",
    siswati: "Faka",
    en: "Apply",
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

const PLANS = [
  {
    name: "Free",
    price: "R0",
    cadence: "forever",
    href: "/onboarding",
    highlighted: false,
    badge: null as string | null,
    features: [
      "BaseBot AI career coach",
      "Track up to 3 university applications",
      "Document vault & scanner",
      "Deadline reminders",
    ],
    cta: "Start free",
  },
  {
    name: "Essential",
    price: "R89.99",
    cadence: "/ 3 months",
    href: "/plans",
    highlighted: true,
    badge: "Most matrics pick this",
    features: [
      "Everything in Free, plus:",
      "Unlimited applications",
      "WhatsApp guidance bot",
      "Smart Gmail tracking",
      "Priority support",
    ],
    cta: "Go Essential",
  },
  {
    name: "Pro",
    price: "R249.99",
    cadence: "/ month",
    href: "/plans",
    highlighted: false,
    badge: "Coming soon",
    features: [
      "Everything in Essential, plus:",
      "1:1 human counsellor sessions",
      "CV & motivation letter review",
      "Interview prep with AI",
    ],
    cta: "Notify me",
  },
];

/* ---------- Hand-drawn SVG accents ---------- */

function HandUnderline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 14"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3 9.5 C 60 3, 120 12, 180 6 S 230 9, 237 7"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HandArrow({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 60"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M5 10 C 25 35, 50 50, 70 48"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M70 48 L 60 40 M70 48 L 62 56"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------- Live AI input ---------- */

function TryAi() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [streamed, setStreamed] = useState("");
  const [promptIndex, setPromptIndex] = useState(0);
  const [typedPlaceholder, setTypedPlaceholder] = useState("");
  const placeholderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  function handleSubmit() {
    const value = input.trim() || ROTATING_PROMPTS[promptIndex];
    setSubmitted(value);
    setStreamed("");
    const full = SAMPLE_RESPONSE.join("\n");
    let i = 0;
    const stream = () => {
      i += 1;
      setStreamed(full.slice(0, i));
      if (i < full.length) {
        setTimeout(stream, 12);
      }
    };
    setTimeout(stream, 250);
  }

  function reset() {
    setSubmitted(null);
    setStreamed("");
    setInput("");
  }

  return (
    <div className="relative">
      {/* Notebook-paper card */}
      <div className="relative overflow-hidden rounded-[28px] border-2 border-ink-900/90 bg-paper shadow-[8px_8px_0_0_rgba(15,23,42,0.92)]">
        {/* Red margin line */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-rose-400/70 sm:left-16" />
        {/* Ruled lines */}
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, #1E3A8A 31px, #1E3A8A 32px)",
          }}
          aria-hidden
        />

        <div className="relative p-6 sm:p-10">
          {!submitted ? (
            <>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-ink-700">
                <span className="grid size-6 place-items-center rounded-full bg-orange-500 text-[10px] font-black text-white">
                  B
                </span>
                BaseBot · Live
              </div>

              <label
                htmlFor="ai-input"
                className="font-display mt-5 block text-2xl font-medium leading-tight text-ink-900 sm:text-3xl"
              >
                Buza nantoni na.{" "}
                <span className="text-ink-500">Ask anything about your future.</span>
              </label>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                <div className="relative flex-1">
                  <input
                    id="ai-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSubmit();
                    }}
                    placeholder={typedPlaceholder + "▎"}
                    className="w-full rounded-xl border-2 border-ink-900/80 bg-white px-4 py-4 font-mono text-sm text-ink-900 placeholder:text-ink-500 focus:outline-none focus:ring-4 focus:ring-orange-300"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="group inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink-900 bg-orange-500 px-5 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[3px_3px_0_0_rgba(15,23,42,1)] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_rgba(15,23,42,1)]"
                >
                  Ask BaseBot
                  <Send size={14} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>

              <p className="mt-4 text-xs text-ink-600">
                Free. No card. Your answers stay yours. <span className="text-ink-400">·</span>{" "}
                Press enter to ask, or just hit the button to try the example.
              </p>
            </>
          ) : (
            <>
              {/* Question echo */}
              <div className="flex items-start gap-3">
                <div className="grid size-7 shrink-0 place-items-center rounded-full bg-ink-900 text-[11px] font-black text-white">
                  You
                </div>
                <p className="font-mono text-sm text-ink-800">{submitted}</p>
              </div>

              {/* Streaming response */}
              <div className="mt-5 flex items-start gap-3">
                <div className="grid size-7 shrink-0 place-items-center rounded-full bg-orange-500 text-[11px] font-black text-white">
                  B
                </div>
                <div className="flex-1">
                  <pre className="whitespace-pre-wrap font-sans text-[15px] leading-relaxed text-ink-900">
                    {streamed}
                    {streamed.length < SAMPLE_RESPONSE.join("\n").length && (
                      <span className="ml-0.5 inline-block h-[1.05em] w-[2px] -translate-y-[1px] animate-pulse bg-orange-500 align-middle" />
                    )}
                  </pre>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink-900 bg-ink-900 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition-all hover:-translate-y-0.5"
                >
                  Continue this conversation — free
                  <ArrowRight size={14} />
                </Link>
                <button
                  type="button"
                  onClick={reset}
                  className="text-sm font-semibold text-ink-700 underline-offset-4 hover:underline"
                >
                  Ask something else
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Marker note */}
      <div className="pointer-events-none absolute -top-7 -right-2 hidden rotate-[8deg] items-center gap-2 text-orange-600 sm:flex">
        <HandArrow className="h-10 w-12" />
        <span className="font-display text-base italic">it actually works — try it</span>
      </div>
    </div>
  );
}

/* ---------- Product screen mockups ---------- */

function ScreenAsk() {
  return (
    <div className="relative">
      <div className="absolute -inset-2 rotate-[-1.5deg] rounded-[28px] bg-orange-500/15" />
      <div className="relative overflow-hidden rounded-[28px] border-2 border-ink-900 bg-white shadow-[6px_6px_0_0_rgba(15,23,42,1)]">
        <div className="flex items-center gap-2 border-b-2 border-ink-900/80 bg-ink-900 px-4 py-3 text-white">
          <span className="grid size-6 place-items-center rounded-full bg-orange-500 text-[10px] font-black">
            B
          </span>
          <span className="text-xs font-bold uppercase tracking-wider">BaseBot</span>
          <span className="ml-auto text-[10px] font-semibold text-ink-300">online</span>
        </div>
        <div className="space-y-3 bg-paper p-5">
          <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-ink-900 px-4 py-2.5 text-sm text-white">
            What can I do with Geography, History and Maths Lit?
          </div>
          <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-orange-50 px-4 py-3 text-sm text-ink-900 ring-1 ring-orange-200">
            More than you think. Tourism management, town planning, education, journalism,
            policing — and a few BCom programmes that take Maths Lit. Want me to rank the top 5
            for you?
          </div>
          <div className="ml-auto max-w-[60%] rounded-2xl rounded-br-sm bg-ink-900 px-4 py-2.5 text-sm text-white">
            Yes please. And what bursaries?
          </div>
          <div className="flex items-center gap-2 px-2 pt-1 text-[11px] font-medium text-ink-500">
            <span className="size-1.5 animate-pulse rounded-full bg-orange-500" />
            BaseBot is typing…
          </div>
        </div>
      </div>
    </div>
  );
}

function ScreenMatch() {
  return (
    <div className="relative">
      <div className="absolute -inset-2 rotate-[1.2deg] rounded-[28px] bg-yellow-300/30" />
      <div className="relative overflow-hidden rounded-[28px] border-2 border-ink-900 bg-white shadow-[6px_6px_0_0_rgba(15,23,42,1)]">
        <div className="border-b-2 border-ink-900/80 bg-paper px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-500">
            Matched for Lerato — 87% confidence
          </p>
          <h4 className="font-display mt-1 text-lg font-medium text-ink-900">
            5 degrees that actually fit you
          </h4>
        </div>
        <ul className="divide-y-2 divide-ink-900/10">
          {[
            { name: "BCom Information Systems", uni: "UJ", aps: "28", fit: 92 },
            { name: "BA Politics & Economics", uni: "Wits", aps: "32", fit: 84 },
            { name: "BSc Geoinformatics", uni: "UP", aps: "30", fit: 78 },
          ].map((r) => (
            <li key={r.name} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex-1">
                <p className="text-sm font-bold text-ink-900">{r.name}</p>
                <p className="text-xs text-ink-600">
                  {r.uni} · APS {r.aps}
                </p>
              </div>
              <div className="w-24">
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-900/10">
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{ width: `${r.fit}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-[10px] font-bold text-ink-700">{r.fit}%</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between border-t-2 border-ink-900/80 bg-yellow-200/40 px-5 py-3 text-xs font-semibold text-ink-800">
          <span>3 bursaries match these</span>
          <ArrowRight size={14} />
        </div>
      </div>
    </div>
  );
}

function ScreenTrack() {
  return (
    <div className="relative">
      <div className="absolute -inset-2 rotate-[-1deg] rounded-[28px] bg-ink-900/10" />
      <div className="relative overflow-hidden rounded-[28px] border-2 border-ink-900 bg-white shadow-[6px_6px_0_0_rgba(15,23,42,1)]">
        <div className="border-b-2 border-ink-900/80 bg-paper px-5 py-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-500">
            Application tracker
          </p>
          <h4 className="font-display mt-1 text-lg font-medium text-ink-900">
            6 applications, 1 dashboard
          </h4>
        </div>
        <div className="space-y-2.5 p-4">
          {[
            { uni: "UCT", status: "Submitted", color: "bg-emerald-500", days: "Awaiting outcome" },
            { uni: "Wits", status: "Submitted", color: "bg-emerald-500", days: "Awaiting outcome" },
            { uni: "UJ", status: "Draft", color: "bg-orange-500", days: "Closes in 12 days" },
            { uni: "NSFAS", status: "Action needed", color: "bg-rose-500", days: "Upload payslip" },
            { uni: "Sasol Bursary", status: "Submitted", color: "bg-emerald-500", days: "Shortlisted" },
          ].map((r) => (
            <div
              key={r.uni}
              className="flex items-center gap-3 rounded-xl border border-ink-900/15 bg-white px-3.5 py-2.5"
            >
              <span className={`size-2 rounded-full ${r.color}`} />
              <span className="text-sm font-bold text-ink-900">{r.uni}</span>
              <span className="ml-auto text-[11px] font-semibold text-ink-600">{r.days}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function WebsitePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-paper text-ink-900">
      {/* Page-wide CSS for paper texture, custom palette, fonts */}
      <style jsx global>{`
        :root {
          --paper: #fbf8f1;
          --ink-50: #f5f6fa;
          --ink-100: #e6e8ef;
          --ink-300: #b6bccc;
          --ink-400: #8e94a8;
          --ink-500: #5a6178;
          --ink-600: #3f4459;
          --ink-700: #2a2f44;
          --ink-800: #1a1e30;
          --ink-900: #0c1024;
        }
        .bg-paper {
          background-color: var(--paper);
          background-image:
            radial-gradient(rgba(12, 16, 36, 0.04) 1px, transparent 1px);
          background-size: 18px 18px;
        }
        .text-ink-900 { color: var(--ink-900); }
        .text-ink-800 { color: var(--ink-800); }
        .text-ink-700 { color: var(--ink-700); }
        .text-ink-600 { color: var(--ink-600); }
        .text-ink-500 { color: var(--ink-500); }
        .text-ink-400 { color: var(--ink-400); }
        .text-ink-300 { color: var(--ink-300); }
        .bg-ink-900 { background-color: var(--ink-900); }
        .bg-ink-800 { background-color: var(--ink-800); }
        .border-ink-900 { border-color: var(--ink-900); }
        .ring-ink-900 { --tw-ring-color: var(--ink-900); }
        .font-display {
          font-family: var(--font-display, "Fraunces"), "Iowan Old Style", Georgia, serif;
          font-feature-settings: "ss01", "ss02";
        }
      `}</style>

      {/* Top strip — like an exam header */}
      <div className="border-b-2 border-ink-900 bg-ink-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-2 text-[11px] sm:text-xs">
          <span className="font-mono uppercase tracking-[0.2em] text-orange-300">
            Class of 2026 · Free for every matric
          </span>
          <Link
            href="/onboarding"
            className="hidden items-center gap-1 font-bold text-white hover:text-orange-300 sm:inline-flex"
          >
            Start free
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b-2 border-ink-900 bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2" aria-label="Baseform home">
            <span className="font-display text-2xl font-semibold tracking-tight text-ink-900">
              Baseform
            </span>
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600 sm:inline-block">
              · ZA
            </span>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-semibold text-ink-700 transition-colors hover:text-ink-900"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="text-sm font-semibold text-ink-700 hover:text-ink-900"
            >
              Sign in
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink-900 bg-orange-500 px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_0_rgba(12,16,36,1)] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_rgba(12,16,36,1)]"
            >
              Sign up free
              <ArrowRight size={14} />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-xl border-2 border-ink-900 text-ink-900 lg:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t-2 border-ink-900 bg-paper px-6 py-4 lg:hidden">
            <div className="flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-base font-semibold text-ink-800"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-ink-900/15 pt-4">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-base font-semibold text-ink-800"
                >
                  Sign in
                </Link>
                <Link
                  href="/onboarding"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-ink-900 bg-orange-500 px-4 py-3 text-base font-black text-white"
                >
                  Sign up free
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* HERO — the live AI input is the hero */}
      <section id="try" className="relative scroll-mt-24 overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-ink-900 bg-yellow-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-ink-900">
                <Sparkles size={12} /> AI career guidance · for SA matrics
              </div>

              <h1 className="font-display mt-6 text-5xl font-medium leading-[1.02] tracking-tight text-ink-900 sm:text-6xl lg:text-[68px]">
                Your future
                <br />
                shouldn&apos;t depend
                <br />
                on your{" "}
                <span className="relative inline-block whitespace-nowrap">
                  <span className="relative z-10">postcode</span>
                  <HandUnderline className="absolute -bottom-2 left-0 right-0 h-3 w-full text-orange-500" />
                </span>
                .
              </h1>

              <p className="mt-7 max-w-md text-lg leading-relaxed text-ink-700">
                Baseform is the AI career coach every South African matric should have. Ask it
                anything. Find degrees that fit. Discover bursaries you qualify for. Apply to all
                26 public universities — from one place. <span className="font-bold text-ink-900">Free, forever.</span>
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-ink-700">
                <span className="inline-flex items-center gap-1.5">
                  <Check size={15} className="text-orange-600" /> Free for every matric
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check size={15} className="text-orange-600" /> Works on any phone
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check size={15} className="text-orange-600" /> POPIA compliant
                </span>
              </div>
            </div>

            <div className="lg:col-span-7">
              <TryAi />
            </div>
          </div>
        </div>

        {/* Decorative paper edge */}
        <div className="border-t-2 border-dashed border-ink-900/30" />
      </section>

      {/* WHAT IT DOES — three real product screens, side-scroll on mobile */}
      <section id="how" className="scroll-mt-24 border-b-2 border-ink-900 bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-orange-600">
                — How it works
              </p>
              <h2 className="font-display mt-3 text-4xl font-medium leading-[1.05] text-ink-900 sm:text-5xl">
                Three steps. <br className="hidden sm:block" />
                <span className="relative inline-block">
                  <span className="relative z-10">From question to acceptance.</span>
                  <span className="absolute -bottom-1 left-0 right-0 -z-0 h-3 bg-yellow-300/70" />
                </span>
              </h2>
            </div>
            <p className="max-w-sm text-ink-700">
              You don&apos;t need to know what you want to be. You just need to start asking.
              BaseBot does the rest.
            </p>
          </div>

          {/* Steps row */}
          <div className="mt-14 grid gap-x-10 gap-y-12 lg:grid-cols-3">
            {HOW_IT_WORKS.map((s, i) => {
              const Screen = i === 0 ? ScreenAsk : i === 1 ? ScreenMatch : ScreenTrack;
              return (
                <div key={s.n} className="relative">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-sm font-bold text-orange-600">{s.n}</span>
                    <h3 className="font-display text-2xl font-medium text-ink-900">
                      {s.siswati}{" "}
                      <span className="text-ink-400">/ {s.en}</span>
                    </h3>
                  </div>
                  <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-700">
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

      {/* WHO IT'S FOR — the equity message, single panel, hits hard */}
      <section className="border-b-2 border-ink-900 bg-ink-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-orange-300">
                — Who it&apos;s for
              </p>
              <h2 className="font-display mt-3 text-4xl font-medium leading-[1.05] sm:text-5xl">
                Built for the matric{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 text-orange-400">no one&apos;s helping</span>
                </span>
                {" "}yet.
              </h2>
              <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-100/80">
                In some SA schools, learners have a counsellor, alumni networks, and parents
                who&apos;ve been to varsity. Most don&apos;t. That&apos;s not a talent gap.
                That&apos;s a <span className="font-bold text-white">guidance gap</span>.
              </p>
              <p className="font-display mt-6 text-2xl text-white">
                Same advice. Same depth. Same chance. <br />
                <span className="text-orange-300">For every matric in South Africa.</span>
              </p>
            </div>

            <div className="lg:col-span-7">
              <div className="grid gap-4 sm:grid-cols-1">
                {FOR_WHO.map((p, i) => (
                  <div
                    key={p.title}
                    className="group flex items-start gap-5 rounded-2xl border-2 border-white/10 bg-white/[0.04] p-5 transition-colors hover:border-orange-400/60 hover:bg-white/[0.07] sm:p-6"
                  >
                    <div className="font-display shrink-0 text-3xl font-medium text-orange-400">
                      0{i + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{p.title}</h3>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-100/70">
                        {p.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INSTITUTIONS — kept lean, runs as a marquee feel */}
      <section className="border-b-2 border-ink-900 bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-display text-2xl font-medium text-ink-900">
              All 26 public universities. NSFAS. Major bursaries.
              <br />
              <span className="text-ink-500">One place.</span>
            </h2>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-500">
              No partnership? Tell us — we&apos;ll add it.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {[
              "UCT", "Wits", "UP", "Stellenbosch", "UJ", "UKZN", "NWU", "UNISA",
              "Rhodes", "UFS", "UWC", "NMU", "CPUT", "DUT", "TUT", "VUT", "MUT",
              "CUT", "SPU", "UMP", "UFH", "UNIVEN", "UL", "WSU", "SMU", "UNIZULU",
              "NSFAS", "Funza Lushaka", "Sasol", "Investec", "ISFAP", "Allan Gray Orbis",
            ].map((name) => (
              <span
                key={name}
                className="rounded-full border-2 border-ink-900/80 bg-white px-3 py-1.5 text-xs font-bold text-ink-800"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="scroll-mt-24 border-b-2 border-ink-900 bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <div className="text-center">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-orange-600">
              — Pricing
            </p>
            <h2 className="font-display mx-auto mt-3 max-w-2xl text-4xl font-medium leading-[1.05] text-ink-900 sm:text-5xl">
              Free for every matric.{" "}
              <span className="text-ink-500">Forever.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-ink-700">
              Most learners only ever need the free plan. Paid tiers are for those who want
              more — but the AI coach, document vault, and reminders are free for everyone.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-3xl border-2 p-7 transition-all ${
                  p.highlighted
                    ? "border-ink-900 bg-ink-900 text-white shadow-[8px_8px_0_0_rgba(249,115,22,1)]"
                    : "border-ink-900 bg-white text-ink-900 shadow-[6px_6px_0_0_rgba(12,16,36,1)]"
                }`}
              >
                {p.badge && (
                  <span
                    className={`absolute -top-3 left-6 rounded-full border-2 px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                      p.highlighted
                        ? "border-ink-900 bg-orange-500 text-white"
                        : "border-ink-900 bg-yellow-300 text-ink-900"
                    }`}
                  >
                    {p.badge}
                  </span>
                )}
                <h3
                  className={`font-display text-3xl font-medium ${
                    p.highlighted ? "text-white" : "text-ink-900"
                  }`}
                >
                  {p.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-black ${
                      p.highlighted ? "text-orange-400" : "text-ink-900"
                    }`}
                  >
                    {p.price}
                  </span>
                  <span
                    className={`text-sm ${
                      p.highlighted ? "text-ink-100/70" : "text-ink-500"
                    }`}
                  >
                    {p.cadence}
                  </span>
                </div>

                <ul className="mt-6 space-y-2.5">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className={`flex items-start gap-2 text-sm ${
                        p.highlighted ? "text-ink-100/90" : "text-ink-700"
                      }`}
                    >
                      <Check
                        size={15}
                        className={`mt-0.5 shrink-0 ${
                          p.highlighted ? "text-orange-400" : "text-orange-600"
                        }`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={p.href}
                  className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-black uppercase tracking-wide transition-all hover:-translate-y-0.5 ${
                    p.highlighted
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-ink-900 bg-white text-ink-900 hover:bg-ink-900 hover:text-white"
                  }`}
                >
                  {p.cta}
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-ink-500">
            Prices in ZAR. Cancel anytime. BaseBot AI coach is free on every plan.
          </p>
        </div>
      </section>

      {/* SCHOOLS */}
      <section id="schools" className="scroll-mt-24 border-b-2 border-ink-900 bg-paper">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="overflow-hidden rounded-3xl border-2 border-ink-900 bg-yellow-300 p-8 shadow-[8px_8px_0_0_rgba(12,16,36,1)] sm:p-12">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-ink-700">
                  — Schools, NGOs & guidance counsellors
                </p>
                <h2 className="font-display mt-3 text-3xl font-medium leading-tight text-ink-900 sm:text-4xl">
                  Give every learner you serve a career coach.
                </h2>
                <p className="mt-4 max-w-xl text-ink-800">
                  Bulk licences for schools and NGOs. Cohort dashboards, deadline broadcasts to
                  whole grades, progress reports for your district or funder. Built for
                  Quintile 1–3 schools, scaled for the rest.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="mailto:info@baseformapplications.com?subject=Schools%20%26%20NGOs%20enquiry"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink-900 bg-ink-900 px-5 py-3 text-sm font-black uppercase tracking-wide text-white shadow-[3px_3px_0_0_rgba(249,115,22,1)] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_rgba(249,115,22,1)]"
                  >
                    Talk to us
                    <ArrowUpRight size={14} />
                  </Link>
                  <Link
                    href="/plans"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink-900 bg-paper px-5 py-3 text-sm font-bold text-ink-900 hover:bg-white"
                  >
                    See plans
                  </Link>
                </div>
              </div>
              <ul className="grid gap-2 lg:col-span-5 sm:grid-cols-2">
                {[
                  "Cohort dashboards",
                  "Bulk onboarding",
                  "AI coach per learner",
                  "Deadline broadcasts",
                  "Progress reports",
                  "Dedicated support",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 rounded-xl border-2 border-ink-900 bg-paper px-3 py-2.5 text-xs font-bold text-ink-900"
                  >
                    <Check size={14} className="shrink-0 text-orange-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-b-2 border-ink-900 bg-ink-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:py-28">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-orange-300">
            Sizokusiza — we&apos;ll help you
          </p>
          <h2 className="font-display mx-auto mt-4 max-w-3xl text-5xl font-medium leading-[1.02] sm:text-6xl">
            Your future starts with{" "}
            <span className="relative inline-block">
              <span className="relative z-10">one question</span>
              <HandUnderline className="absolute -bottom-2 left-0 right-0 h-3 w-full text-orange-400" />
            </span>
            .
          </h2>
          <p className="mx-auto mt-6 max-w-md text-lg text-ink-100/80">
            Ask the AI. Discover your paths. Apply with confidence — for free.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-ink-900 bg-orange-500 px-7 py-4 text-base font-black uppercase tracking-wide text-white shadow-[5px_5px_0_0_rgba(251,248,241,1)] transition-all hover:-translate-y-0.5"
            >
              Start free
              <ArrowRight size={18} />
            </Link>
            <Link
              href="#try"
              className="text-sm font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline"
            >
              Or try the AI right here ↑
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-paper text-ink-700">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="font-display text-2xl font-semibold text-ink-900">Baseform</div>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-600">
                AI career guidance for every South African learner. From career question to
                submitted application — public universities, NSFAS, and bursaries, all in one
                place.
              </p>
              <div className="mt-5 flex flex-col gap-2 text-sm">
                <Link
                  href="mailto:info@baseformapplications.com"
                  className="inline-flex items-center gap-2 text-ink-700 hover:text-ink-900"
                >
                  <Mail size={14} className="text-orange-600" />{" "}
                  info@baseformapplications.com
                </Link>
                <Link
                  href="mailto:support@baseformapplications.com"
                  className="inline-flex items-center gap-2 text-ink-700 hover:text-ink-900"
                >
                  <MessageCircle size={14} className="text-orange-600" />{" "}
                  support@baseformapplications.com
                </Link>
              </div>
            </div>

            <div className="lg:col-span-2">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-ink-900">
                Product
              </h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li><Link href="#try" className="hover:text-ink-900">Try the AI</Link></li>
                <li><Link href="#how" className="hover:text-ink-900">How it works</Link></li>
                <li><Link href="#pricing" className="hover:text-ink-900">Pricing</Link></li>
                <li><Link href="/onboarding" className="hover:text-ink-900">Sign up</Link></li>
              </ul>
            </div>

            <div className="lg:col-span-2">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-ink-900">
                Partners
              </h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li><Link href="#schools" className="hover:text-ink-900">Schools</Link></li>
                <li><Link href="#schools" className="hover:text-ink-900">NGOs</Link></li>
                <li><Link href="mailto:info@baseformapplications.com" className="hover:text-ink-900">Press</Link></li>
              </ul>
            </div>

            <div className="lg:col-span-3">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-ink-900">
                Legal
              </h4>
              <ul className="mt-4 space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-ink-900">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-ink-900">Terms</Link></li>
                <li className="inline-flex items-center gap-2 text-ink-600">
                  <Shield size={12} className="text-orange-600" /> POPIA compliant
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t-2 border-ink-900/15 pt-6 text-xs text-ink-500 sm:flex-row sm:items-center">
            <span>© {new Date().getFullYear()} Baseform. Made in South Africa.</span>
            <span className="font-mono uppercase tracking-[0.18em]">
              Sizokusiza · we&apos;ll help you
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}