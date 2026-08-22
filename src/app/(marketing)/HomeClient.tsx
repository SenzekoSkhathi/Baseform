"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Send,
  Check,
  Clock,
  RotateCcw,
  Compass,
  GraduationCap,
  ListChecks,
  Bell,
  FolderLock,
  MessageCircle,
  Trophy,
  Calculator,
  BookOpen,
  Target,
  Users,
  BarChart3,
  HeartHandshake,
  Mail,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";

/* ═══════════════════════════════════════════════════════════════════════════
   SCROLL REVEAL HOOK — IntersectionObserver for .reveal elements
   ═══════════════════════════════════════════════════════════════════════════ */
function useScrollReveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: "100px 0px 0px 0px" }
    );
    
    // Function to find and observe elements
    const observeAll = () => {
      document.querySelectorAll(".reveal, .stat-enter, .feat-visual-animate, .thesis").forEach((el) => {
        if (!el.classList.contains("in")) io.observe(el);
      });
    };

    // Run immediately and after a short delay for hydration
    observeAll();
    const timeoutId = setTimeout(observeAll, 200);

    // Also observe DOM changes in case sections render late
    const mutationObserver = new MutationObserver(() => observeAll());
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timeoutId);
      io.disconnect();
      mutationObserver.disconnect();
    };
  }, []);
}

/* ═══════════════════════════════════════════════════════════════════════════
   HERO APP CARDS — Floating UI cards showing the product in action
   ═══════════════════════════════════════════════════════════════════════════ */
function HeroVisual() {
  return (
    <div className="relative w-full aspect-[4/5]">
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 size-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-200/40 blur-3xl"
      />

      {/* Card 1: Applications Tracker */}
      <div className="hero-card absolute left-[3%] top-[6%] w-[58%] rounded-2xl border border-orange-100 bg-white p-4 shadow-[0_18px_45px_rgba(249,115,22,0.18)]" style={{ '--card-rotate': '-5deg' } as React.CSSProperties}>
        <div className="flex items-center justify-between">
          <p className="label text-[9px]">Applications</p>
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-[var(--orange-deep)]">
            4 / 6
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
          66<span className="text-base text-gray-400">%</span>
        </p>
        <p className="text-[10px] font-medium text-gray-500">complete</p>
        <div className="mt-2 h-1.5 w-full rounded-full bg-orange-50">
          <div
            style={{ width: "66%" }}
            aria-hidden="true"
            className="h-full rounded-full bg-[var(--orange)]"
          />
        </div>
        <ul className="mt-3 space-y-1.5">
          {["Wits", "UJ", "UP", "UCT"].map((uni) => (
            <li
              key={uni}
              className="flex items-center gap-2 text-[11px]"
            >
              <span className="grid size-3.5 shrink-0 place-items-center rounded-full bg-[var(--orange)] text-white">
                <Check size={8} strokeWidth={3.5} />
              </span>
              <span className="text-gray-700">{uni}</span>
            </li>
          ))}
          <li className="flex items-center gap-2 text-[11px]">
            <span className="grid size-3.5 shrink-0 place-items-center rounded-full border border-orange-200 bg-white text-[var(--orange)]">
              <Clock size={7} />
            </span>
            <span className="font-semibold text-gray-900">Stellenbosch</span>
          </li>
        </ul>
      </div>

      {/* Card 2: Next Deadline */}
      <div className="hero-card absolute left-1/2 top-[38%] w-[60%] -translate-x-1/2 rounded-2xl border border-orange-100 bg-white p-4 shadow-[0_22px_55px_rgba(249,115,22,0.22)]" style={{ '--card-rotate': '3deg' } as React.CSSProperties}>
        <div className="flex items-center justify-between">
          <p className="label text-[9px]">Next deadline</p>
          <span className="flex items-center gap-1 rounded-full bg-[var(--orange)] px-2 py-0.5 text-[9px] font-bold text-white">
            <Clock size={8} strokeWidth={3} />
            62 days
          </span>
        </div>
        <p className="mt-2.5 text-lg font-bold leading-tight tracking-tight text-gray-900">
          Stellenbosch
        </p>
        <p className="text-[11px] text-gray-500">BCom Economics</p>
        <div className="mt-3 flex items-baseline gap-2 rounded-xl bg-orange-50 px-3 py-2">
          <p className="text-2xl font-bold tracking-tight text-[var(--orange-deep)]">
            30
          </p>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--orange-deep)]">
              June
            </p>
            <p className="text-[9px] text-[var(--orange)]/80">2026</p>
          </div>
        </div>
      </div>

      {/* Card 3: Documents */}
      <div className="hero-card absolute bottom-[6%] right-[3%] w-[55%] rounded-2xl border border-orange-100 bg-white p-4 shadow-[0_18px_45px_rgba(249,115,22,0.18)]" style={{ '--card-rotate': '6deg' } as React.CSSProperties}>
        <div className="flex items-center justify-between">
          <p className="label text-[9px]">Documents</p>
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-[var(--orange-deep)]">
            6 / 7
          </span>
        </div>
        <ul className="mt-2.5 space-y-1.5">
          {["Certified ID", "Matric results", "Motivation letter"].map(
            (doc) => (
              <li
                key={doc}
                className="flex items-center gap-2 text-[11px]"
              >
                <span className="grid size-3.5 shrink-0 place-items-center rounded-full bg-[var(--orange)] text-white">
                  <Check size={8} strokeWidth={3.5} />
                </span>
                <span className="text-gray-700 line-through decoration-orange-300">
                  {doc}
                </span>
              </li>
            )
          )}
          <li className="flex items-center gap-2 text-[11px]">
            <span className="grid size-3.5 shrink-0 place-items-center rounded-full border border-orange-200 bg-white" />
            <span className="font-semibold text-gray-900">
              Reference letter
            </span>
          </li>
        </ul>
        <div className="mt-2.5 h-1 w-full rounded-full bg-orange-50">
          <div
            style={{ width: "86%" }}
            aria-hidden="true"
            className="h-full rounded-full bg-[var(--orange)]"
          />
        </div>
      </div>

      {/* Caption */}
      <p className="absolute -bottom-6 left-0 right-0 text-center label text-[9px] text-[var(--ink-soft)]/45">
        Every application, deadline &amp; document — one place.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TRY AI — Live BaseBot playground
   ═══════════════════════════════════════════════════════════════════════════ */
