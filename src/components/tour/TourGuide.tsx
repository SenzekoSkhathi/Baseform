"use client";

import { useEffect, useState } from "react";
import { X, ChevronRight } from "lucide-react";

type Guide = "skhathi" | "ande";
type TourState = { guide: Guide; completed: boolean; step: number; userId?: string };
type GradeYear = "Grade 11" | "Grade 12" | null;

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

      {/* Short cropped hair — cap shape */}
      <ellipse cx="32" cy="23" rx="14" ry="11" fill="#1a0800" />
      {/* Hairline fade at sides */}
      <ellipse cx="18.5" cy="29" rx="4" ry="6" fill="#1a0800" />
      <ellipse cx="45.5" cy="29" rx="4" ry="6" fill="#1a0800" />

      {/* Ears */}
      <ellipse cx="19" cy="37" rx="2.5" ry="3" fill="#c68642" />
      <ellipse cx="45" cy="37" rx="2.5" ry="3" fill="#c68642" />

      {/* Face — slightly wider/squarer jaw for masculine look */}
      <ellipse cx="32" cy="38" rx="13" ry="13" fill="#c68642" />

      {/* Eyebrows — straighter/thicker for masculine look */}
      <path d="M24 30 Q27.5 28 31 30" stroke="#1a0800" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M33 30 Q36.5 28 40 30" stroke="#1a0800" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Eyes */}
      <ellipse cx="27.5" cy="34" rx="2.3" ry="2.5" fill="#1a0800" />
      <ellipse cx="36.5" cy="34" rx="2.3" ry="2.5" fill="#1a0800" />
      <circle cx="28.5" cy="33" r="0.85" fill="white" />
      <circle cx="37.5" cy="33" r="0.85" fill="white" />

      {/* Nose — broader for masculine look */}
      <path d="M30 39.5 Q32 42 34 39.5" stroke="#a0522d" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.6" />

      {/* Smile + teeth */}
      <path d="M27 44 Q32 49 37 44" fill="#7a3010" />
      <path d="M28.5 44 Q32 46.5 35.5 44" fill="white" />

      {/* Hair top detail */}
      <ellipse cx="32" cy="21" rx="12" ry="9" fill="#1a0800" />
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

type Step = { title: string; text: string; target: string | null };

