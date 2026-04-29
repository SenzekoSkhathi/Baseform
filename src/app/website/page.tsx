"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Menu,
  X,
  Send,
  Mail,
  MessageCircle,
  Lock,
  RotateCcw,
  Check,
  Clock,
  Compass,
  GraduationCap,
  Trophy,
  ListChecks,
  Bell,
  FolderLock,
  Calculator,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import {
  DEFAULT_PLANS,
  type PublicPlan,
} from "@/lib/site-config/defaults";

const NAV_LINKS = [
  { href: "#try", label: "Ask BaseBot" },
  { href: "/how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#schools", label: "Schools" },
  { href: "/about", label: "About" },
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
    n: "I.",
    title: "Ask",
    body: "Tell BaseBot what you got, what you like, what scares you. The AI knows every public university and bursary in South Africa.",
  },
  {
    n: "II.",
    title: "Match",
    body: "A shortlist of degrees and bursaries that fit your marks and your life — not just the obvious ones your friends are picking.",
  },
  {
    n: "III.",
    title: "Apply",
    body: "Upload your documents once. Track every application, every deadline, every outcome — from your phone, even on a slow connection.",
  },
];

const INSTITUTIONS = [
  "UCT", "Wits", "UP", "Stellenbosch", "UJ", "UKZN", "NWU", "UNISA",
  "Rhodes", "UFS", "UWC", "NMU", "CPUT", "DUT", "TUT", "VUT", "MUT",
  "CUT", "SPU", "UMP", "UFH", "UNIVEN", "UL", "WSU", "SMU", "UNIZULU",
];

const FUNDERS = [
  "NSFAS", "Funza Lushaka", "Sasol", "Investec", "ISFAP", "Allan Gray",
];