function TryAi() {
  const [input, setInput] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState<string>("");

  async function handleSubmit() {
    const value = input.trim();
    if (!value) return;
    setSubmitted(value);
    setReply("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/basebot/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.reply) {
        setError(
          data.error ?? "AI is unavailable right now. Try again in a moment."
        );
      } else {
        setReply(data.reply);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border-t border-b border-[var(--line)] py-10 sm:py-12">
      <p className="label text-[11px] text-[var(--ink-soft)]/55">
        BaseBot · A live conversation
      </p>
      <label
        htmlFor="ai-input"
        className="mt-3 block text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl"
      >
        Ask anything about your future.
      </label>
      <p className="mt-3 text-base text-[var(--ink-soft)] sm:text-lg">
        Real AI. Real answers. No sign-up needed to try.
      </p>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <input
          id="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="I got 55% in Maths. What degrees can I get into?"
          maxLength={500}
          disabled={loading}
          className="w-full border-b-2 border-[var(--ink)] bg-transparent px-1 py-3 text-lg placeholder:text-[var(--ink)]/35 focus:border-[var(--orange)] focus:outline-none sm:text-xl"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          className="btn btn-dark group inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] disabled:opacity-50"
        >
          Ask BaseBot
          <Send
            size={13}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </button>
      </div>

      {/* Reply Area */}
      {submitted && (
        <div className="mt-8 space-y-4">
          <div className="flex w-full justify-end">
            <div className="max-w-[80%] rounded-2xl bg-gray-100 px-4 py-3 text-sm font-medium text-gray-900">
              {submitted}
            </div>
          </div>
          <div className="flex w-full justify-start gap-3">
            <div className="w-8 h-8 shrink-0 rounded-xl bg-[var(--orange)] flex items-center justify-center">
              <Image src="/icon.svg" alt="Bot" width={16} height={16} />
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-[var(--line)] px-5 py-4 shadow-sm text-sm text-gray-800 leading-relaxed">
              {loading && (
                <div className="flex items-center gap-2 text-[var(--orange)]">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--orange)]" />
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-[var(--orange)]"
                    style={{ animationDelay: "0.2s" }}
                  />
                  <div
                    className="h-2 w-2 animate-bounce rounded-full bg-[var(--orange)]"
                    style={{ animationDelay: "0.4s" }}
                  />
                </div>
              )}
              {error && <span className="text-red-500">{error}</span>}
              {!loading && !error && reply && (
                <pre className="whitespace-pre-wrap font-sans">
                  {reply.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
                    part.startsWith("**") && part.endsWith("**") ? (
                      <strong key={i} className="font-bold text-gray-900">
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
        </div>
      )}

      {submitted && !loading && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => {
              setSubmitted(null);
              setInput("");
              setReply("");
            }}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--ink-soft)] hover:text-[var(--ink)]"
          >
            <RotateCcw size={12} /> Reset Chat
          </button>
        </div>
      )}

      <p className="mt-4 text-xs text-[var(--ink-soft)]/50">
        Free. No card. Press enter to ask, or type your own question.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURE ORBIT — Circular diagram showing all 8 capabilities
   ═══════════════════════════════════════════════════════════════════════════ */
const ORBIT_ITEMS = [
  {
    label: "Career guidance",
    icon: Compass,
    pos: { top: "0%", left: "50%" },
  },
  {
    label: "University matching",
    icon: GraduationCap,
    pos: { top: "14.6%", left: "85.4%" },
  },
  {
    label: "Application tracking",
    icon: ListChecks,
    pos: { top: "50%", left: "100%" },
  },
  {
    label: "Deadline reminders",
    icon: Bell,
    pos: { top: "85.4%", left: "85.4%" },
  },
  {
    label: "Document vault",
    icon: FolderLock,
    pos: { top: "100%", left: "50%" },
  },
  {
    label: "AI Coach · BaseBot",
    icon: MessageCircle,
    pos: { top: "85.4%", left: "14.6%" },
  },
  {
    label: "Bursary discovery",
    icon: Trophy,
    pos: { top: "50%", left: "0%" },
  },
  {
    label: "APS calculator",
    icon: Calculator,
    pos: { top: "14.6%", left: "14.6%" },
  },
];

function FeatureOrbit() {
  return (
    <>
      {/* Desktop orbit */}
      <div className="relative mx-auto mt-16 hidden aspect-square w-full max-w-[640px] lg:block">
        <div
          aria-hidden="true"
          className="orbit-ring absolute inset-[6%] rounded-full border border-[var(--line)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-[22%] rounded-full border border-[var(--line)]/60"
        />

        {/* Center Logo */}
        <div className="orbit-center absolute left-1/2 top-1/2 flex aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-full border border-orange-200 bg-[var(--cream)] shadow-[0_18px_45px_rgba(249,115,22,0.18)]">
          <Logo variant="lockup" size="md" />
          <p className="label text-[9px]">Sizokusiza</p>
        </div>

        {/* Orbit items */}
        {ORBIT_ITEMS.map((item) => (
          <div
            key={item.label}
            style={item.pos}
            className="absolute -translate-x-1/2 -translate-y-1/2"
          >
            <div className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[var(--line)] bg-[var(--cream)] px-4 py-2.5 shadow-[0_8px_24px_rgba(26,23,20,0.06)]">
              <span className="grid size-7 place-items-center rounded-full bg-[var(--orange-soft)] text-[var(--orange-deep)]">
                <item.icon size={14} />
              </span>
              <span className="text-[12px] font-bold uppercase tracking-[0.16em]">
                {item.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile grid */}
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:hidden">
        {ORBIT_ITEMS.map((item) => (
          <div
            key={item.label}
            className="inline-flex items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--cream)] px-4 py-3"
          >
            <span className="grid size-8 place-items-center rounded-full bg-[var(--orange-soft)] text-[var(--orange-deep)]">
              <item.icon size={15} />
            </span>
            <span className="text-[12px] font-bold uppercase tracking-[0.16em]">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUDIENCE TABS — "For Learners" / "For Schools & NGOs"
   ═══════════════════════════════════════════════════════════════════════════ */
function AudienceTabs() {
  const [tab, setTab] = useState<"learners" | "schools">("learners");

  const learnerCards = [
    {
      icon: GraduationCap,
      title: "Matched to the right degrees",
      desc: "Enter your marks once and Baseform surfaces the programmes your APS and subjects actually qualify you for — no guessing, no blind applications.",
    },
    {
      icon: Trophy,
      title: "Bursaries that fit you",
      desc: "Get matched to funding you genuinely qualify for — NSFAS, Funza Lushaka, corporate bursaries and more.",
    },
    {
      icon: MessageCircle,
      title: "AI guidance, any time",
      desc: "Ask BaseBot anything about your future — in plain language. It knows every public university and bursary in South Africa.",
    },
    {
      icon: ListChecks,
      title: "Track every application",
      desc: "Upload your documents once. Track every application, every deadline, every outcome — from your phone.",
    },
  ];

  const schoolCards = [
    {
      icon: Users,
      title: "Bulk school licences",
      desc: "Give every learner in your school access to AI career guidance, application tracking, and bursary matching.",
    },
    {
      icon: BarChart3,
      title: "Analytics dashboard",
      desc: "See how your learners are progressing — applications submitted, offers received, bursaries secured.",
    },
    {
      icon: HeartHandshake,
      title: "Partner support",
      desc: "Dedicated onboarding, training, and ongoing support for educators and counsellors. Contact us for details.",
    },
  ];

  return (
    <>
      <div className="aud-tabs reveal">
        <button
          type="button"
          className={`aud-tab ${tab === "learners" ? "active" : ""}`}
          onClick={() => setTab("learners")}
        >
          For learners
        </button>
        <button
          type="button"
          className={`aud-tab ${tab === "schools" ? "active" : ""}`}
          onClick={() => setTab("schools")}
        >
          For schools &amp; NGOs
        </button>
      </div>

      <div className={`aud-panel ${tab === "learners" ? "active" : ""}`}>
        <div className="aud-grid">
          {learnerCards.map((c) => (
            <article key={c.title} className="aud-card card-hover">
              <div className="ic">
                <c.icon />
              </div>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </article>
          ))}
        </div>
      </div>

      <div className={`aud-panel ${tab === "schools" ? "active" : ""}`}>
        <div className="aud-grid three">
          {schoolCards.map((c) => (
            <article key={c.title} className="aud-card card-hover">
              <div className="ic">
                <c.icon />
              </div>
              <h3>{c.title}</h3>
              <p>{c.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function HomeClient() {
  useScrollReveal();

  return (
    <>
      <MarketingHeader />

      <main className="relative min-h-screen">
        {/* ── HERO ────────────────────────────────────────────────── */}
        <section className="sec" style={{ paddingBottom: 0 }}>
          <div className="wrap">
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-12 items-center">
              {/* Text */}
              <div className="lg:col-span-7">
                <div className="flex items-center gap-2.5 mb-4 hero-enter">
                  <span className="w-2 h-2 rounded-full bg-[var(--orange)] shadow-[0_0_0_4px_var(--orange-soft)]" />
                  <span className="label">The application co-pilot</span>
                </div>

                <h1 className="display hero-enter hero-enter-d1">
                  Your future shouldn&apos;t depend on your{" "}
                  <span className="accent">postcode.</span>
                </h1>

                <p className="lead mt-6 hero-enter hero-enter-d2">
                  Baseform is the AI career coach every South African matric
                  should have. Ask it anything. Find degrees that fit. Discover
                  bursaries you qualify for. Apply to all 26 public universities
                  — from one place. Free, forever.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 hero-enter hero-enter-d3">
                  <Link href="/onboarding" className="btn btn-primary">
                    Start free
                    <ArrowRight size={16} />
                  </Link>
                  <Link href="#how" className="btn btn-ghost">
                    See how it works
                  </Link>
                </div>

                <div className="mt-6 flex items-center gap-2.5 flex-wrap text-sm text-[var(--ink-soft)] hero-enter hero-enter-d4">
                  <span className="font-semibold text-[var(--ink)]">
                    26
                  </span>{" "}
                  universities
                  <span className="w-1 h-1 rounded-full bg-[var(--line)]" />
                  <span className="font-semibold text-[var(--ink)]">
                    150+
                  </span>{" "}
                  bursaries
                  <span className="w-1 h-1 rounded-full bg-[var(--line)]" />
                  <span className="font-semibold text-[var(--ink)]">
                    Free
                  </span>
                  , forever
                </div>
              </div>

              {/* Visual */}
              <figure className="lg:col-span-5 hero-enter hero-enter-d3">
                <HeroVisual />
              </figure>
            </div>
          </div>
        </section>

        {/* ── TRUST MARQUEE ───────────────────────────────────────── */}
        <section className="trust mt-16">
          <div className="marquee">
            {Array(3)
              .fill(0)
              .map((_, idx) => (
                <div key={idx} className="flex gap-14">
                  <span>Tracking applications for UCT &amp; Wits</span>
                  <span>Matching 150+ Bursaries</span>
                  <span>Real-time APS Calculator</span>
                  <span>Instant AI Guidance</span>
                  <span>All 26 Public Universities</span>
                </div>
              ))}
          </div>
        </section>

        {/* ── DARK THESIS ─────────────────────────────────────────── */}
        <section className="sec" style={{ paddingBottom: 0 }}>
          <div className="thesis reveal">
            <div className="wrap">
              <span className="label" style={{ color: "var(--orange)" }}>
                About our philosophy
              </span>
              <h2 className="mt-5">
                <span className="muted">
                  In some South African schools, a learner has a counsellor,
                  alumni networks, and parents who&apos;ve been to varsity.
                </span>{" "}
                <span className="accent">Most don&apos;t.</span> That
                isn&apos;t a talent gap — it&apos;s a guidance gap.
              </h2>

              <div className="thesis-stats">
                <div className="stat-enter reveal">
                  <div className="stat-number">800K+</div>
                  <p>students write matric every year</p>
                </div>
                <div className="stat-enter reveal d1">
                  <div className="stat-number">
                    70<span className="accent">%</span>
                  </div>
                  <p>qualify for university</p>
                </div>
                <div className="stat-enter reveal d2">
                  <div className="stat-number">
                    20<span className="accent">%</span>
                  </div>
                  <p>
                    actually apply — the gap is infrastructure, not ambition
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PROBLEM CARDS ───────────────────────────────────────── */}
        <section className="sec">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="label">The problem</span>
              <h2 className="heading-lg mt-4">
                For decades, every family has accepted the{" "}
                <span className="accent">26-portal scramble</span> as reality.
              </h2>
              <p>
                Different portals. Different APS rules. Different deadlines. A
                separate funding system. The student who finishes school first
                isn&apos;t always the one who applies — it&apos;s the one who
                can navigate the maze.
              </p>
            </div>

            <div className="prob-grid" style={{ perspective: '1200px' }}>
              {[
                {
                  url: "up.ac.za/applications",
                  title: "Undergrad Applications",
                  desc: "APS calculator · 18 documents required before you even begin.",
                },
                {
                  url: "wits.ac.za/study",
                  title: "How to apply — Wits",
                  desc: "Different APS rules entirely. Closes on a different date.",
                },
                {
                  url: "nsfas.org.za/funding",
                  title: "NSFAS Funding",
                  desc: "A separate portal, with its own separate deadline.",
                },
                {
                  url: "uct.ac.za/apply",
                  title: "UCT Admissions",
                  desc: "NBT required — and it has to be booked somewhere else.",
                },
              ].map((p, i) => (
                <div
                  key={p.url}
                  className={`prob reveal ${i > 0 ? `d${i}` : ""}`}
                >
                  <div className="url">{p.url}</div>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TRY BASEBOT (Live AI) ───────────────────────────────── */}
        <section id="try" className="sec scroll-mt-24" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <p className="label reveal">Demonstration</p>
                <h2 className="mt-3 heading-lg reveal d1">
                  Try it before you trust it.
                </h2>
              </div>
              <div className="lg:col-span-9 reveal d2">
                <TryAi />
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS (Alternating Features) ─────────────────── */}
        <section id="how" className="sec scroll-mt-24" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="label">The method</span>
              <h2 className="heading-lg mt-4">
                Three steps. From <span className="accent">question</span> to{" "}
                <span className="accent">acceptance.</span>
              </h2>
              <p>
                You don&apos;t need to know what you want to be. You just need
                to start asking.
              </p>
            </div>

            {/* Feature Block 1: Ask */}
            <div className="feat reveal">
              <div className="feat-text">
                <span className="tag">AI career coach</span>
                <h3>
                  Tell BaseBot what you got. Get answers that actually{" "}
                  <span className="accent">help.</span>
                </h3>
                <p>
                  The AI knows every public university and bursary in South
                  Africa. It&apos;s like having a world-class career counselor
                  in your pocket, available 24/7.
                </p>
                <ul>
                  <li>
                    <Check size={20} />
                    Knows all 26 universities and their requirements
                  </li>
                  <li>
                    <Check size={20} />
                    Available 24/7 — no office hours, no waiting
                  </li>
                </ul>
              </div>
              <div className="feat-visual feat-visual-animate reveal d2">
                <div className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-white p-6 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-[var(--orange)] flex items-center justify-center">
                      <Image src="/icon.svg" alt="Bot" width={16} height={16} />
                    </div>
                    <span className="text-sm font-bold">BaseBot</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[var(--orange)] text-white px-4 py-2.5 text-sm">
                        Can I study medicine with a 60% in Physics?
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-gray-50 border border-gray-100 text-gray-800 px-4 py-2.5 text-sm leading-relaxed">
                        Medical programs typically require 70%+ in Physics. But
                        let&apos;s look at BSc Physiotherapy or Radiography —
                        both accept 60%!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Block 2: Match */}
            <div className="feat reveal">
              <div className="feat-text">
                <span className="tag">Degree &amp; bursary matching</span>
                <h3>
                  Personalised programmes ranked by what you can{" "}
                  <span className="accent">actually</span> get into.
                </h3>
                <p>
                  A shortlist of degrees and bursaries that fit your marks and
                  your life — not just the obvious ones your friends are picking.
                </p>
                <ul>
                  <li>
                    <Check size={20} />
                    Instantly check APS against minimum requirements
                  </li>
                  <li>
                    <Check size={20} />
                    Filter by faculty, qualification, or university
                  </li>
                </ul>
              </div>
              <div className="feat-visual feat-visual-animate reveal d2">
                <div className="w-full max-w-sm rounded-2xl border border-teal-100 bg-white p-6 shadow-xl shadow-teal-500/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center text-2xl">
                      🎓
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">BCom Accounting</p>
                      <p className="text-sm text-gray-500">
                        University of Johannesburg
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Your Match
                    </span>
                    <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-bold">
                      Excellent
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Block 3: Apply */}
            <div className="feat reveal">
              <div className="feat-text">
                <span className="tag">Application tracking</span>
                <h3>
                  Upload once. Track everything. Never miss a{" "}
                  <span className="accent">deadline.</span>
                </h3>
                <p>
                  Upload your documents once. Track every application, every
                  deadline, every outcome — from your phone, even on a slow
                  connection.
                </p>
                <ul>
                  <li>
                    <Check size={20} />
                    One document vault for all applications
                  </li>
                  <li>
                    <Check size={20} />
                    Deadline reminders so nothing slips through
                  </li>
                </ul>
              </div>
              <div className="feat-visual feat-visual-animate reveal d2">
                <div className="w-full max-w-sm space-y-3">
                  <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-xl shadow-blue-500/10 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">
                        UCT Application
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Submitted &bull; Awaiting Decision
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                      <Check size={20} />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-white/60 p-5 flex items-center justify-between opacity-50">
                    <div>
                      <p className="font-bold text-gray-900">
                        Wits Application
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Draft &bull; Missing ID copy
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURE ORBIT ───────────────────────────────────────── */}
        <section className="sec border-t border-b border-[var(--line)]" style={{ background: "var(--cream-2)" }}>
          <div className="wrap">
            <div className="max-w-2xl reveal">
              <span className="label">What we do</span>
              <h2 className="heading-lg mt-4">
                One platform.{" "}
                <span className="text-[var(--ink-soft)]">
                  Eight ways we help.
                </span>
              </h2>
              <p className="mt-4 text-[var(--ink-soft)] max-w-xl">
                Every part of the matric application journey, in one place —
                from the first question to the offer letter.
              </p>
            </div>
            <FeatureOrbit />
          </div>
        </section>

        {/* ── COVERAGE ────────────────────────────────────────────── */}
        <section className="sec">
          <div className="wrap">
            <div className="grid gap-8 lg:grid-cols-12 reveal">
              <div className="lg:col-span-4">
                <span className="label">Coverage</span>
                <h2 className="heading-lg mt-4">
                  All 26.{" "}
                  <span className="text-[var(--ink-soft)]">
                    Plus the bursaries.
                  </span>
                </h2>
                <p className="mt-4 text-[var(--ink-soft)] max-w-sm">
                  Every public university in South Africa. NSFAS. The bursaries
                  that actually pay.
                </p>
              </div>
              <div className="lg:col-span-8 lg:pl-8">
                <p className="label text-[var(--ink-soft)]/45">Universities</p>
                <p className="mt-3 text-2xl font-medium leading-[1.4] sm:text-3xl">
                  UCT · Wits · UP · Stellenbosch · UJ · UKZN · NWU · UNISA ·
                  Rhodes · UFS · UWC · NMU · CPUT · DUT · TUT · VUT · MUT · CUT
                  · SPU · UMP · UFH · UNIVEN · UL · WSU · SMU · UNIZULU
                </p>
                <p className="mt-10 label text-[var(--ink-soft)]/45">
                  Funders &amp; bursaries
                </p>
                <p className="mt-3 text-2xl font-medium leading-[1.4] sm:text-3xl accent">
                  NSFAS · Funza Lushaka · Sasol · Investec · ISFAP · Allan Gray
                </p>
                <p className="mt-8 text-xs uppercase tracking-[0.18em] text-[var(--ink-soft)]/45">
                  Missing one? Tell us — we&apos;ll add it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── AUDIENCE TABS ───────────────────────────────────────── */}
        <section id="schools" className="sec scroll-mt-24 border-t border-[var(--line)]">
          <div className="wrap">
            <div className="sec-head reveal">
              <span className="label">Built for everyone</span>
              <h2 className="heading-lg mt-4">
                Built for both sides of the{" "}
                <span className="accent">application.</span>
              </h2>
              <p>
                One platform does the work of a dozen portals — for the students
                applying, and the institutions supporting them.
              </p>
            </div>
            <AudienceTabs />
          </div>
        </section>

        {/* ── FINAL CTA ───────────────────────────────────────────── */}
        <section className="sec" style={{ paddingTop: "clamp(48px, 7vw, 96px)", paddingBottom: 0 }}>
          <div className="final-cta reveal">
            <h2>
              If this is for you, the rest is just{" "}
              <span className="underline underline-offset-4 decoration-2 decoration-white/40">
                one click.
              </span>
            </h2>
            <p>
              Talent is universal. Access to opportunity is not. Start your
              application journey today — or get in touch if you&apos;re a
              school or NGO.
            </p>
            <div className="flex flex-wrap gap-3 relative z-10">
              <Link href="/onboarding" className="btn btn-dark">
                Start free
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/contact"
                className="btn"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.25)",
                }}
              >
                Get in touch
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
