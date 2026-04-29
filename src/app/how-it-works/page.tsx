import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Bot,
  Compass,
  FileText,
  Folder,
  GraduationCap,
  ListChecks,
  Menu,
  Search,
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

const CHARACTERS: Record<Character, { name: string; role: string; bg: string; ring: string; tone: string }> = {
  skhathi: {
    name: "Skhathi",
    role: "Tour guide · Grade 11 paths",
    bg: "bg-orange-500",
    ring: "ring-orange-200",
    tone: "text-orange-600",
  },
  ande: {
    name: "Ande",
    role: "Tour guide · Grade 12 paths",
    bg: "bg-emerald-700",
    ring: "ring-emerald-200",
    tone: "text-emerald-700",
  },
};

function Avatar({ who, size = "md" }: { who: Character; size?: "sm" | "md" | "lg" }) {
  const c = CHARACTERS[who];
  const dim = size === "lg" ? "size-14 text-lg" : size === "sm" ? "size-9 text-xs" : "size-11 text-sm";
  return (
    <span
      className={`grid shrink-0 ${dim} place-items-center rounded-full ${c.bg} font-sans font-bold uppercase tracking-wider text-white ring-4 ${c.ring}`}
      aria-hidden="true"
    >
      {c.name[0]}
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

function PhoneFrame({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      {/* Frame */}
      <div className="relative aspect-[9/19] rounded-[42px] border-[10px] border-ink bg-ink p-1 shadow-[0_30px_60px_rgba(26,23,20,0.25)]">
        {/* Notch */}
        <div className="absolute left-1/2 top-1.5 z-20 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-ink" />
        {/* Screen */}
        <div className="relative h-full w-full overflow-hidden rounded-[32px] bg-[#fff9f2]">
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

function ScreenOnboarding() {
  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <div className="flex flex-col items-start gap-3 px-5 pt-6">
        <p className="font-sans text-[8px] font-bold uppercase tracking-[0.18em] text-orange-600">
          Step 3 of 5
        </p>
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-orange-100">
          <div className="h-full w-3/5 bg-orange-500" />
        </div>
        <h3 className="mt-4 font-serif text-[19px] font-bold leading-tight text-ink">
          What grade are you in?
        </h3>
        <p className="font-serif text-[11px] italic text-ink/60">
          We&apos;ll tailor everything to you.
        </p>
      </div>
      <div className="mt-5 flex flex-col gap-2 px-5">
        {[
          { label: "Grade 11", note: "Plan early. Build my targets.", active: true },
          { label: "Grade 12", note: "I&apos;m applying this year.", active: false },
        ].map((o) => (
          <div
            key={o.label}
            className={`rounded-2xl border-2 px-3 py-3 ${
              o.active ? "border-orange-500 bg-orange-50" : "border-ink/15 bg-white"
            }`}
          >
            <p className="font-sans text-[12px] font-bold text-ink">{o.label}</p>
            <p className="font-serif text-[10px] italic text-ink/55" dangerouslySetInnerHTML={{ __html: o.note }} />
          </div>
        ))}
      </div>
      <div className="mt-auto px-5 pb-6">
        <div className="rounded-full bg-ink py-2.5 text-center font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-white">
          Continue →
        </div>
      </div>
    </div>
  );
}

function ScreenReveal() {
  return (
    <div className="flex h-full flex-col items-center px-5 pt-6 text-center">
      <StatusBar />
      <Sparkles size={26} className="mt-4 text-orange-500" />
      <p className="mt-3 font-sans text-[8px] font-bold uppercase tracking-[0.22em] text-orange-600">
        Your reveal
      </p>
      <h3 className="mt-2 font-serif text-[20px] font-bold leading-[1.1] text-ink">
        We found 8 paths for you.
      </h3>
      <div className="mt-4 grid w-full grid-cols-2 gap-2">
        {[
          { v: "8", l: "Programmes" },
          { v: "12", l: "Bursaries" },
          { v: "32", l: "APS" },
          { v: "4", l: "Universities" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border border-orange-100 bg-white px-2 py-2">
            <p className="font-sans text-lg font-bold text-orange-500">{s.v}</p>
            <p className="font-sans text-[8px] font-bold uppercase tracking-wider text-ink/50">
              {s.l}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-auto w-full pb-6">
        <div className="rounded-full bg-orange-500 py-2.5 text-center font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-white">
          See my paths →
        </div>
      </div>
    </div>
  );
}

function ScreenSignup() {
  return (
    <div className="flex h-full flex-col px-5 pt-6">
      <StatusBar />
      <p className="mt-4 font-sans text-[8px] font-bold uppercase tracking-[0.22em] text-orange-600">
        Create account
      </p>
      <h3 className="mt-2 font-serif text-[19px] font-bold leading-tight text-ink">
        Save your matched paths.
      </h3>
      <div className="mt-4 flex flex-col gap-3">
        {[
          { label: "Full name", value: "Lwazi Mthembu" },
          { label: "Email", value: "lwazi@example.co.za" },
          { label: "Password", value: "••••••••" },
        ].map((f) => (
          <div key={f.label} className="border-b border-ink/15 pb-1">
            <p className="font-sans text-[8px] font-bold uppercase tracking-wider text-ink/45">
              {f.label}
            </p>
            <p className="font-serif text-[12px] text-ink">{f.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-auto pb-6">
        <div className="rounded-full bg-orange-500 py-2.5 text-center font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-white">
          Create account
        </div>
        <p className="mt-3 text-center font-serif text-[10px] italic text-ink/50">
          Already with us?{" "}
          <span className="font-bold not-italic text-orange-600">Sign in →</span>
        </p>
      </div>
    </div>
  );
}

function ScreenLogin() {
  return (
    <div className="flex h-full flex-col px-5 pt-6">
      <StatusBar />
      <p className="mt-4 font-sans text-[8px] font-bold uppercase tracking-[0.22em] text-orange-600">
        Welcome back
      </p>
      <h3 className="mt-2 font-serif text-[19px] font-bold leading-tight text-ink">
        Pick up where you left off.
      </h3>
      <div className="mt-4 flex flex-col gap-3">
        {[
          { label: "Email", value: "lwazi@example.co.za" },
          { label: "Password", value: "••••••••" },
        ].map((f) => (
          <div key={f.label} className="border-b border-ink/15 pb-1">
            <p className="font-sans text-[8px] font-bold uppercase tracking-wider text-ink/45">
              {f.label}
            </p>
            <p className="font-serif text-[12px] text-ink">{f.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 font-sans text-[9px] font-bold uppercase tracking-wider text-orange-600">
        Forgot password?
      </p>
      <div className="mt-auto pb-6">
        <div className="rounded-full bg-ink py-2.5 text-center font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-white">
          Sign in →
        </div>
      </div>
    </div>
  );
}

function DashboardScreen({ grade }: { grade: "11" | "12" }) {
  const tiles =
    grade === "11"
      ? [
          { label: "BaseBot", Icon: Bot, bg: "bg-purple-50", fg: "text-purple-600" },
          { label: "Targets", Icon: Target, bg: "bg-blue-50", fg: "text-blue-600" },
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
        ];

  const headline = grade === "11" ? "Plan early, win big." : "Apply once, track everywhere.";
  const sub =
    grade === "11"
      ? "Explore your planning and preparation tools"
      : "Jump into your key application tools";

  return (
    <div className="flex h-full flex-col">
      <StatusBar />
      <div className="flex items-center justify-between px-4 pt-3">
        <Menu size={14} className="text-ink/55" />
        <Search size={14} className="text-ink/55" />
      </div>
      <div className="px-4 pt-3">
        <p className="font-sans text-[9px] font-bold uppercase tracking-wider text-ink/45">
          Good morning,
        </p>
        <p className="font-serif text-base font-bold text-ink">
          <span className="text-orange-500">Lwazi</span>
        </p>
        <div className="mt-3 rounded-2xl border border-orange-100 bg-white p-2.5">
          <p className="font-sans text-[8px] font-bold uppercase tracking-wider text-orange-600">
            {grade === "11" ? "Grade 11 · Plan ahead" : "Grade 12 · Active applications"}
          </p>
          <p className="mt-0.5 font-serif text-[12px] font-bold leading-tight text-ink">
            {headline}
          </p>
          <p className="mt-0.5 font-serif text-[9px] italic text-ink/55">{sub}</p>
        </div>
      </div>
      <div className="mt-3 grid grow grid-cols-3 gap-1.5 px-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-ink/10 bg-white py-2.5"
          >
            <span className={`grid size-7 place-items-center rounded-lg ${t.bg}`}>
              <t.Icon size={13} className={t.fg} />
            </span>
            <span className="font-sans text-[8px] font-bold text-ink">{t.label}</span>
          </div>
        ))}
      </div>
      {/* Bottom nav */}
      <div className="mt-2 flex justify-around border-t border-ink/10 bg-white px-4 py-2">
        {[GraduationCap, Compass, Bell, User].map((Ic, i) => (
          <Ic
            key={i}
            size={14}
            className={i === 0 ? "text-orange-500" : "text-ink/35"}
          />
        ))}
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
                Five short steps tell us your grade, marks, and what you&apos;re curious
                about. No account yet. At the end, the Reveal page shows what we found
                for you.
              </p>

              <div className="mt-8 flex flex-col gap-5">
                <Speech
                  who="skhathi"
                  lines={[
                    "Hey — start by telling us what grade you're in. That picks the whole path the app shows you.",
                    "Then we ask about your subjects and marks. APS gets calculated automatically.",
                  ]}
                />
                <Speech
                  who="skhathi"
                  lines={[
                    "When you finish, you land on the Reveal — a snapshot of programmes and bursaries that match your numbers. No sign-up needed yet to see it.",
                  ]}
                />
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="grid grid-cols-2 gap-6 sm:gap-8">
                <PhoneFrame label="Onboarding · Step 3">
                  <ScreenOnboarding />
                </PhoneFrame>
                <PhoneFrame label="The Reveal">
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
                <PhoneFrame label="Sign up">
                  <ScreenSignup />
                </PhoneFrame>
                <PhoneFrame label="Sign in">
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
                Sign-up is one screen. Email and a password — that&apos;s it. After
                that, every device you log in on shows your matched programmes,
                bursaries and documents.
              </p>

              <div className="mt-8 flex flex-col gap-5">
                <Speech
                  who="ande"
                  lines={[
                    "Sign-up takes about ten seconds. Your reveal results carry over — nothing gets lost.",
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
                    <f.Icon size={13} className="text-emerald-700" />
                    <span className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-ink">
                      {f.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="order-1 lg:order-2 lg:col-span-5">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">
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
          <h2 className="mx-auto mt-5 max-w-3xl font-serif text-4xl font-medium leading-[1.0] tracking-tight text-ink sm:text-6xl">
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
