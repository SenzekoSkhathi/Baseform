"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NavigationTile from "@/components/dashboard/NavigationTile";
import ApsProgressCard from "@/components/dashboard/ApsProgressCard";
import TourGuide from "@/components/tour/TourGuide";
import { apsRating } from "@/lib/aps/calculator";

type Profile = {
  full_name: string;
  province: string | null;
  field_of_interest: string | null;
  tier: string;
  grade_year: string | null;
  school_name: string | null;
} | null;

type Props = {
  profile: Profile;
  aps: number;
  totalInstitutionCount: number;
  submittedInstitutionCount: number;
};

const tiles = [
  {
    href: "/basebot",
    title: "BaseBot",
    icon: "/icon.svg",
    iconBg: "bg-purple-50",
    accentColor: "border-purple-200",
    isImage: true,
  },
  {
    href: "/dashboard/detail",
    title: "Applications",
    icon: "📝",
    iconBg: "bg-blue-50",
    accentColor: "border-blue-200",
  },
  {
    href: "/programmes",
    title: "Programmes",
    icon: "🎓",
    iconBg: "bg-orange-50",
    accentColor: "border-orange-200",
  },
  {
    href: "/bursaries",
    title: "Bursaries",
    icon: "💰",
    iconBg: "bg-pink-50",
    accentColor: "border-pink-200",
  },
  {
    href: "/tracker",
    title: "Progress",
    icon: "📈",
    iconBg: "bg-green-50",
    accentColor: "border-green-200",
  },
  {
    href: "/vault",
    title: "Documents",
    icon: "🗂️",
    iconBg: "bg-teal-50",
    accentColor: "border-teal-200",
  },
  {
    href: "/profile",
    title: "Profile",
    icon: "👤",
    iconBg: "bg-amber-50",
    accentColor: "border-amber-200",
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-ZA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardClient({ profile, aps, totalInstitutionCount, submittedInstitutionCount }: Props) {
  const firstName = profile?.full_name?.trim().split(" ")[0] || null;
  const rating = apsRating(aps);
  const gradeYear = profile?.grade_year ?? null;
  const schoolName = profile?.school_name ?? null;
  const profileIncomplete = !firstName;

  const [greeting, setGreeting] = useState("Welcome");
  const [date, setDate] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(getGreeting());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(formatDate());
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fff9f2]">
      <TourGuide />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(65%_55%_at_10%_5%,rgba(251,146,60,0.18),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_40%_at_92%_16%,rgba(56,189,248,0.10),transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-8 pt-5 md:px-8 md:pt-7">
        <section className="rounded-3xl border border-orange-100 bg-white/85 p-4 shadow-[0_18px_45px_rgba(249,115,22,0.12)] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                {date}
              </p>
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-gray-900 md:text-4xl">
                {greeting}{firstName ? <>, <span className="text-orange-500">{firstName}</span></> : null}
              </h1>
              <p className="mt-1 text-xs text-gray-500 md:text-sm">
                Keep moving. Your applications and APS progress are all in one place.
              </p>
            </div>

            <Link href="/profile" aria-label="Go to profile" className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 md:h-16 md:w-16">
                <span className="text-lg font-bold text-white md:text-xl">
                  {firstName ? firstName.charAt(0).toUpperCase() : "?"}
                </span>
              </div>
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500" />
            </Link>
          </div>

          {profileIncomplete ? (
            <Link
              href="/profile"
              className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2.5 hover:bg-orange-100 transition-colors"
            >
              <p className="text-sm font-semibold text-orange-700">Complete your profile to personalise your experience</p>
              <span className="shrink-0 text-xs font-bold text-orange-500">Set up →</span>
            </Link>
          ) : (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-orange-50/80 px-3 py-2.5">
              <div>
                <p className="text-[11px] font-medium text-gray-500">Grade</p>
                <p className="text-sm font-semibold text-gray-800">{gradeYear ?? "—"}</p>
              </div>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-gray-500">School</p>
                <p className="truncate text-sm font-semibold text-gray-800">{schoolName ?? "—"}</p>
              </div>
            </div>
          )}

          <div className="mt-4" data-tour="aps-card">
            <ApsProgressCard
              aps={aps}
              rating={rating}
              totalInstitutionCount={totalInstitutionCount}
              submittedInstitutionCount={submittedInstitutionCount}
            />
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-gray-100 bg-white/90 p-4 shadow-sm md:p-5" data-tour="quick-access">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-gray-900 md:text-xl">
                Quick Access
              </h2>
              <p className="mt-0.5 text-xs font-medium text-gray-400">
                Jump into your key application tools
              </p>
            </div>
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-600">
              {tiles.length} tools
            </span>

          </div>

          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4">
            {tiles.map((tile) => (
              <NavigationTile key={tile.href} {...tile} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