/* ---------- Live AI demo (wired to /api/basebot/public) ---------- */

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
    <div className="border-t border-b border-ink/15 bg-paper py-10 sm:py-12">
      {!submitted ? (
        <>
          <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-ink/55">
            BaseBot · A live conversation
          </p>
          <label
            htmlFor="ai-input"
            className="mt-3 block font-serif text-3xl font-medium leading-[1.1] tracking-tight text-ink sm:text-4xl"
          >
            Ask anything about your future.
          </label>
          <p className="mt-3 font-serif text-base italic text-ink/65 sm:text-lg">
            Real AI. Real answers. No sign-up needed to try.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <input
              id="ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              placeholder={typedPlaceholder + "▎"}
              className="w-full border-b-2 border-ink bg-transparent px-1 py-3 font-serif text-lg text-ink placeholder:text-ink/35 focus:border-orange-500 focus:outline-none sm:text-xl"
              maxLength={500}
            />
            <button
              type="button"
              onClick={handleSubmit}
              className="group inline-flex items-center justify-center gap-2 bg-ink px-6 py-3 font-sans text-xs font-bold uppercase tracking-[0.2em] text-paper transition-colors hover:bg-orange-500"
            >
              Ask BaseBot
              <Send size={13} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <p className="mt-4 font-sans text-xs text-ink/50">
            Free. No card. Press enter to ask, or hit the button to try the example.
          </p>
        </>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-2">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-ink/55">
                You asked
              </p>
            </div>
            <p className="font-serif text-xl italic leading-snug text-ink lg:col-span-10">
              &ldquo;{submitted}&rdquo;
            </p>
          </div>

          <div className="mt-7 grid gap-5 border-t border-ink/15 pt-7 lg:grid-cols-12">
            <div className="lg:col-span-2">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600">
                BaseBot
              </p>
            </div>
            <div className="lg:col-span-10">
              {loading && !error && (
                <p className="font-serif text-base italic text-ink/55">
                  Thinking…
                </p>
              )}
              {error && (
                <p className="border-l-2 border-rose-500 pl-4 font-serif text-base text-rose-700">
                  {error}
                </p>
              )}
              {!error && streamed && (
                <pre className="whitespace-pre-wrap font-serif text-[17px] leading-relaxed text-ink">
                  {streamed.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong key={i} className="font-semibold">
                        {part.slice(2, -2)}
                      </strong>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </pre>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 bg-orange-500 px-6 py-3 font-sans text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-orange-400"
            >
              Continue free — get a personalised plan
              <ArrowRight size={13} />
            </Link>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-[0.2em] text-ink/60 hover:text-ink"
            >
              <RotateCcw size={12} />
              Ask something else
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Page ---------- */

export default function WebsitePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [plans, setPlans] = useState<PublicPlan[]>(DEFAULT_PLANS);

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

  const issueDate = new Date().toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <main
      className="relative min-h-screen text-ink"
      style={
        {
          // Editorial palette — distinct from the app's #fff9f2 + orange-blob recipe.
          // ink: deep warm black. paper: warm cream. forest: dark section.
          ["--paper" as const]: "#f4ecdf",
          ["--ink" as const]: "#1a1714",
          ["--forest" as const]: "#0f1c16",
          backgroundColor: "var(--paper)",
        } as React.CSSProperties
      }
    >
      <style jsx global>{`
        .bg-paper { background-color: var(--paper); }
        .bg-ink { background-color: var(--ink); }
        .bg-forest { background-color: var(--forest); }
        .text-paper { color: var(--paper); }
        .text-ink { color: var(--ink); }
        .text-ink\\/55 { color: color-mix(in srgb, var(--ink) 55%, transparent); }
        .text-ink\\/65 { color: color-mix(in srgb, var(--ink) 65%, transparent); }
        .text-ink\\/60 { color: color-mix(in srgb, var(--ink) 60%, transparent); }
        .text-ink\\/50 { color: color-mix(in srgb, var(--ink) 50%, transparent); }
        .text-ink\\/35 { color: color-mix(in srgb, var(--ink) 35%, transparent); }
        .border-ink { border-color: var(--ink); }
        .border-ink\\/15 { border-color: color-mix(in srgb, var(--ink) 15%, transparent); }
        .border-ink\\/25 { border-color: color-mix(in srgb, var(--ink) 25%, transparent); }
        .font-serif { font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif; }
        .font-sans  { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .dropcap::first-letter {
          font-family: ui-serif, Georgia, "Times New Roman", Times, serif;
          float: left;
          font-size: 4.6em;
          line-height: 0.85;
          padding: 0.08em 0.12em 0 0;
          font-weight: 600;
          color: #ea580c;
        }
      `}</style>

      {/* ── Masthead strip ─────────────────────────────────────── */}
      <div className="border-b border-ink/15">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-2 sm:px-8">
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-ink/60">
            Sizokusiza — we&apos;ll help you.
          </span>
          <Link
            href="/onboarding"
            className="hidden font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-ink/70 hover:text-orange-600 sm:inline-flex"
          >
            Subscribe — it&apos;s free →
          </Link>
        </div>
      </div>

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-ink/15 bg-paper/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Baseform home">
            <Logo variant="lockup" size="md" />
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-ink/65 hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-5 md:flex">
            <Link
              href="/login"
              className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-ink/65 hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 bg-ink px-4 py-2.5 font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-paper hover:bg-orange-500"
            >
              Start free
              <ArrowRight size={12} />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="grid size-10 place-items-center border border-ink/25 text-ink lg:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-ink/15 bg-paper px-5 py-5 sm:px-8 lg:hidden">
            <div className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="font-sans text-sm font-bold uppercase tracking-[0.18em] text-ink"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-2 flex flex-col gap-3 border-t border-ink/15 pt-4">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="font-sans text-sm font-bold uppercase tracking-[0.18em] text-ink"
                >
                  Sign in
                </Link>
                <Link
                  href="/onboarding"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center justify-center gap-1.5 bg-ink px-4 py-3 font-sans text-xs font-bold uppercase tracking-[0.18em] text-paper"
                >
                  Start free
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-5 pt-12 pb-16 sm:px-8 sm:pt-20 sm:pb-24">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-orange-600">
            The matric edition · 2026
          </p>

          <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Headline + lede */}
            <div className="lg:col-span-7">
              <h1 className="font-serif text-[44px] font-medium leading-[0.98] tracking-tight text-ink sm:text-7xl lg:text-[88px]">
                Your future
                <br />
                shouldn&apos;t depend
                <br />
                on your{" "}
                <span className="italic text-orange-600">postcode.</span>
              </h1>

              <p className="dropcap mt-10 max-w-xl font-serif text-lg leading-[1.55] text-ink/85 sm:text-xl">
                Baseform is the AI career coach every South African matric should have. Ask
                it anything. Find degrees that fit. Discover bursaries you qualify for. Apply
                to all 26 public universities — from one place. Free, forever.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-ink/15 pt-6">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 bg-orange-500 px-7 py-4 font-sans text-xs font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-ink"
                >
                  Start free
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="#try"
                  className="font-serif text-base italic text-ink/70 underline-offset-4 hover:underline"
                >
                  …or just ask BaseBot a question first ↓
                </Link>
              </div>
            </div>

            <figure className="lg:col-span-5">
              <div className="relative aspect-4/5 w-full">
                {/* Soft orange glow under the stack */}
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 size-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-200/40 blur-3xl"
                />

                {/* ── Card 1 · Applications (back-left, tilted left) ── */}
                <div className="absolute left-[3%] top-[6%] w-[58%] -rotate-[5deg] rounded-2xl border border-orange-100 bg-white p-4 shadow-[0_18px_45px_rgba(249,115,22,0.18)]">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-orange-600">
                      Applications
                    </p>
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-orange-600">
                      4 / 6
                    </span>
                  </div>

                  <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
                    66<span className="text-base text-gray-400">%</span>
                  </p>
                  <p className="text-[10px] font-medium text-gray-500">complete</p>

                  <div className="mt-2 h-1.5 w-full rounded-full bg-orange-50">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: "66%" }}
                      aria-hidden="true"
                    />
                  </div>

                  <ul className="mt-3 space-y-1.5">
                    {[
                      { uni: "Wits", done: true },
                      { uni: "UJ", done: true },
                      { uni: "UP", done: true },
                      { uni: "UCT", done: true },
                      { uni: "Stellenbosch", done: false },
                    ].map((a) => (
                      <li
                        key={a.uni}
                        className="flex items-center gap-2 text-[11px]"
                      >
                        <span
                          className={`grid size-3.5 shrink-0 place-items-center rounded-full ${
                            a.done
                              ? "bg-orange-500 text-white"
                              : "border border-orange-200 bg-white text-orange-500"
                          }`}
                        >
                          {a.done ? (
                            <Check size={8} strokeWidth={3.5} />
                          ) : (
                            <Clock size={7} />
                          )}
                        </span>
                        <span
                          className={
                            a.done
                              ? "text-gray-700"
                              : "font-semibold text-gray-900"
                          }
                        >
                          {a.uni}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ── Card 2 · Next Deadline (front-center, tilted right) ── */}
                <div className="absolute left-1/2 top-[38%] w-[60%] -translate-x-1/2 rotate-3 rounded-2xl border border-orange-100 bg-white p-4 shadow-[0_22px_55px_rgba(249,115,22,0.22)]">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-orange-600">
                      Next deadline
                    </p>
                    <span className="flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-bold text-white">
                      <Clock size={8} strokeWidth={3} />
                      62 days
                    </span>
                  </div>

                  <p className="mt-2.5 text-lg font-bold leading-tight tracking-tight text-gray-900">
                    Stellenbosch
                  </p>
                  <p className="text-[11px] text-gray-500">BCom Economics</p>

                  <div className="mt-3 flex items-baseline gap-2 rounded-xl bg-orange-50 px-3 py-2">
                    <p className="text-2xl font-bold tracking-tight text-orange-600">
                      30
                    </p>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                        June
                      </p>
                      <p className="text-[9px] text-orange-500/80">2026</p>
                    </div>
                  </div>
                </div>

                {/* ── Card 3 · Documents (bottom-right, tilted right) ── */}
                <div className="absolute bottom-[6%] right-[3%] w-[55%] rotate-6 rounded-2xl border border-orange-100 bg-white p-4 shadow-[0_18px_45px_rgba(249,115,22,0.18)]">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-orange-600">
                      Documents
                    </p>
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-orange-600">
                      6 / 7
                    </span>
                  </div>

                  <ul className="mt-2.5 space-y-1.5">
                    {[
                      { label: "Certified ID", done: true },
                      { label: "Matric results", done: true },
                      { label: "Motivation letter", done: true },
                      { label: "Reference letter", done: false },
                    ].map((d) => (
                      <li
                        key={d.label}
                        className="flex items-center gap-2 text-[11px]"
                      >
                        <span
                          className={`grid size-3.5 shrink-0 place-items-center rounded-full ${
                            d.done
                              ? "bg-orange-500 text-white"
                              : "border border-orange-200 bg-white"
                          }`}
                        >
                          {d.done && <Check size={8} strokeWidth={3.5} />}
                        </span>
                        <span
                          className={
                            d.done
                              ? "text-gray-700 line-through decoration-orange-300"
                              : "font-semibold text-gray-900"
                          }
                        >
                          {d.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-2.5 h-1 w-full rounded-full bg-orange-50">
                    <div
                      className="h-full rounded-full bg-orange-500"
                      style={{ width: "86%" }}
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>
              <figcaption className="mt-3 font-sans text-[10px] uppercase tracking-[0.18em] text-ink/45">
                Every application, deadline & document — one place.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ── Pull quote ──────────────────────────────────────────── */}
      <section className="bg-forest text-paper">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-6 lg:grid-cols-12">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-paper/55 lg:col-span-2">
              The thesis
            </p>
            <blockquote className="font-serif text-3xl font-medium leading-[1.15] tracking-tight text-paper sm:text-5xl lg:col-span-10 lg:text-6xl">
              In some South African schools, a learner has a counsellor, alumni networks, and
              parents who&apos;ve been to varsity.{" "}
              <span className="italic text-orange-400">Most don&apos;t.</span> That isn&apos;t a
              talent gap — it&apos;s a guidance gap.
            </blockquote>
          </div>
        </div>
      </section>

      {/* ── Live AI demo ─────────────────────────────────────────── */}
      <section id="try" className="scroll-mt-24 border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-orange-600">
                Demonstration
              </p>
              <h2 className="mt-3 font-serif text-3xl font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl">
                Try it before you trust it.
              </h2>
            </div>
            <div className="lg:col-span-9">
              <TryAi />
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works (editorial spread) ──────────────────────── */}
      <section id="how" className="scroll-mt-24 border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-orange-600">
                The Method
              </p>
              <h2 className="mt-3 font-serif text-4xl font-medium leading-[1.02] tracking-tight text-ink sm:text-5xl">
                Three steps. From{" "}
                <span className="italic">question</span> to{" "}
                <span className="italic">acceptance.</span>
              </h2>
              <p className="mt-6 max-w-sm font-serif text-lg italic leading-relaxed text-ink/70">
                You don&apos;t need to know what you want to be. You just need to start asking.
              </p>
            </div>

            <ol className="lg:col-span-8 lg:pl-8">
              {HOW_IT_WORKS.map((s, i) => (
                <li
                  key={s.n}
                  className={`grid gap-4 py-8 lg:grid-cols-12 lg:gap-8 ${
                    i !== 0 ? "border-t border-ink/15" : ""
                  }`}
                >
                  <p className="font-serif text-3xl italic text-orange-600 lg:col-span-2 lg:text-4xl">
                    {s.n}
                  </p>
                  <div className="lg:col-span-10">
                    <h3 className="font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
                      {s.title}
                    </h3>
                    <p className="mt-3 max-w-xl font-serif text-lg leading-relaxed text-ink/75">
                      {s.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── What we do (orbital) ──────────────────────────────────── */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-2xl">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-orange-600">
              What we do
            </p>
            <h2 className="mt-3 font-serif text-4xl font-medium leading-[1.02] tracking-tight text-ink sm:text-5xl">
              One platform.{" "}
              <span className="italic text-ink/55">Eight ways we help.</span>
            </h2>
            <p className="mt-5 max-w-xl font-serif text-base italic leading-relaxed text-ink/65">
              Every part of the matric application journey, in one place — from the first
              question to the offer letter.
            </p>
          </div>

          {/* Orbit (lg+) */}
          <div className="relative mx-auto mt-16 hidden aspect-square w-full max-w-160 lg:block">
            {/* Outer faint ring */}
            <div
              aria-hidden="true"
              className="absolute inset-[6%] rounded-full border border-ink/15"
            />
            {/* Inner faint ring */}
            <div
              aria-hidden="true"
              className="absolute inset-[22%] rounded-full border border-ink/10"
            />

            {/* Center logo emblem */}
            <div className="absolute left-1/2 top-1/2 flex aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-full border border-orange-200 bg-paper shadow-[0_18px_45px_rgba(249,115,22,0.18)]">
              <Logo variant="lockup" size="md" />
              <p className="font-sans text-[9px] font-bold uppercase tracking-[0.22em] text-orange-600">
                Sizokusiza
              </p>
            </div>

            {/* 8 service pills, evenly spaced */}
            {[
              { label: "Career guidance", Icon: Compass, top: "0%", left: "50%" },
              { label: "University matching", Icon: GraduationCap, top: "14.6%", left: "85.4%" },
              { label: "Application tracking", Icon: ListChecks, top: "50%", left: "100%" },
              { label: "Deadline reminders", Icon: Bell, top: "85.4%", left: "85.4%" },
              { label: "Document vault", Icon: FolderLock, top: "100%", left: "50%" },
              { label: "AI Coach · BaseBot", Icon: MessageCircle, top: "85.4%", left: "14.6%" },
              { label: "Bursary discovery", Icon: Trophy, top: "50%", left: "0%" },
              { label: "APS calculator", Icon: Calculator, top: "14.6%", left: "14.6%" },
            ].map((s) => (
              <div
                key={s.label}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ top: s.top, left: s.left }}
              >
                <div className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-ink/20 bg-paper px-4 py-2.5 shadow-[0_8px_24px_rgba(26,23,20,0.06)]">
                  <span className="grid size-7 place-items-center rounded-full bg-orange-50 text-orange-600">
                    <s.Icon size={14} />
                  </span>
                  <span className="font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-ink">
                    {s.label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Stacked grid (mobile + tablet) */}
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:hidden">
            {[
              { label: "Career guidance", Icon: Compass },
              { label: "University matching", Icon: GraduationCap },
              { label: "Application tracking", Icon: ListChecks },
              { label: "Deadline reminders", Icon: Bell },
              { label: "Document vault", Icon: FolderLock },
              { label: "AI Coach · BaseBot", Icon: MessageCircle },
              { label: "Bursary discovery", Icon: Trophy },
              { label: "APS calculator", Icon: Calculator },
            ].map((s) => (
              <div
                key={s.label}
                className="inline-flex items-center gap-3 rounded-full border border-ink/20 bg-paper px-4 py-3"
              >
                <span className="grid size-8 place-items-center rounded-full bg-orange-50 text-orange-600">
                  <s.Icon size={15} />
                </span>
                <span className="font-sans text-[12px] font-bold uppercase tracking-[0.16em] text-ink">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Coverage ────────────────────────────────────────────── */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-orange-600">
                Coverage
              </p>
              <h2 className="mt-3 font-serif text-4xl font-medium leading-[1.02] tracking-tight text-ink sm:text-5xl">
                All 26.{" "}
                <span className="italic text-ink/55">Plus the bursaries.</span>
              </h2>
              <p className="mt-5 max-w-sm font-serif text-base italic text-ink/65">
                Every public university in South Africa. NSFAS. The bursaries that actually pay.
              </p>
            </div>

            <div className="lg:col-span-8 lg:pl-8">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-ink/45">
                Universities
              </p>
              <p className="mt-3 font-serif text-2xl leading-[1.4] text-ink sm:text-3xl">
                {INSTITUTIONS.join(" · ")}
              </p>

              <p className="mt-10 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-ink/45">
                Funders &amp; bursaries
              </p>
              <p className="mt-3 font-serif text-2xl italic leading-[1.4] text-ink sm:text-3xl">
                {FUNDERS.join(" · ")}
              </p>

              <p className="mt-8 font-sans text-[10px] uppercase tracking-[0.18em] text-ink/45">
                Missing one? Tell us — we&apos;ll add it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing (editorial table) ───────────────────────────── */}
      <section id="pricing" className="scroll-mt-24 border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="max-w-2xl">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-orange-600">
              Pricing
            </p>
            <h2 className="mt-3 font-serif text-4xl font-medium leading-[1.02] tracking-tight text-ink sm:text-5xl">
              Free for every matric.{" "}
              <span className="italic text-ink/55">Forever.</span>
            </h2>
            <p className="mt-5 max-w-xl font-serif text-base italic text-ink/65">
              Most learners only ever need the free plan. Paid tiers exist for those who want
              more — the AI Coach, document vault and reminders are free for everyone.
            </p>
          </div>

          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plans
              .filter(
                (p) =>
                  p.id?.toLowerCase() !== "ultra" &&
                  p.slug?.toLowerCase() !== "ultra" &&
                  p.name?.toLowerCase() !== "ultra"
              )
              .map((p) => {
                const isLocked = !p.available;
                const isHighlighted = p.recommended;
                const href = isLocked
                  ? "#pricing"
                  : p.id === "free"
                  ? "/onboarding"
                  : "/plans";

                return (
                  <li
                    key={p.id}
                    className={`flex flex-col border-t-2 pt-7 ${
                      isHighlighted ? "border-orange-500" : "border-ink"
                    }`}
                  >
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-serif text-3xl font-medium tracking-tight text-ink">
                        {p.name}
                      </h3>
                      {isHighlighted && (
                        <span className="font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-orange-600">
                          · Most popular
                        </span>
                      )}
                      {isLocked && (
                        <span className="inline-flex items-center gap-1 font-sans text-[9px] font-bold uppercase tracking-[0.2em] text-ink/50">
                          <Lock size={9} />
                          Soon
                        </span>
                      )}
                    </div>

                    <p className="mt-2 font-serif text-3xl text-ink">
                      <span className="font-medium">{p.price}</span>
                      <span className="ml-1 text-base italic text-ink/55">{p.period}</span>
                    </p>
                    {p.tagline && (
                      <p className="mt-1 font-serif text-sm italic text-ink/55">
                        {p.tagline}
                      </p>
                    )}

                    <ul className="mt-6 flex-1 space-y-2">
                      {p.features.map((f) => (
                        <li
                          key={f}
                          className="font-serif text-[15px] leading-snug text-ink/80 before:mr-2 before:font-sans before:text-orange-600 before:content-['—']"
                        >
                          {f}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-8">
                      {isLocked ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 border border-ink/25 px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-ink/40"
                        >
                          Coming soon
                        </button>
                      ) : (
                        <Link
                          href={href}
                          className={`inline-flex w-full items-center justify-center gap-2 px-5 py-3 font-sans text-[11px] font-bold uppercase tracking-[0.2em] transition-colors ${
                            isHighlighted
                              ? "bg-orange-500 text-white hover:bg-ink"
                              : "border border-ink text-ink hover:bg-ink hover:text-paper"
                          }`}
                        >
                          {p.id === "free" ? "Start free" : `Choose ${p.name}`}
                          <ArrowRight size={12} />
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>

          <p className="mt-8 font-sans text-[10px] uppercase tracking-[0.18em] text-ink/45">
            Prices in ZAR · Cancel anytime · BaseBot AI Coach on every plan
          </p>
        </div>
      </section>

      {/* ── Schools sidebar ─────────────────────────────────────── */}
      <section id="schools" className="scroll-mt-24 border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-orange-600">
                For schools, NGOs &amp; counsellors
              </p>
              <h2 className="mt-3 font-serif text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl">
                Give every learner you serve{" "}
                <span className="italic">a career coach.</span>
              </h2>
              <p className="mt-5 max-w-xl font-serif text-lg leading-relaxed text-ink/75">
                Bulk licences for schools and NGOs. Cohort dashboards, deadline broadcasts to
                whole grades, progress reports for your district or funder. Built for Quintile
                1–3 schools, scaled for the rest.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="mailto:info@baseformapplications.com?subject=Schools%20%26%20NGOs%20enquiry"
                  className="inline-flex items-center gap-2 bg-ink px-6 py-3.5 font-sans text-xs font-bold uppercase tracking-[0.2em] text-paper transition-colors hover:bg-orange-500"
                >
                  Talk to us
                  <ArrowUpRight size={13} />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 border border-ink px-6 py-3.5 font-sans text-xs font-bold uppercase tracking-[0.2em] text-ink hover:bg-ink hover:text-paper"
                >
                  Get in touch
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            <ul className="border-l border-ink/15 lg:col-span-5 lg:pl-8">
              {[
                "Cohort dashboards",
                "Bulk onboarding",
                "AI Coach per learner",
                "Deadline broadcasts",
                "Progress reports",
                "Dedicated support",
              ].map((item, i) => (
                <li
                  key={item}
                  className={`flex items-baseline gap-4 py-3 ${
                    i !== 0 ? "border-t border-ink/15" : ""
                  }`}
                >
                  <span className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-orange-600">
                    0{i + 1}
                  </span>
                  <span className="font-serif text-lg text-ink">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-5 py-24 text-center sm:px-8 sm:py-32">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-orange-600">
            Sizokusiza · we&apos;ll help you
          </p>
          <h2 className="mx-auto mt-5 max-w-3xl font-serif text-5xl font-medium leading-[0.98] tracking-tight text-ink sm:text-7xl">
            Your future starts with{" "}
            <span className="italic text-orange-600">one question.</span>
          </h2>
          <p className="mx-auto mt-7 max-w-md font-serif text-lg italic leading-relaxed text-ink/70">
            Ask the AI. Discover your paths. Apply with confidence — for free.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 bg-orange-500 px-9 py-5 font-sans text-xs font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-ink"
            >
              Start free
              <ArrowRight size={14} />
            </Link>
            <Link
              href="#try"
              className="font-serif text-base italic text-ink/65 underline-offset-4 hover:underline"
            >
              …or try the AI right here ↑
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer (masthead style) ─────────────────────────────── */}
      <footer className="bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
          <div className="border-t-2 border-ink pt-8">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <Logo variant="lockup" size="md" />
                <p className="mt-4 max-w-sm font-serif text-base leading-relaxed text-ink/70">
                  AI career guidance for every South African learner. From career question to
                  submitted application — public universities, NSFAS and bursaries, all in one
                  place.
                </p>
                <div className="mt-6 space-y-2">
                  <Link
                    href="mailto:info@baseformapplications.com"
                    className="inline-flex items-center gap-2 font-serif text-sm italic text-ink/70 hover:text-ink"
                  >
                    <Mail size={13} className="text-orange-600" />
                    info@baseformapplications.com
                  </Link>
                  <br />
                  <Link
                    href="mailto:support@baseformapplications.com"
                    className="inline-flex items-center gap-2 font-serif text-sm italic text-ink/70 hover:text-ink"
                  >
                    <MessageCircle size={13} className="text-orange-600" />
                    support@baseformapplications.com
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-2">
                <h4 className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-ink">
                  Sections
                </h4>
                <ul className="mt-5 space-y-2.5 font-serif text-base text-ink/75">
                  <li><Link href="#try" className="hover:text-ink">Ask BaseBot</Link></li>
                  <li><Link href="/how-it-works" className="hover:text-ink">How it works</Link></li>
                  <li><Link href="#pricing" className="hover:text-ink">Pricing</Link></li>
                  <li><Link href="/about" className="hover:text-ink">About</Link></li>
                </ul>
              </div>

              <div className="lg:col-span-2">
                <h4 className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-ink">
                  Partners
                </h4>
                <ul className="mt-5 space-y-2.5 font-serif text-base text-ink/75">
                  <li><Link href="#schools" className="hover:text-ink">Schools</Link></li>
                  <li><Link href="#schools" className="hover:text-ink">NGOs</Link></li>
                  <li>
                    <Link
                      href="mailto:info@baseformapplications.com"
                      className="hover:text-ink"
                    >
                      Press
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="lg:col-span-3">
                <h4 className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-ink">
                  Colophon
                </h4>
                <ul className="mt-5 space-y-2.5 font-serif text-base text-ink/75">
                  <li><Link href="/privacy" className="hover:text-ink">Privacy</Link></li>
                  <li><Link href="/terms" className="hover:text-ink">Terms</Link></li>
                  <li className="font-serif text-sm italic text-ink/60">POPIA compliant</li>
                </ul>
              </div>
            </div>

            <div className="mt-12 flex flex-col items-start justify-between gap-2 border-t border-ink/15 pt-6 sm:flex-row sm:items-center">
              <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink/55">
                © {new Date().getFullYear()} Lumen AI (Pty) Ltd · Made in South Africa
              </span>
              <span className="font-serif text-sm italic text-ink/60">
                Sizokusiza · we&apos;ll help you
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
