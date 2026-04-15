"use client";

import { useEffect, useState } from "react";
import { X, ChevronRight } from "lucide-react";

type Guide = "skhathi" | "ande";

type TourState = { guide: Guide; completed: boolean; step: number };

// ── Characters ────────────────────────────────────────────────────────────────

const GUIDES = {
  skhathi: {
    name: "Skhathi",
    initial: "S",
    avatarFrom: "#f97316",
    avatarTo: "#ea580c",
    accentColor: "#f97316",
    role: "Your Baseform guide",
    steps: [
      {
        title: "Sawubona! 👋",
        text: "I'm Skhathi, your Baseform guide. Let me show you around so you can hit the ground running!",
        target: null,
      },
      {
        title: "Your APS Score",
        text: "This card shows your APS and application progress. Your APS tells you which university programmes you qualify for.",
        target: "aps-card",
      },
      {
        title: "Your Tools",
        text: "These tiles give you quick access to programmes, bursaries, applications, documents and more — everything in one place.",
        target: "quick-access",
      },
      {
        title: "Navigation",
        text: "These tabs take you anywhere in the app. Use them whenever you need to switch sections.",
        target: "bottom-nav",
      },
      {
        title: "You're ready! 🎓",
        text: "That's it! Now let's get those university applications sorted. I'm rooting for you!",
        target: null,
      },
    ],
  },
  ande: {
    name: "Ande",
    initial: "A",
    avatarFrom: "#3b82f6",
    avatarTo: "#2563eb",
    accentColor: "#3b82f6",
    role: "Your Baseform guide",
    steps: [
      {
        title: "Hey there! 👋",
        text: "I'm Ande, and I'll be your Baseform guide. Let me walk you through the app — it'll only take a minute!",
        target: null,
      },
      {
        title: "Your APS Score",
        text: "This is your APS card. It tracks your score and how many of your applications have been submitted.",
        target: "aps-card",
      },
      {
        title: "Your Tools",
        text: "Tap any tile to explore — find qualifying programmes, search for bursaries, upload your documents and more.",
        target: "quick-access",
      },
      {
        title: "Navigation",
        text: "The bottom tabs are your home base. Jump between sections whenever you need to.",
        target: "bottom-nav",
      },
      {
        title: "You're all set! 💪",
        text: "Every application counts. Take it one step at a time — you've got this. I'll be here if you need me!",
        target: null,
      },
    ],
  },
} as const;

// ── Storage ───────────────────────────────────────────────────────────────────

const KEY = "bf_tour_v1";

function loadTour(): TourState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as TourState;
  } catch { /* ignore */ }
  const guide: Guide = Math.random() < 0.5 ? "skhathi" : "ande";
  const fresh: TourState = { guide, completed: false, step: 0 };
  saveTour(fresh);
  return fresh;
}

function saveTour(s: TourState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TourGuide() {
  const [tour, setTour] = useState<TourState | null>(null);
  const [show, setShow] = useState(false);

  // Hydrate from localStorage once mounted
  useEffect(() => {
    const state = loadTour();
    setTour(state);
    if (!state.completed) {
      const t = setTimeout(() => setShow(true), 700);
      return () => clearTimeout(t);
    }
  }, []);

  // Add / remove highlight ring on the target element
  useEffect(() => {
    if (!tour || tour.completed || !show) return;
    const step = GUIDES[tour.guide].steps[tour.step];
    if (!step.target) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) return;
    el.classList.add("tour-highlight");
    // Scroll the element into view (gently)
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return () => el.classList.remove("tour-highlight");
  }, [tour, show]);

  function advance() {
    if (!tour) return;
    const guide = GUIDES[tour.guide];
    const next = tour.step + 1;
    if (next >= guide.steps.length) {
      dismiss();
    } else {
      const updated: TourState = { ...tour, step: next };
      saveTour(updated);
      setTour(updated);
    }
  }

  function dismiss() {
    if (!tour) return;
    const done: TourState = { ...tour, completed: true };
    saveTour(done);
    setTour(done);
    setShow(false);
  }

  if (!tour || tour.completed || !show) return null;

  const guide = GUIDES[tour.guide];
  const step = guide.steps[tour.step];
  const isLast = tour.step === guide.steps.length - 1;
  const totalSteps = guide.steps.length;

  return (
    <>
      {/* Backdrop — click to skip */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={dismiss}
        aria-hidden
      />

      {/* Tour card — sits above bottom nav (80px) */}
      <div className="tour-card-enter fixed bottom-20 left-0 right-0 z-50 px-4">
        <div className="mx-auto max-w-sm">
          <div className="rounded-3xl border border-gray-100 bg-white shadow-2xl overflow-hidden">

            {/* Character header */}
            <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-gray-50">
              {/* Avatar */}
              <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-md shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${guide.avatarFrom}, ${guide.avatarTo})`,
                }}
              >
                <span className="text-lg font-black text-white">{guide.initial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{guide.name}</p>
                <p className="text-[11px] text-gray-400">{guide.role}</p>
              </div>
              <button
                onClick={dismiss}
                aria-label="Skip tour"
                className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            {/* Message */}
            <div className="px-5 py-4">
              <p className="text-[15px] font-bold text-gray-900 leading-snug">{step.title}</p>
              <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{step.text}</p>
            </div>

            {/* Footer — step dots + actions */}
            <div className="px-5 pb-5 flex items-center justify-between gap-3">
              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <span
                    key={i}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: i === tour.step ? "18px" : "6px",
                      backgroundColor: i === tour.step ? guide.accentColor : "#e5e7eb",
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                {!isLast && (
                  <button
                    onClick={dismiss}
                    className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Skip
                  </button>
                )}
                <button
                  onClick={advance}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white transition-opacity active:opacity-80"
                  style={{ backgroundColor: guide.accentColor }}
                >
                  {isLast ? "Let's go!" : "Next"}
                  {!isLast && <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
