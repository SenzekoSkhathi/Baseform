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
import Logo from "@/components/ui/Logo";

export const metadata = {
  title: "How it works — Baseform",
  description:
    "Walk through the Baseform app: onboarding, sign-up, and what every learner sees inside — narrated by Skhathi and Ande.",
};

/* ---------- Tour-guide character system ---------- */

type Character = "skhathi" | "ande";

const CHARACTERS: Record<Character, { name: string; role: string; ring: string; tone: string }> = {
  skhathi: {
    name: "Skhathi",
    role: "Your Baseform guide",
    ring: "ring-orange-200",
    tone: "text-orange-600",
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
    <div className="flex items-start gap-3">
      <Avatar who={who} />
      <div className="flex-1">
        <p className={`font-sans text-[10px] font-bold uppercase tracking-[0.22em] ${c.tone}`}>
          {c.name}
          <span className="ml-2 text-ink/45">· {c.role}</span>
        </p>
        <div className="mt-2 space-y-2">
          {lines.map((l, i) => (
            <div
              key={i}
              className="relative rounded-2xl rounded-tl-sm border border-ink/15 bg-white px-4 py-3 font-serif text-[15px] leading-snug text-ink shadow-[0_6px_18px_rgba(26,23,20,0.05)]"
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
    <div className="relative mx-auto w-full max-w-75">
      {/* Frame */}
      <div className="relative aspect-9/19 rounded-[42px] border-10 border-ink bg-ink p-1 shadow-[0_30px_60px_rgba(26,23,20,0.25)]">
        {/* Notch */}
        <div className="absolute left-1/2 top-1.5 z-20 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-ink" />
        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-4xl" style={{ backgroundColor: bg }}>
          {children}
        </div>
      </div>
      {label && (
        <p className="mt-3 text-center font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-ink/50">
          {label}
        </p>
      )}
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-3 font-sans text-[9px] font-bold text-ink/70">
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
      <div className="h-0.75 w-full bg-gray-100">
        <div className="h-full w-2/3 bg-orange-500" />
      </div>
      <StatusBar />
      <div className="flex flex-col gap-1 px-4 pt-4">
        <p className="font-sans text-[7px] text-gray-400">← Back</p>
        <h3 className="font-sans text-[15px] font-bold leading-tight text-gray-900">
          Your subjects &amp; marks
        </h3>
        <p className="font-sans text-[8px] text-gray-500">
          We calculate your APS as you go.
        </p>
      </div>

      {/* Live APS chip */}
      <div className="mx-4 mt-2 flex items-center justify-between rounded-xl bg-orange-50 px-2 py-1.5">
        <p className="font-sans text-[8px] font-semibold text-orange-700">
          Live APS
        </p>
        <p className="font-sans text-[14px] font-black text-orange-600">
          {aps}
        </p>
      </div>

      {/* Subject rows */}
      <div className="mx-4 mt-2 flex flex-col gap-1">
        {subjects.slice(0, 5).map((s) => (
          <div
            key={s.name}
            className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-2 py-1"
          >
            <p className="truncate font-sans text-[8px] font-medium text-gray-800">
              {s.name}
            </p>
            <div className="flex items-center gap-1">
              <span className="font-sans text-[8px] text-gray-500">{s.mark}%</span>
              <span className="rounded bg-orange-100 px-1 py-0.5 font-sans text-[7px] font-bold text-orange-700">
                {s.points}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-4 mt-1.5 flex items-center justify-center gap-1 rounded-lg border border-dashed border-gray-300 py-1 font-sans text-[8px] font-semibold text-gray-500">
        + Add subject
      </div>

      <div className="mt-auto px-4 pb-4">
        <div className="rounded-2xl bg-orange-500 py-2 text-center font-sans text-[11px] font-semibold text-white">
          Continue
        </div>
      </div>
    </div>
  );
}

function ScreenOnboarding() {
  return (
    <div className="flex h-full flex-col bg-white">
      {/* Thin progress bar at very top — matches real app */}
      <div className="h-0.75 w-full bg-gray-100">
        <div className="h-full w-1/3 bg-orange-500" />
      </div>
      <StatusBar />
      <div className="flex flex-col gap-1 px-5 pt-5">
        <h3 className="font-sans text-[18px] font-bold leading-tight text-gray-900">
          Let&apos;s get started
        </h3>
        <p className="font-sans text-[10px] text-gray-500">
          We&apos;ll find every opportunity you qualify for.
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-3 px-5">
        {[
          { label: "Your first name", value: "Thabo" },
          { label: "Your last name", value: "Mokoena" },
          { label: "Phone number", value: "0821234567" },
        ].map((f) => (
          <div key={f.label} className="space-y-1">
            <p className="font-sans text-[8px] font-medium text-gray-700">{f.label}</p>
            <div className="rounded-xl border border-gray-200 bg-white px-2.5 py-2">
              <p className="font-sans text-[10px] text-gray-900">{f.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto px-5 pb-5">
        <div className="rounded-2xl bg-orange-500 py-2.5 text-center font-sans text-[11px] font-semibold text-white">
          Continue
        </div>
      </div>
    </div>
  );
}

function ScreenReveal() {
  return (
    <div className="flex h-full flex-col px-3 pt-3">
      <StatusBar />
      <div className="mt-2 flex flex-col items-center text-center">
        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 font-sans text-[8px] font-semibold text-orange-700">
          <Sparkles size={9} />
          Your Opportunity Report
        </span>
        <h3 className="mt-2 font-sans text-[13px] font-black leading-tight text-slate-900">
          Thabo, here&apos;s what you<br />qualify for
        </h3>
      </div>
      <div className="mt-3 rounded-2xl border border-orange-100 bg-white p-2 shadow-[0_8px_20px_rgba(249,115,22,0.10)]">
        <div className="rounded-xl bg-orange-500 p-2 text-white">
          <p className="font-sans text-[7px] uppercase tracking-wider text-orange-100">
            Your APS Score
          </p>
          <p className="mt-0.5 font-sans text-2xl font-black leading-none">32</p>
          <span className="mt-1.5 inline-flex rounded-full bg-white/20 px-1.5 py-0.5 font-sans text-[8px] font-semibold">
            Strong
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {[
            { Icon: GraduationCap, v: "8", l: "unis", c: "text-orange-500" },
            { Icon: Trophy, v: "12", l: "bursaries", c: "text-amber-500" },
            { Icon: Bell, v: "62", l: "days", c: "text-rose-500" },
          ].map((s) => (
            <div key={s.l} className="rounded-lg border border-gray-100 bg-white py-1.5 text-center">
              <s.Icon size={11} className={`mx-auto ${s.c}`} />
              <p className="mt-0.5 font-sans text-[11px] font-black text-slate-900">{s.v}</p>
              <p className="font-sans text-[6px] leading-tight text-slate-500">{s.l}</p>
            </div>
          ))}
        </div>
        <div className="mt-1.5 rounded-lg border border-orange-100 bg-orange-50 px-2 py-1.5 text-center">
          <p className="font-sans text-[8px] font-medium text-orange-800">
            You qualify for{" "}
            <span className="font-black text-orange-600">42 programmes</span>
          </p>
        </div>
      </div>
      <div className="mt-auto pb-4">
        <div className="rounded-2xl bg-orange-500 py-2 text-center font-sans text-[10px] font-bold text-white">
          Create your free account →
        </div>
        <p className="mt-1.5 text-center font-sans text-[7px] text-slate-500">
          Free · No credit card · Takes 2 minutes
        </p>
      </div>
    </div>
  );
}

function ScreenSignup() {
  return (
    <div className="flex h-full flex-col bg-gray-50 px-4 pt-3">
      <StatusBar />
      {/* Step dots — matches real signup page */}
      <div className="mt-3 flex items-center gap-1.5">
        <div className="grid size-4 place-items-center rounded-full bg-orange-500 font-sans text-[7px] font-bold text-white">
          1
        </div>
        <div className="h-0.5 w-6 bg-gray-200" />
        <div className="grid size-4 place-items-center rounded-full bg-gray-100 font-sans text-[7px] font-bold text-gray-400">
          2
        </div>
        <span className="ml-1 font-sans text-[7px] text-gray-400">Step 1 of 2</span>
      </div>
      <h3 className="mt-3 font-sans text-[15px] font-bold leading-tight text-gray-900">
        Create your account
      </h3>
      <p className="font-sans text-[9px] text-gray-500">
        Save your matched paths and get started.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {[
          { label: "Email", value: "thabo@example.co.za" },
          { label: "Password", value: "••••••••" },
          { label: "Confirm password", value: "••••••••" },
        ].map((f) => (
          <div key={f.label} className="space-y-0.5">
            <p className="font-sans text-[7px] font-medium text-gray-700">{f.label}</p>
            <div className="rounded-xl border border-gray-200 bg-white px-2 py-1.5">
              <p className="font-sans text-[9px] text-gray-900">{f.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto pb-4">
        <div className="rounded-2xl bg-orange-500 py-2 text-center font-sans text-[10px] font-semibold text-white">
          Continue
        </div>
        <p className="mt-2 text-center font-sans text-[8px] text-gray-500">
          Already have an account?{" "}
          <span className="font-semibold text-orange-600">Sign in</span>
        </p>
      </div>
    </div>
  );
}

function ScreenLogin() {
  return (
    <div className="flex h-full flex-col bg-gray-50 px-3 pt-1">
      <StatusBar />
      {/* White card */}
      <div className="mt-2 rounded-2xl bg-white p-3 shadow-sm">
        {/* Logo lockup */}
        <div className="flex items-center gap-1.5">
          <div className="grid size-5 place-items-center rounded-md bg-orange-500">
            <span className="font-sans text-[10px] font-black leading-none text-white">↑</span>
          </div>
          <p className="font-sans text-[12px] font-black tracking-tight text-gray-900">
            base<span className="text-orange-500">form</span>
          </p>
        </div>

        <h3 className="mt-3 font-sans text-[15px] font-bold leading-tight text-gray-900">
          Welcome back
        </h3>
        <p className="font-sans text-[8px] text-gray-500">
          Log in to your Baseform account.
        </p>

        <div className="mt-3 space-y-0.5">
          <p className="font-sans text-[8px] font-medium text-gray-800">Email address</p>
          <div className="rounded-xl border border-gray-200 bg-white px-2 py-1.5">
            <p className="font-sans text-[9px] text-gray-400">you@example.com</p>
          </div>
        </div>

        <div className="mt-2 space-y-0.5">
          <p className="font-sans text-[8px] font-medium text-gray-800">Password</p>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-2 py-1.5">
            <p className="font-sans text-[9px] text-gray-400">Your password</p>
            <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
        </div>

        <p className="mt-1.5 text-right font-sans text-[8px] font-semibold text-orange-600">
          Forgot password?
        </p>

        <div className="mt-2 rounded-2xl bg-orange-500 py-2 text-center font-sans text-[10px] font-semibold text-white">
          Log in
        </div>

        <p className="mt-2 text-center font-sans text-[8px] text-gray-500">
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
    <div className="flex h-full flex-col px-2 pt-2">
      <StatusBar />
      {/* Greeting card */}
      <div className="mt-1.5 rounded-2xl border border-orange-100 bg-white/85 p-2 shadow-[0_8px_20px_rgba(249,115,22,0.10)]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[6px] font-semibold uppercase tracking-widest text-gray-400">
              Tue, April 28
            </p>
            <p className="mt-0.5 font-sans text-[12px] font-extrabold leading-tight text-gray-900">
              Good Morning, <span className="text-orange-500">Thabo</span>
            </p>
            <p className="mt-0.5 font-sans text-[7px] leading-snug text-gray-500">
              {grade === "11"
                ? "You're in planning mode. Build your APS now."
                : "Keep moving — applications and APS in one place."}
            </p>
          </div>
          <div className="relative">
            <div className="grid size-7 place-items-center rounded-xl bg-orange-500">
              <span className="font-sans text-[10px] font-bold text-white">T</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-1.5 rounded-full border border-white bg-green-500" />
          </div>
        </div>
        {/* Grade · School pill row */}
        <div className="mt-1.5 flex items-center gap-1.5 rounded-xl bg-orange-50/80 px-1.5 py-1">
          <div>
            <p className="font-sans text-[5px] text-gray-500">Grade</p>
            <p className="font-sans text-[7px] font-semibold text-gray-800">
              Grade {grade}
            </p>
          </div>
          <span className="size-0.5 rounded-full bg-gray-300" />
          <div className="min-w-0 flex-1">
            <p className="font-sans text-[5px] text-gray-500">School</p>
            <p className="truncate font-sans text-[7px] font-semibold text-gray-800">
              Pretoria HS
            </p>
          </div>
          {grade === "11" && (
            <span className="rounded-full bg-blue-100 px-1 py-0.5 font-sans text-[5px] font-bold uppercase tracking-wide text-blue-700">
              Planning
            </span>
          )}
        </div>
        {/* Mini APS card */}
        <div className="mt-1.5 rounded-xl bg-orange-500 px-2 py-1.5 text-white">
          <div className="flex items-center justify-between">
            <p className="font-sans text-[6px] uppercase tracking-wider text-orange-100">
              {grade === "11" ? "Projected APS" : "Your APS"}
            </p>
            <span className="rounded-full bg-white/20 px-1 py-0.5 font-sans text-[6px] font-semibold">
              Strong
            </span>
          </div>
          <p className="font-sans text-lg font-black leading-none">32</p>
        </div>
      </div>

      {/* Quick Access section */}
      <div className="mt-1.5 rounded-2xl border border-gray-100 bg-white/90 p-1.5 shadow-sm">
        <div className="mb-1 flex items-end justify-between px-0.5">
          <div>
            <h4 className="font-sans text-[9px] font-bold tracking-tight text-gray-900">
              Quick Access
            </h4>
            <p className="font-sans text-[5px] font-medium text-gray-400">{sub}</p>
          </div>
          <span className="rounded-full bg-orange-50 px-1 py-0.5 font-sans text-[5px] font-semibold uppercase text-orange-600">
            {tiles.length} tools
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {tiles.map((t) => (
            <div
              key={t.label}
              className="flex flex-col items-center justify-center gap-0.5 rounded-lg border border-gray-100 bg-white py-1.5"
            >
              <span className={`grid size-6 place-items-center rounded-md ${t.bg}`}>
                <t.Icon size={11} className={t.fg} />
              </span>
              <span className="font-sans text-[7px] font-semibold text-gray-700">
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
    <main
      className="relative min-h-screen text-ink"
      style={
        {
          ["--paper" as const]: "#f4ecdf",
          ["--ink" as const]: "#1a1714",
          ["--forest" as const]: "#0f1c16",
          backgroundColor: "var(--paper)",
        } as React.CSSProperties
      }
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bg-paper { background-color: var(--paper); }
        .bg-ink { background-color: var(--ink); }
        .bg-forest { background-color: var(--forest); }
        .text-paper { color: var(--paper); }
        .text-ink { color: var(--ink); }
        .text-ink\\/85 { color: color-mix(in srgb, var(--ink) 85%, transparent); }
        .text-ink\\/75 { color: color-mix(in srgb, var(--ink) 75%, transparent); }
        .text-ink\\/65 { color: color-mix(in srgb, var(--ink) 65%, transparent); }
        .text-ink\\/55 { color: color-mix(in srgb, var(--ink) 55%, transparent); }
        .text-ink\\/45 { color: color-mix(in srgb, var(--ink) 45%, transparent); }
        .text-ink\\/35 { color: color-mix(in srgb, var(--ink) 35%, transparent); }
        .text-paper\\/55 { color: color-mix(in srgb, var(--paper) 55%, transparent); }
        .border-ink { border-color: var(--ink); }
        .border-ink\\/15 { border-color: color-mix(in srgb, var(--ink) 15%, transparent); }
        .border-ink\\/10 { border-color: color-mix(in srgb, var(--ink) 10%, transparent); }
        .font-serif { font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif; }
        .font-sans  { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      `,
        }}
      />

      {/* Masthead */}
      <div className="border-b border-ink/15">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/website" aria-label="Baseform home">
            <Logo variant="lockup" size="md" />
          </Link>
          <Link
            href="/website"
            className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-ink/65 hover:text-ink"
          >
            <ArrowLeft size={12} />
            Back
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-5 pt-12 pb-12 sm:px-8 sm:pt-20 sm:pb-16">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-orange-600">
            How it works · A four-part tour
          </p>
          <h1 className="mt-6 max-w-4xl font-serif text-[40px] font-medium leading-[0.98] tracking-tight text-ink sm:text-7xl lg:text-[80px]">
            See the app, before you{" "}
            <span className="italic text-orange-600">touch the app.</span>
          </h1>
          <p className="mt-7 max-w-2xl font-serif text-lg italic leading-relaxed text-ink/65 sm:text-xl">
            Skhathi and Ande will walk you through every screen — onboarding, sign-in, and
            both the Grade 11 and Grade 12 home dashboards. Four phones, four phases, no
            sign-up needed to look around.
          </p>

          {/* Cast intro */}
          <div className="mt-10 grid gap-5 border-t border-ink/15 pt-8 sm:grid-cols-2">
            <div className="flex items-start gap-4">
              <Avatar who="skhathi" size="lg" />
              <div>
                <p className="font-serif text-xl font-medium text-ink">Skhathi</p>
                <p className="mt-1 font-serif text-sm italic text-ink/65">
                  Walks Grade 11s through planning, targets, and bursary discovery.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Avatar who="ande" size="lg" />
              <div>
                <p className="font-serif text-xl font-medium text-ink">Ande</p>
                <p className="mt-1 font-serif text-sm italic text-ink/65">
                  Walks Grade 12s from sign-up through to live applications.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Phase I · Onboarding → Reveal ─────────────────────────── */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-orange-600">
                Phase I · Onboarding
              </p>
              <h2 className="mt-3 font-serif text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl">
                A few questions.{" "}
                <span className="italic text-ink/55">Then a reveal.</span>
              </h2>
              <p className="mt-5 max-w-md font-serif text-base italic leading-relaxed text-ink/65">
                Three short steps: your name and contact, your subjects and marks, then a
                bit about your grade, school and field of interest. No account yet. At the
                end, the Opportunity Report shows what you qualify for.
              </p>

              <div className="mt-8 flex flex-col gap-5">
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

            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-5">
                <PhoneFrame label="Step 1 · Your details" bg="#ffffff">
                  <ScreenOnboarding />
                </PhoneFrame>
                <PhoneFrame label="Step 2 · Subjects" bg="#ffffff">
                  <ScreenSubjects />
                </PhoneFrame>
                <PhoneFrame label="Opportunity Report">
                  <ScreenReveal />
                </PhoneFrame>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Phase II · Sign-up → Login ────────────────────────────── */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="order-2 lg:order-1 lg:col-span-7">
              <div className="grid grid-cols-2 gap-6 sm:gap-8">
                <PhoneFrame label="Sign up" bg="#f9fafb">
                  <ScreenSignup />
                </PhoneFrame>
                <PhoneFrame label="Sign in" bg="#f9fafb">
                  <ScreenLogin />
                </PhoneFrame>
              </div>
            </div>

            <div className="order-1 lg:order-2 lg:col-span-5">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-orange-600">
                Phase II · Account
              </p>
              <h2 className="mt-3 font-serif text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl">
                Save your paths.{" "}
                <span className="italic text-ink/55">Pick them up anywhere.</span>
              </h2>
              <p className="mt-5 max-w-md font-serif text-base italic leading-relaxed text-ink/65">
                Sign-up is two short steps. Email and password first, then a guardian
                contact. After that, every device you log in on shows your matched
                programmes, bursaries and documents.
              </p>

              <div className="mt-8 flex flex-col gap-5">
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

      {/* ── Phase III · Inside · Grade 11 ─────────────────────────── */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-orange-600">
                Phase III · Inside · Grade 11
              </p>
              <h2 className="mt-3 font-serif text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl">
                Plan ahead.{" "}
                <span className="italic text-ink/55">Build your shortlist.</span>
              </h2>
              <p className="mt-5 max-w-md font-serif text-base italic leading-relaxed text-ink/65">
                Grade 11 is about <em>preparation</em>. Targets you set now decide which
                doors are open in Grade 12. The home tiles are tuned for that.
              </p>

              <div className="mt-8 flex flex-col gap-5">
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

            <div className="lg:col-span-7">
              <div className="mx-auto max-w-md">
                <PhoneFrame label="Home · Grade 11">
                  <DashboardScreen grade="11" />
                </PhoneFrame>
              </div>

              <ul className="mx-auto mt-8 grid max-w-md gap-2 text-sm sm:grid-cols-2">
                {[
                  { Icon: Bot, label: "BaseBot — ask anything" },
                  { Icon: Target, label: "Targets — set the APS goal" },
                  { Icon: GraduationCap, label: "Programmes — explore" },
                  { Icon: Trophy, label: "Bursaries — discover" },
                ].map((f) => (
                  <li
                    key={f.label}
                    className="flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3 py-2"
                  >
                    <f.Icon size={13} className="text-orange-600" />
                    <span className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-ink">
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Phase IV · Inside · Grade 12 ──────────────────────────── */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="order-2 lg:order-1 lg:col-span-7">
              <div className="mx-auto max-w-md">
                <PhoneFrame label="Home · Grade 12">
                  <DashboardScreen grade="12" />
                </PhoneFrame>
              </div>

              <ul className="mx-auto mt-8 grid max-w-md gap-2 text-sm sm:grid-cols-2">
                {[
                  { Icon: FileText, label: "Applications — submit & track" },
                  { Icon: TrendingUp, label: "Progress — XP and level" },
                  { Icon: ListChecks, label: "Documents — upload once" },
                  { Icon: Bell, label: "Reminders — never miss a deadline" },
                ].map((f) => (
                  <li
                    key={f.label}
                    className="flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3 py-2"
                  >
                    <f.Icon size={13} className="text-blue-600" />
                    <span className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-ink">
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="order-1 lg:order-2 lg:col-span-5">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-blue-600">
                Phase IV · Inside · Grade 12
              </p>
              <h2 className="mt-3 font-serif text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl">
                Apply.{" "}
                <span className="italic text-ink/55">Track. Land.</span>
              </h2>
              <p className="mt-5 max-w-md font-serif text-base italic leading-relaxed text-ink/65">
                Grade 12 is the live season. Targets give way to <em>Applications</em>{" "}
                and <em>Progress</em> — what you&apos;ve sent, what you&apos;re waiting
                on, what&apos;s next.
              </p>

              <div className="mt-8 flex flex-col gap-5">
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

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-24 text-center sm:px-8 sm:py-32">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-orange-600">
            Tour&apos;s over · ready to try?
          </p>
          <h2 className="mx-auto mt-5 max-w-3xl font-serif text-4xl font-medium leading-none tracking-tight text-ink sm:text-6xl">
            The real thing is{" "}
            <span className="italic text-orange-600">free to start.</span>
          </h2>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 bg-orange-500 px-8 py-4 font-sans text-xs font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-ink"
            >
              Start the real onboarding
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/website"
              className="inline-flex items-center gap-2 border border-ink px-8 py-4 font-sans text-xs font-bold uppercase tracking-[0.22em] text-ink hover:bg-ink hover:text-paper"
            >
              Back to home
              <ArrowLeft size={14} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
