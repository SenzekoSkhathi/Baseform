import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bot,
  FileText,
  Folder,
  GraduationCap,
  ListChecks,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export const metadata = {
  title: "How it works — Baseform",
  description:
    "Walk through the Baseform app: onboarding, sign-up, and what every learner sees inside — narrated by Skhathi and Ande.",
  alternates: { canonical: "/how-it-works" },
};

/* ---------- Tour-guide character system ---------- */

type Character = "skhathi" | "ande";

const CHARACTERS: Record<Character, { name: string; role: string; ring: string; tone: string }> = {
  skhathi: {
    name: "Skhathi",
    role: "Your Baseform guide",
    ring: "ring-orange-200",
    tone: "text-[var(--orange-deep)]",
  },
  ande: {
    name: "Ande",
    role: "Your Baseform guide",
    ring: "ring-blue-200",
    tone: "text-blue-600",
  },
};

function SkhathiAvatar() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hiw-sk-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <clipPath id="hiw-sk-clip">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="32" fill="url(#hiw-sk-bg)" />
      <ellipse cx="32" cy="68" rx="26" ry="14" fill="#fff7ed" clipPath="url(#hiw-sk-clip)" />
      <rect x="27.5" y="50" width="9" height="12" rx="3" fill="#c68642" />
      <ellipse cx="32" cy="23" rx="14" ry="11" fill="#1a0800" />
      <ellipse cx="18.5" cy="29" rx="4" ry="6" fill="#1a0800" />
      <ellipse cx="45.5" cy="29" rx="4" ry="6" fill="#1a0800" />
      <ellipse cx="19" cy="37" rx="2.5" ry="3" fill="#c68642" />
      <ellipse cx="45" cy="37" rx="2.5" ry="3" fill="#c68642" />
      <ellipse cx="32" cy="38" rx="13" ry="13" fill="#c68642" />
      <path d="M24 30 Q27.5 28 31 30" stroke="#1a0800" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M33 30 Q36.5 28 40 30" stroke="#1a0800" strokeWidth="2" fill="none" strokeLinecap="round" />
      <ellipse cx="27.5" cy="34" rx="2.3" ry="2.5" fill="#1a0800" />
      <ellipse cx="36.5" cy="34" rx="2.3" ry="2.5" fill="#1a0800" />
      <circle cx="28.5" cy="33" r="0.85" fill="white" />
      <circle cx="37.5" cy="33" r="0.85" fill="white" />
      <path d="M30 39.5 Q32 42 34 39.5" stroke="#a0522d" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M27 44 Q32 49 37 44" fill="#7a3010" />
      <path d="M28.5 44 Q32 46.5 35.5 44" fill="white" />
      <ellipse cx="32" cy="21" rx="12" ry="9" fill="#1a0800" />
    </svg>
  );
}

function AndeAvatar() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hiw-an-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <clipPath id="hiw-an-clip">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="32" fill="url(#hiw-an-bg)" />
      <ellipse cx="32" cy="68" rx="26" ry="14" fill="#eff6ff" clipPath="url(#hiw-an-clip)" />
      <rect x="27.5" y="50" width="9" height="12" rx="3" fill="#b87333" />
      <ellipse cx="32" cy="24" rx="14" ry="11" fill="#1a0800" />
      <ellipse cx="18.5" cy="30" rx="4" ry="6" fill="#1a0800" />
      <ellipse cx="45.5" cy="30" rx="4" ry="6" fill="#1a0800" />
      <ellipse cx="18.5" cy="37" rx="2.5" ry="3" fill="#b87333" />
      <ellipse cx="45.5" cy="37" rx="2.5" ry="3" fill="#b87333" />
      <ellipse cx="32" cy="38" rx="13" ry="13.5" fill="#b87333" />
      <path d="M24.5 30.5 Q27.5 28.5 31 30" stroke="#1a0800" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <path d="M33 30 Q36.5 28.5 39.5 30.5" stroke="#1a0800" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      <ellipse cx="27.5" cy="34" rx="2.3" ry="2.5" fill="#1a0800" />
      <ellipse cx="36.5" cy="34" rx="2.3" ry="2.5" fill="#1a0800" />
      <circle cx="28.5" cy="33" r="0.85" fill="white" />
      <circle cx="37.5" cy="33" r="0.85" fill="white" />
      <path d="M30.5 39.5 Q32 41.5 33.5 39.5" stroke="#8b4513" strokeWidth="1.1" fill="none" strokeLinecap="round" opacity="0.55" />
      <path d="M27 44 Q32 49 37 44" fill="#7a3010" />
      <path d="M28.5 44 Q32 46.5 35.5 44" fill="white" />
      <ellipse cx="32" cy="22" rx="12" ry="9" fill="#1a0800" />
    </svg>
  );
}

