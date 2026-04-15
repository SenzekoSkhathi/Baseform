"use client";

import { useEffect, useState } from "react";
import { X, ChevronRight } from "lucide-react";

type Guide = "skhathi" | "ande";
type TourState = { guide: Guide; completed: boolean; step: number };

// ── Avatars ───────────────────────────────────────────────────────────────────

function SkhathiAvatar() {
  return (
    <svg viewBox="0 0 64 64" width="48" height="48" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sk-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <clipPath id="sk-clip">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>

      {/* Background */}
      <circle cx="32" cy="32" r="32" fill="url(#sk-bg)" />

      {/* Shoulders */}
      <ellipse cx="32" cy="68" rx="26" ry="14" fill="#fff7ed" clipPath="url(#sk-clip)" />

      {/* Neck */}
      <rect x="27.5" y="50" width="9" height="12" rx="3" fill="#c68642" />

      {/* Afro — side puffs first (behind face) */}
      <ellipse cx="15" cy="30" rx="7" ry="9" fill="#1a0800" />
      <ellipse cx="49" cy="30" rx="7" ry="9" fill="#1a0800" />
      {/* Main afro dome */}
      <ellipse cx="32" cy="22" rx="16" ry="15" fill="#1a0800" />

      {/* Ears */}
      <ellipse cx="19.5" cy="37" rx="2.5" ry="3" fill="#c68642" />
      <ellipse cx="44.5" cy="37" rx="2.5" ry="3" fill="#c68642" />

      {/* Face */}
      <ellipse cx="32" cy="37" rx="13" ry="14" fill="#c68642" />

      {/* Eyebrows */}
      <path d="M24 29.5 Q27 27.5 30.5 29" stroke="#1a0800" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M33.5 29 Q37 27.5 40 29.5" stroke="#1a0800" strokeWidth="1.6" fill="none" strokeLinecap="round" />

      {/* Eyes */}
      <ellipse cx="27" cy="33" rx="2.3" ry="2.6" fill="#1a0800" />
      <ellipse cx="37" cy="33" rx="2.3" ry="2.6" fill="#1a0800" />
      <circle cx="28" cy="32" r="0.85" fill="white" />
      <circle cx="38" cy="32" r="0.85" fill="white" />

      {/* Nose */}
      <path d="M30 38.5 Q32 40.5 34 38.5" stroke="#a0522d" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.55" />

      {/* Smile + teeth */}
      <path d="M26 43 Q32 48 38 43" fill="#8b3a22" />
      <path d="M27.5 43 Q32 45.5 36.5 43" fill="white" />

      {/* Top of afro (layered on top) */}
      <ellipse cx="32" cy="20" rx="13.5" ry="12" fill="#1a0800" />
    </svg>
  );
}

function AndeAvatar() {
  return (
    <svg viewBox="0 0 64 64" width="48" height="48" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="an-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <clipPath id="an-clip">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>

      {/* Background */}
      <circle cx="32" cy="32" r="32" fill="url(#an-bg)" />

      {/* Shoulders */}
      <ellipse cx="32" cy="68" rx="26" ry="14" fill="#eff6ff" clipPath="url(#an-clip)" />

      {/* Neck */}
      <rect x="27.5" y="50" width="9" height="12" rx="3" fill="#b87333" />

      {/* Short cropped hair — cap shape */}
      <ellipse cx="32" cy="24" rx="14" ry="11" fill="#1a0800" />
      {/* Hairline fade at sides */}
      <ellipse cx="18.5" cy="30" rx="4" ry="6" fill="#1a0800" />
      <ellipse cx="45.5" cy="30" rx="4" ry="6" fill="#1a0800" />

      {/* Ears */}
      <ellipse cx="18.5" cy="37" rx="2.5" ry="3" fill="#b87333" />
      <ellipse cx="45.5" cy="37" rx="2.5" ry="3" fill="#b87333" />

      {/* Face */}
      <ellipse cx="32" cy="38" rx="13" ry="13.5" fill="#b87333" />

      {/* Eyebrows */}
      <path d="M24.5 30.5 Q27.5 28.5 31 30" stroke="#1a0800" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <path d="M33 30 Q36.5 28.5 39.5 30.5" stroke="#1a0800" strokeWidth="1.7" fill="none" strokeLinecap="round" />

      {/* Eyes */}
      <ellipse cx="27.5" cy="34" rx="2.3" ry="2.5" fill="#1a0800" />
      <ellipse cx="36.5" cy="34" rx="2.3" ry="2.5" fill="#1a0800" />
      <circle cx="28.5" cy="33" r="0.85" fill="white" />
      <circle cx="37.5" cy="33" r="0.85" fill="white" />

      {/* Nose */}
      <path d="M30.5 39.5 Q32 41.5 33.5 39.5" stroke="#8b4513" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.55" />

      {/* Smile + teeth */}
      <path d="M27 44 Q32 49 37 44" fill="#7a3010" />
      <path d="M28.5 44 Q32 46.5 35.5 44" fill="white" />

      {/* Hair top detail */}
      <ellipse cx="32" cy="22" rx="12" ry="9" fill="#1a0800" />
    </svg>
  );
}

// ── Characters ────────────────────────────────────────────────────────────────

const GUIDES = {
  skhathi: {
    name: "Skhathi",
    Avatar: SkhathiAvatar,
    accentColor: "#f97316",
    role: "Your Baseform guide",
    steps: [
      {
        title: "Hey, welcome! 👋",
        text: "I'm Skhathi, your Baseform guide. Let me show you around so you can hit the ground running!",
        target: null,
      },
      {
        title: "Applications Progress",
        text: "This card tracks how many of your applications have been submitted and how many are still remaining. Tap the APS tab to also see your score.",
        target: "aps-card",
      },
      {
        title: "Your Tools",
        text: "These tiles give you quick access to programmes, bursaries, applications, documents and more — everything you need in one place.",
        target: "quick-access",
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
    Avatar: AndeAvatar,
    accentColor: "#3b82f6",
    role: "Your Baseform guide",
    steps: [
      {
        title: "Hey there! 👋",
        text: "I'm Ande, and I'll be your Baseform guide. Let me walk you through the app — it'll only take a minute!",
        target: null,
      },
      {
        title: "Applications Progress",
        text: "This card shows your submitted, remaining, and total applications at a glance. You can also flip to your APS score using the tab.",
        target: "aps-card",
      },
      {
        title: "Your Tools",
        text: "Tap any tile to explore — find qualifying programmes, search for bursaries, upload your documents and more.",
        target: "quick-access",
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
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return () => el.classList.remove("tour-highlight");
  }, [tour, show]);

  function advance() {
    if (!tour) return;
    const steps = GUIDES[tour.guide].steps;
    const next = tour.step + 1;
    if (next >= steps.length) {
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
  const { Avatar } = guide;
  const step = guide.steps[tour.step];
  const isLast = tour.step === guide.steps.length - 1;
  const totalSteps = guide.steps.length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={dismiss} aria-hidden />

      {/* Tour card */}
      <div className="tour-card-enter fixed bottom-6 left-0 right-0 z-50 px-4">
        <div className="mx-auto max-w-sm">
          <div className="rounded-3xl border border-gray-100 bg-white shadow-2xl overflow-hidden">

            {/* Character header */}
            <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-gray-50">
              <div className="h-12 w-12 rounded-2xl overflow-hidden shrink-0 shadow-md">
                <Avatar />
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

            {/* Footer */}
            <div className="px-5 pb-5 flex items-center justify-between gap-3">
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