function buildSteps(guide: "skhathi" | "ande", gradeYear: GradeYear): Step[] {
  const isGrade11 = gradeYear === "Grade 11";

  const shared = {
    welcome:
      guide === "skhathi"
        ? { title: "Hey, welcome! 👋", text: "I'm Skhathi, your Baseform guide. Let me show you around so you can hit the ground running!", target: null }
        : { title: "Hey there! 👋", text: "I'm Ande, and I'll be your Baseform guide. Let me walk you through the app — it'll only take a minute!", target: null },

    apsCard:
      guide === "skhathi"
        ? { title: "Applications Progress", text: isGrade11 ? "This card shows your current APS score and how you're tracking. Build it up now so you're ready to apply next year." : "This card tracks how many of your applications have been submitted and how many are still remaining. Tap the APS tab to also see your score.", target: "aps-card" }
        : { title: "Applications Progress", text: isGrade11 ? "Here you can see your APS score at a glance. The stronger your APS, the more doors open when you apply next year." : "This card shows your submitted, remaining, and total applications at a glance. You can also flip to your APS score using the tab.", target: "aps-card" },

    toolsIntro:
      guide === "skhathi"
        ? { title: "Your Tools", text: "Here are all the tools you need. Let me walk you through each one quickly.", target: "quick-access" }
        : { title: "Your Tools", text: "These tiles are your command centre. I'll explain each one so you know exactly where to go.", target: "quick-access" },

    basebot:
      guide === "skhathi"
        ? { title: "BaseBot 🤖", text: "This is your AI study and application assistant. Ask it anything — which programmes you qualify for, what documents you need, or how to write a strong motivation letter.", target: "tile-basebot" }
        : { title: "BaseBot 🤖", text: "Meet your personal AI guide. Ask BaseBot about programmes, APS requirements, application tips, bursaries, or anything else on your mind.", target: "tile-basebot" },

    applications: isGrade11
      ? null
      : guide === "skhathi"
        ? { title: "Applications 📝", text: "See all the universities you're applying to, track which ones are submitted, pending, or still to do — and manage everything from one place.", target: "tile-applications" }
        : { title: "Applications 📝", text: "Your full list of university applications lives here. Check statuses, see what's still outstanding, and keep your applications on track.", target: "tile-applications" },

    targets: isGrade11
      ? guide === "skhathi"
        ? { title: "My Targets 🎯", text: "Set the universities and programmes you're aiming for. This keeps you focused now so that when applications open, you know exactly where to apply.", target: "tile-targets" }
        : { title: "My Targets 🎯", text: "Pin the programmes you want to get into. Use this as your planning board — the earlier you lock in your targets, the better prepared you'll be.", target: "tile-targets" }
      : null,

    programmes:
      guide === "skhathi"
        ? { title: "Programmes 🎓", text: "Browse thousands of university programmes across South Africa. Filter by faculty, institution, or your APS score to find the ones you actually qualify for.", target: "tile-programmes" }
        : { title: "Programmes 🎓", text: "Search and explore university programmes that match your APS and subjects. Find your best-fit course across SA institutions — all in one place.", target: "tile-programmes" },

    bursaries:
      guide === "skhathi"
        ? { title: "Bursaries 💰", text: "Find bursaries and funding opportunities that match your profile, field of study, and province. Don't leave money on the table — there's a lot out there.", target: "tile-bursaries" }
        : { title: "Bursaries 💰", text: "Money shouldn't stop you from studying. Browse bursaries filtered by your field of interest and location — and apply directly from here.", target: "tile-bursaries" },

    progress: isGrade11
      ? null
      : guide === "skhathi"
        ? { title: "Progress 📈", text: "Track your overall application journey — deadlines, submission statuses, and what still needs attention. Stay ahead of every due date.", target: "tile-progress" }
        : { title: "Progress 📈", text: "Your application timeline at a glance. See upcoming deadlines, which institutions are still waiting on you, and how close you are to finishing.", target: "tile-progress" },

    documents:
      guide === "skhathi"
        ? { title: "Documents 🗂️", text: "Upload and store your ID, matric results, proof of residence, and other important documents. Access them instantly whenever an application asks for them.", target: "tile-documents" }
        : { title: "Documents 🗂️", text: "Keep all your application documents in one safe place. Upload once — ID, results, proof of address — and attach them to any application without hunting for files.", target: "tile-documents" },

    profile:
      guide === "skhathi"
        ? { title: "Profile 👤", text: "Your personal details, subjects, and marks all live here. Keeping this up to date means better programme matches and a smoother application experience.", target: "tile-profile" }
        : { title: "Profile 👤", text: "Update your subjects, marks, school, and personal info here. The more accurate your profile, the more relevant your programme suggestions and APS calculations will be.", target: "tile-profile" },

    planningTools: isGrade11
      ? guide === "skhathi"
        ? { title: "Planning Tools 🛠️", text: "Scroll down to find your Grade 11 planning tools. These are built to help you track your time and improve your marks before applications open.", target: "planning-tools" }
        : { title: "Planning Tools 🛠️", text: "Below the tiles you'll find tools designed just for Grade 11. Use them to track deadlines and know exactly where to focus your energy.", target: "planning-tools" }
      : null,

    countdownCard: isGrade11
      ? guide === "skhathi"
        ? { title: "Application Countdown ⏳", text: "This shows exactly how many months and days you have until university applications open. The clock is ticking — use this time to build your APS.", target: "countdown-card" }
        : { title: "Application Countdown ⏳", text: "A live countdown to the start of application season. It updates daily so you always know how much runway you have to improve your marks.", target: "countdown-card" }
      : null,

    subjectGapCard: isGrade11
      ? guide === "skhathi"
        ? { title: "APS Gap Analyser 📊", text: "This shows which of your subjects are closest to earning you another APS point. Focus on the smallest gaps first — that's your fastest path to a higher score.", target: "subject-gap-card" }
        : { title: "APS Gap Analyser 📊", text: "See exactly how many marks separate you from your next APS point in each subject. It's your shortcut to knowing where to study hardest.", target: "subject-gap-card" }
      : null,

    done:
      guide === "skhathi"
        ? { title: "You're ready! 🎓", text: isGrade11 ? "That's the full tour! Start by setting your targets and exploring programmes — build your APS and you'll be well ahead when applications open." : "That's it! Now let's get those university applications sorted. I'm rooting for you!", target: null }
        : { title: "You're all set! 💪", text: isGrade11 ? "You're all set! Use your targets and programmes to plan ahead — next year's application season will be much easier if you start building now." : "Every application counts. Take it one step at a time — you've got this. I'll be here if you need me!", target: null },
  };

  return [
    shared.welcome,
    shared.apsCard,
    shared.toolsIntro,
    shared.basebot,
    ...(shared.applications ? [shared.applications] : []),
    ...(shared.targets ? [shared.targets] : []),
    shared.programmes,
    shared.bursaries,
    ...(shared.progress ? [shared.progress] : []),
    shared.documents,
    shared.profile,
    ...(shared.planningTools ? [shared.planningTools] : []),
    ...(shared.countdownCard ? [shared.countdownCard] : []),
    ...(shared.subjectGapCard ? [shared.subjectGapCard] : []),
    shared.done,
  ];
}

const GUIDE_META = {
  skhathi: { name: "Skhathi", Avatar: SkhathiAvatar, accentColor: "#f97316", role: "Your Baseform guide" },
  ande:    { name: "Ande",    Avatar: AndeAvatar,    accentColor: "#3b82f6", role: "Your Baseform guide" },
} as const;

// ── Storage ───────────────────────────────────────────────────────────────────

const KEY = "bf_tour_v1";

function loadTour(userId: string): TourState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TourState;
      // Only reuse stored state if it belongs to this user
      if (parsed.userId === userId) return parsed;
    }
  } catch { /* ignore */ }
  const guide: Guide = Math.random() < 0.5 ? "skhathi" : "ande";
  const fresh: TourState = { guide, completed: false, step: 0, userId };
  saveTour(fresh);
  return fresh;
}

function saveTour(s: TourState) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TourGuide({ userId, gradeYear }: { userId?: string; gradeYear?: GradeYear }) {
  const [tour, setTour] = useState<TourState | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const state = loadTour(userId);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTour(state);
    if (!state.completed) {
      const t = setTimeout(() => setShow(true), 700);
      return () => clearTimeout(t);
    }
  }, []);

  // Add / remove highlight ring on the target element
  useEffect(() => {
    if (!tour || tour.completed || !show) return;
    const steps = buildSteps(tour.guide, gradeYear ?? null);
    const step = steps[tour.step];
    if (!step.target) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) return;
    el.classList.add("tour-highlight");
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return () => el.classList.remove("tour-highlight");
  }, [tour, show, gradeYear]);

  function advance() {
    if (!tour) return;
    const steps = buildSteps(tour.guide, gradeYear ?? null);
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

  const guide = GUIDE_META[tour.guide];
  const { Avatar } = guide;
  const steps = buildSteps(tour.guide, gradeYear ?? null);
  const step = steps[tour.step];
  const isLast = tour.step === steps.length - 1;
  const totalSteps = steps.length;

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