function Avatar({ who, size = "md" }: { who: Character; size?: "sm" | "md" | "lg" }) {
  const c = CHARACTERS[who];
  const dim = size === "lg" ? "size-14" : size === "sm" ? "size-9" : "size-11";
  const Portrait = who === "skhathi" ? SkhathiAvatar : AndeAvatar;
  return (
    <span
      className={`block shrink-0 overflow-hidden ${dim} rounded-full ring-4 ${c.ring} shadow-md`}
      aria-hidden="true"
    >
      <Portrait />
    </span>
  );
}

function Speech({ who, lines }: { who: Character; lines: string[] }) {
  const c = CHARACTERS[who];
  return (
    <div className="flex items-start gap-4">
      <Avatar who={who} />
      <div className="flex-1">
        <p className={`text-[0.7rem] font-bold uppercase tracking-[0.2em] ${c.tone}`}>
          {c.name}
          <span className="ml-2 text-[var(--ink-soft)] opacity-80">· {c.role}</span>
        </p>
        <div className="mt-2.5 space-y-2">
          {lines.map((l, i) => (
            <div
              key={i}
              className="relative rounded-2xl rounded-tl-sm border border-[var(--line)] bg-white px-5 py-3.5 text-[1rem] leading-relaxed text-[var(--ink)] shadow-sm"
            >
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Stylised phone frame ---------- */

function PhoneFrame({ children, label, bg = "#fff9f2" }: { children: React.ReactNode; label?: string; bg?: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      {/* Frame */}
      <div className="relative aspect-[9/19] rounded-[42px] border-[10px] border-[var(--ink)] bg-[var(--ink)] p-1 shadow-[0_30px_60px_rgba(26,23,20,0.25)]">
        {/* Notch */}
        <div className="absolute left-1/2 top-1 z-20 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-[var(--ink)]" />
        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-[30px]" style={{ backgroundColor: bg }}>
          {children}
        </div>
      </div>
      {label && (
        <p className="mt-4 text-center text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[var(--ink-soft)]">
          {label}
        </p>
      )}
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-4 text-[9px] font-bold text-gray-700">
      <span>09:41</span>
      <span>● ● ●</span>
    </div>
  );
}

/* ---------- Screen recreations ---------- */

function ScreenSubjects() {
  const subjects = [
    { name: "Mathematics", mark: 72, points: 6 },
    { name: "English FAL", mark: 68, points: 5 },
    { name: "Physical Sciences", mark: 65, points: 5 },
    { name: "Life Sciences", mark: 74, points: 6 },
    { name: "Geography", mark: 70, points: 6 },
    { name: "isiZulu HL", mark: 80, points: 7 },
  ];
  const aps = subjects.reduce((s, x) => s + x.points, 0) - 1;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="h-1 w-full bg-gray-100">
        <div className="h-full w-2/3 bg-orange-500" />
      </div>
      <StatusBar />
      <div className="flex flex-col gap-1 px-4 pt-5">
        <p className="text-[9px] text-gray-400">← Back</p>
        <h3 className="text-lg font-bold leading-tight text-gray-900">
          Your subjects &amp; marks
        </h3>
        <p className="text-[10px] text-gray-500">
          We calculate your APS as you go.
        </p>
      </div>

      <div className="mx-4 mt-3 flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2">
        <p className="text-[9px] font-semibold text-orange-700">Live APS</p>
        <p className="text-xl font-black text-orange-600">{aps}</p>
      </div>

      <div className="mx-4 mt-3 flex flex-col gap-1.5">
        {subjects.slice(0, 5).map((s) => (
          <div
            key={s.name}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2 py-1.5"
          >
            <p className="truncate text-[10px] font-medium text-gray-800">
              {s.name}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-gray-500">{s.mark}%</span>
              <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[9px] font-bold text-orange-700">
                {s.points}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-4 mt-2 flex items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 py-1.5 text-[9px] font-semibold text-gray-500">
        + Add subject
      </div>

      <div className="mt-auto px-4 pb-4">
        <div className="rounded-2xl bg-orange-500 py-3 text-center text-[12px] font-semibold text-white">
          Continue
        </div>
      </div>
    </div>
  );
}

function ScreenOnboarding() {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="h-1 w-full bg-gray-100">
        <div className="h-full w-1/3 bg-orange-500" />
      </div>
      <StatusBar />
      <div className="flex flex-col gap-1 px-5 pt-5">
        <h3 className="text-lg font-bold leading-tight text-gray-900">
          Let&apos;s get started
        </h3>
        <p className="text-[10px] text-gray-500">
          We&apos;ll find every opportunity you qualify for.
        </p>
      </div>
      <div className="mt-5 flex flex-col gap-3.5 px-5">
        {[
          { label: "Your first name", value: "Thabo" },
          { label: "Your last name", value: "Mokoena" },
          { label: "Phone number", value: "0821234567" },
        ].map((f) => (
          <div key={f.label} className="space-y-1.5">
            <p className="text-[9px] font-medium text-gray-700">{f.label}</p>
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
              <p className="text-[11px] text-gray-900">{f.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto px-5 pb-5">
        <div className="rounded-2xl bg-orange-500 py-3 text-center text-[12px] font-semibold text-white">
          Continue
        </div>
      </div>
    </div>
  );
}

function ScreenReveal() {
  return (
    <div className="flex h-full flex-col px-4 pt-4">
      <StatusBar />
      <div className="mt-3 flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[9px] font-semibold text-orange-700">
          <Sparkles size={11} />
          Your Opportunity Report
        </span>
        <h3 className="mt-3 text-[16px] font-black leading-tight text-slate-900">
          Thabo, here&apos;s what you<br />qualify for
        </h3>
      </div>
      <div className="mt-4 rounded-[20px] border border-orange-100 bg-white p-3 shadow-[0_8px_20px_rgba(249,115,22,0.10)]">
        <div className="rounded-xl bg-orange-500 p-3 text-white">
          <p className="text-[9px] uppercase tracking-wider text-orange-100">
            Your APS Score
          </p>
          <p className="mt-0.5 text-3xl font-black leading-none">32</p>
          <span className="mt-2 inline-flex rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-semibold">
            Strong
          </span>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          {[
            { Icon: GraduationCap, v: "8", l: "unis", c: "text-orange-500" },
            { Icon: Trophy, v: "12", l: "bursaries", c: "text-amber-500" },
            { Icon: Bell, v: "62", l: "days", c: "text-rose-500" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-gray-100 bg-white py-2 text-center">
              <s.Icon size={14} className={`mx-auto ${s.c}`} />
              <p className="mt-1 text-[13px] font-black text-slate-900">{s.v}</p>
              <p className="text-[8px] leading-tight text-slate-500">{s.l}</p>
            </div>
          ))}
        </div>
        <div className="mt-2.5 rounded-xl border border-orange-100 bg-orange-50 px-3 py-2 text-center">
          <p className="text-[10px] font-medium text-orange-800">
            You qualify for{" "}
            <span className="font-black text-orange-600">42 programmes</span>
          </p>
        </div>
      </div>
      <div className="mt-auto pb-5">
        <div className="rounded-2xl bg-orange-500 py-3 text-center text-[12px] font-bold text-white">
          Create your free account →
        </div>
        <p className="mt-2 text-center text-[9px] text-slate-500">
          Free · No credit card · Takes 2 minutes
        </p>
      </div>
    </div>
  );
}

function ScreenSignup() {
  return (
    <div className="flex h-full flex-col bg-gray-50 px-5 pt-5">
      <StatusBar />
      <div className="mt-4 flex items-center gap-1.5">
        <div className="grid size-5 place-items-center rounded-full bg-orange-500 text-[9px] font-bold text-white">
          1
        </div>
        <div className="h-0.5 w-6 bg-gray-200" />
        <div className="grid size-5 place-items-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-400">
          2
        </div>
        <span className="ml-1 text-[9px] text-gray-400">Step 1 of 2</span>
      </div>
      <h3 className="mt-4 text-lg font-bold leading-tight text-gray-900">
        Create your account
      </h3>
      <p className="text-[11px] text-gray-500">
        Save your matched paths and get started.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        {[
          { label: "Email", value: "thabo@example.co.za" },
          { label: "Password", value: "••••••••" },
          { label: "Confirm password", value: "••••••••" },
        ].map((f) => (
          <div key={f.label} className="space-y-1">
            <p className="text-[9px] font-medium text-gray-700">{f.label}</p>
            <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
              <p className="text-[11px] text-gray-900">{f.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto pb-5">
        <div className="rounded-2xl bg-orange-500 py-3 text-center text-[12px] font-semibold text-white">
          Continue
        </div>
        <p className="mt-3 text-center text-[10px] text-gray-500">
          Already have an account?{" "}
          <span className="font-semibold text-orange-600">Sign in</span>
        </p>
      </div>
    </div>
  );
}

function ScreenLogin() {
  return (
    <div className="flex h-full flex-col bg-gray-50 px-4 pt-3">
      <StatusBar />
      <div className="mt-3 rounded-[24px] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="grid size-6 place-items-center rounded-lg bg-orange-500">
            <span className="text-[12px] font-black leading-none text-white">↑</span>
          </div>
          <p className="text-[14px] font-black tracking-tight text-gray-900">
            base<span className="text-orange-500">form</span>
          </p>
        </div>

        <h3 className="mt-4 text-lg font-bold leading-tight text-gray-900">
          Welcome back
        </h3>
        <p className="text-[10px] text-gray-500 mb-5">
          Log in to your Baseform account.
        </p>

        <div className="space-y-1.5 mb-3">
          <p className="text-[9px] font-medium text-gray-800">Email address</p>
          <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
            <p className="text-[11px] text-gray-400">you@example.com</p>
          </div>
        </div>

        <div className="space-y-1.5 mb-2">
          <p className="text-[9px] font-medium text-gray-800">Password</p>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2">
            <p className="text-[11px] text-gray-400">Your password</p>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
        </div>

        <p className="mb-4 text-right text-[10px] font-semibold text-orange-600">
          Forgot password?
        </p>

        <div className="rounded-2xl bg-orange-500 py-3 text-center text-[12px] font-semibold text-white mb-3">
          Log in
        </div>

        <p className="text-center text-[10px] text-gray-500">
          Don&apos;t have an account?{" "}
          <span className="font-semibold text-orange-600">Get started free</span>
        </p>
      </div>
    </div>
  );
}

function DashboardScreen({ grade }: { grade: "11" | "12" }) {
  const tiles =
    grade === "11"
      ? [
          { label: "BaseBot", Icon: Bot, bg: "bg-purple-50", fg: "text-purple-600" },
          { label: "My Targets", Icon: Target, bg: "bg-blue-50", fg: "text-blue-600" },
          { label: "Programmes", Icon: GraduationCap, bg: "bg-orange-50", fg: "text-orange-600" },
          { label: "Bursaries", Icon: Wallet, bg: "bg-pink-50", fg: "text-pink-600" },
          { label: "Documents", Icon: Folder, bg: "bg-teal-50", fg: "text-teal-600" },
          { label: "Profile", Icon: User, bg: "bg-amber-50", fg: "text-amber-600" },
        ]
      : [
          { label: "BaseBot", Icon: Bot, bg: "bg-purple-50", fg: "text-purple-600" },
          { label: "Applications", Icon: FileText, bg: "bg-blue-50", fg: "text-blue-600" },
          { label: "Programmes", Icon: GraduationCap, bg: "bg-orange-50", fg: "text-orange-600" },
          { label: "Bursaries", Icon: Wallet, bg: "bg-pink-50", fg: "text-pink-600" },
          { label: "Progress", Icon: TrendingUp, bg: "bg-green-50", fg: "text-green-600" },
          { label: "Documents", Icon: Folder, bg: "bg-teal-50", fg: "text-teal-600" },
          { label: "Profile", Icon: User, bg: "bg-amber-50", fg: "text-amber-600" },
        ];

  const sub =
    grade === "11"
      ? "Explore your planning and preparation tools"
      : "Jump into your key application tools";

  return (
    <div className="flex h-full flex-col px-3 pt-3">
      <StatusBar />
      <div className="mt-2 rounded-[20px] border border-orange-100 bg-white/85 p-3 shadow-[0_8px_20px_rgba(249,115,22,0.10)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-semibold uppercase tracking-widest text-gray-400">
              Tue, April 28
            </p>
            <p className="mt-1 text-[15px] font-extrabold leading-tight text-gray-900">
              Good Morning, <span className="text-orange-500">Thabo</span>
            </p>
            <p className="mt-1 text-[9px] leading-snug text-gray-500">
              {grade === "11"
                ? "You're in planning mode. Build your APS now."
                : "Keep moving — applications and APS in one place."}
            </p>
          </div>
          <div className="relative">
            <div className="grid size-9 place-items-center rounded-xl bg-orange-500">
              <span className="text-[12px] font-bold text-white">T</span>
            </div>
            <span className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-white bg-green-500" />
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-orange-50/80 px-2.5 py-1.5">
          <div>
            <p className="text-[7px] text-gray-500">Grade</p>
            <p className="text-[9px] font-semibold text-gray-800">
              Grade {grade}
            </p>
          </div>
          <span className="size-1 rounded-full bg-gray-300" />
          <div className="min-w-0 flex-1">
            <p className="text-[7px] text-gray-500">School</p>
            <p className="truncate text-[9px] font-semibold text-gray-800">
              Pretoria HS
            </p>
          </div>
          {grade === "11" && (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-[7px] font-bold uppercase tracking-wide text-blue-700">
              Planning
            </span>
          )}
        </div>
        <div className="mt-2.5 rounded-xl bg-orange-500 px-3 py-2.5 text-white">
          <div className="flex items-center justify-between">
            <p className="text-[8px] uppercase tracking-wider text-orange-100">
              {grade === "11" ? "Projected APS" : "Your APS"}
            </p>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[8px] font-semibold">
              Strong
            </span>
          </div>
          <p className="text-2xl font-black leading-none mt-1.5">32</p>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-gray-100 bg-white/90 p-2 shadow-sm">
        <div className="mb-2 flex items-end justify-between px-1.5">
          <div>
            <h4 className="text-[12px] font-bold tracking-tight text-gray-900">
              Quick Access
            </h4>
            <p className="text-[8px] font-medium text-gray-400">{sub}</p>
          </div>
          <span className="rounded-full bg-orange-50 px-1.5 py-1 text-[7px] font-semibold uppercase text-orange-600">
            {tiles.length} tools
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-100 bg-white py-2.5"
            >
              <span className={`grid size-8 place-items-center rounded-lg ${t.bg}`}>
                <t.Icon size={14} className={t.fg} />
              </span>
              <span className="text-[9px] font-semibold text-gray-700">
                {t.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function HowItWorksPage() {
  return (
    <>
      <MarketingHeader />

      <main className="relative min-h-screen">
        {/* Hero */}
        <section className="sec border-b border-[var(--line)]" style={{ paddingBottom: "80px" }}>
          <div className="wrap max-w-4xl text-center">
            <span className="label">How it works · A four-part tour</span>
            <h1 className="display mt-6 mb-8">
              See the app, before you{" "}
              <span className="accent">touch the app.</span>
            </h1>
            <p className="lead mx-auto">
              Skhathi and Ande will walk you through every screen — onboarding, sign-in, and
              both the Grade 11 and Grade 12 home dashboards. Four phones, four phases, no
              sign-up needed to look around.
            </p>

            {/* Cast intro */}
            <div className="mt-14 grid gap-8 border-t border-[var(--line)] pt-12 sm:grid-cols-2 text-left">
              <div className="flex items-start gap-4">
                <Avatar who="skhathi" size="lg" />
                <div>
                  <p className="text-xl font-bold text-[var(--ink)]">Skhathi</p>
                  <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
                    Hi I&apos;m Skhathi, and I will walk you through Grade 11s planning, targets, and bursary discovery onboarding steps.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Avatar who="ande" size="lg" />
                <div>
                  <p className="text-xl font-bold text-[var(--ink)]">Ande</p>
                  <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
                    Hi I&apos;m Ande, and I will walk you through from sign-up through to live applications of Grade 12s onboarding steps.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Phase I */}
        <section className="sec border-b border-[var(--line)]">
          <div className="wrap">
            <div className="grid items-center gap-16 lg:grid-cols-12">
              <div className="order-2 lg:order-1 lg:col-span-5">
                <span className="label">Phase I · Onboarding</span>
                <h2 className="heading-lg mt-3">
                  A few questions.{" "}
                  <span className="text-[var(--ink-soft)]">Then a reveal.</span>
                </h2>
                <p className="mt-5 max-w-md text-lg text-[var(--ink-soft)]">
                  Three short steps: your name and contact, your subjects and marks, then a
                  bit about your grade, school and field of interest. No account yet. At the
                  end, the Opportunity Report shows what you qualify for.
                </p>

                <div className="mt-10 flex flex-col gap-8">
                  <Speech
                    who="skhathi"
                    lines={[
                      "Step one is just your name and a phone number. Step two is your subjects — APS gets calculated automatically as you type your marks.",
                      "Step three is your grade, school, province and what you're curious about studying.",
                    ]}
                  />
                  <Speech
                    who="skhathi"
                    lines={[
                      "When you finish, you land on the Opportunity Report — your APS, the universities and bursaries you qualify for, and the next deadline. No sign-up needed yet to see it.",
                    ]}
                  />
                </div>
              </div>

              <div className="order-1 lg:order-2 lg:col-span-7">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-6">
                  <PhoneFrame label="Step 1 · Your details" bg="#ffffff">
                    <ScreenOnboarding />
                  </PhoneFrame>
                  <PhoneFrame label="Step 2 · Subjects" bg="#ffffff">
                    <ScreenSubjects />
                  </PhoneFrame>
                </div>
                <div className="mt-10 flex justify-center">
                  <div className="w-full sm:max-w-[320px]">
                    <PhoneFrame label="Opportunity Report">
                      <ScreenReveal />
                    </PhoneFrame>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Phase II */}
        <section className="sec border-b border-[var(--line)]">
          <div className="wrap">
            <div className="grid items-center gap-16 lg:grid-cols-12">
              <div className="order-1 lg:order-1 lg:col-span-7">
                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-6">
                  <PhoneFrame label="Sign up" bg="#f9fafb">
                    <ScreenSignup />
                  </PhoneFrame>
                  <PhoneFrame label="Sign in" bg="#f9fafb">
                    <ScreenLogin />
                  </PhoneFrame>
                </div>
              </div>

              <div className="order-2 lg:order-2 lg:col-span-5">
                <span className="label text-blue-600">Phase II · Account</span>
                <h2 className="heading-lg mt-3">
                  Save your paths.{" "}
                  <span className="text-[var(--ink-soft)]">Pick them up anywhere.</span>
                </h2>
                <p className="mt-5 max-w-md text-lg text-[var(--ink-soft)]">
                  Sign-up is two short steps. Email and password first, then a guardian
                  contact. After that, every device you log in on shows your matched
                  programmes, bursaries and documents.
                </p>

                <div className="mt-10 flex flex-col gap-8">
                  <Speech
                    who="ande"
                    lines={[
                      "Step one: email, password, confirm. Step two: a guardian contact so we can keep someone in the loop. Your Opportunity Report carries over — nothing gets lost.",
                    ]}
                  />
                  <Speech
                    who="ande"
                    lines={[
                      "Lost your password? The reset link goes to your email. We never store it in plain text — POPIA compliant by default.",
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Phase III */}
        <section className="sec border-b border-[var(--line)]">
          <div className="wrap">
            <div className="grid items-center gap-16 lg:grid-cols-12">
              <div className="order-2 lg:order-1 lg:col-span-5">
                <span className="label">Phase III · Inside · Grade 11</span>
                <h2 className="heading-lg mt-3">
                  Plan ahead.{" "}
                  <span className="text-[var(--ink-soft)]">Build your shortlist.</span>
                </h2>
                <p className="mt-5 max-w-md text-lg text-[var(--ink-soft)]">
                  Grade 11 is about <span className="font-semibold text-[var(--ink)]">preparation</span>. Targets you set now decide which
                  doors are open in Grade 12. The home tiles are tuned for that.
                </p>

                <div className="mt-10 flex flex-col gap-8">
                  <Speech
                    who="skhathi"
                    lines={[
                      "Six tiles. BaseBot for any question, Targets for the marks you're aiming at, then Programmes, Bursaries, Documents and Profile.",
                    ]}
                  />
                  <Speech
                    who="skhathi"
                    lines={[
                      "No Applications tile yet — it's not application season for you. Less clutter, fewer wrong turns.",
                      "Targets is your big one. Set the APS you want, see exactly which subjects to push.",
                    ]}
                  />
                </div>
              </div>

              <div className="order-1 lg:order-2 lg:col-span-7">
                <div className="mx-auto max-w-[320px]">
                  <PhoneFrame label="Home · Grade 11">
                    <DashboardScreen grade="11" />
                  </PhoneFrame>
                </div>

                <ul className="mx-auto mt-10 grid max-w-md gap-3 sm:grid-cols-2">
                  {[
                    { Icon: Bot, label: "BaseBot — ask anything" },
                    { Icon: Target, label: "Targets — set the APS goal" },
                    { Icon: GraduationCap, label: "Programmes — explore" },
                    { Icon: Trophy, label: "Bursaries — discover" },
                  ].map((f) => (
                    <li
                      key={f.label}
                      className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white px-4 py-3 shadow-sm"
                    >
                      <f.Icon size={16} className="text-[var(--orange)]" />
                      <span className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[var(--ink)]">
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Phase IV */}
        <section className="sec border-b border-[var(--line)]">
          <div className="wrap">
            <div className="grid items-center gap-16 lg:grid-cols-12">
              <div className="order-1 lg:order-1 lg:col-span-7">
                <div className="mx-auto max-w-[320px]">
                  <PhoneFrame label="Home · Grade 12">
                    <DashboardScreen grade="12" />
                  </PhoneFrame>
                </div>

                <ul className="mx-auto mt-10 grid max-w-md gap-3 sm:grid-cols-2">
                  {[
                    { Icon: FileText, label: "Applications — track" },
                    { Icon: TrendingUp, label: "Progress — XP & level" },
                    { Icon: ListChecks, label: "Documents — upload once" },
                    { Icon: Bell, label: "Reminders — deadlines" },
                  ].map((f) => (
                    <li
                      key={f.label}
                      className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white px-4 py-3 shadow-sm"
                    >
                      <f.Icon size={16} className="text-blue-600" />
                      <span className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[var(--ink)]">
                        {f.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="order-2 lg:order-2 lg:col-span-5">
                <span className="label text-blue-600">Phase IV · Inside · Grade 12</span>
                <h2 className="heading-lg mt-3">
                  Apply.{" "}
                  <span className="text-[var(--ink-soft)]">Track. Land.</span>
                </h2>
                <p className="mt-5 max-w-md text-lg text-[var(--ink-soft)]">
                  Grade 12 is the live season. Targets give way to <span className="font-semibold text-[var(--ink)]">Applications</span>{" "}
                  and <span className="font-semibold text-[var(--ink)]">Progress</span> — what you&apos;ve sent, what you&apos;re waiting
                  on, what&apos;s next.
                </p>

                <div className="mt-10 flex flex-col gap-8">
                  <Speech
                    who="ande"
                    lines={[
                      "Notice the layout shifts. Applications and Progress take the front-row tiles — the things you'll touch every week.",
                    ]}
                  />
                  <Speech
                    who="ande"
                    lines={[
                      "Each application has a status — Planning, In progress, Submitted, Accepted. The Progress tile turns it into XP so it actually feels like you're moving.",
                      "BaseBot stays at the top — same coach, more urgent questions now.",
                    ]}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="sec" style={{ paddingTop: 0 }}>
          <div className="final-cta text-center flex flex-col items-center">
            <span className="label text-[var(--ink)] mb-4">Tour&apos;s over · ready to try?</span>
            <h2 className="mx-auto text-center">
              The real thing is{" "}
              <span className="underline underline-offset-4 decoration-2 decoration-white/40">free to start.</span>
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3 relative z-10">
              <Link href="/onboarding" className="btn btn-dark">
                Start the real onboarding
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/"
                className="btn"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.25)",
                }}
              >
                Back to home
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
