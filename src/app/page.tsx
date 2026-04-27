"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, GraduationCap, Trophy, Clock, CheckCircle } from "lucide-react";
import Logo from "@/components/ui/Logo";
import {
  DEFAULT_HOME_FEATURES,
  DEFAULT_HOME_STATS,
  DEFAULT_HOME_SUBTITLE,
  type HomeStat,
} from "@/lib/site-config/defaults";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: EASE },
  }),
};

const ICON_BY_KEY = {
  "graduation-cap": GraduationCap,
  trophy: Trophy,
  clock: Clock,
} as const;

export default function Home() {
  const [subtitle, setSubtitle] = useState(DEFAULT_HOME_SUBTITLE);
  const [features, setFeatures] = useState(DEFAULT_HOME_FEATURES);
  const [stats, setStats] = useState<HomeStat[]>(DEFAULT_HOME_STATS);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSiteConfig() {
      try {
        const res = await fetch("/api/site-config", { signal: controller.signal });
        if (!res.ok) return;

        const payload = await res.json();

        if (typeof payload?.homeSubtitle === "string" && payload.homeSubtitle.trim()) {
          setSubtitle(payload.homeSubtitle);
        }

        if (Array.isArray(payload?.homeFeatures)) {
          const parsed = payload.homeFeatures
            .map((value: unknown) => String(value ?? "").trim())
            .filter(Boolean);
          if (parsed.length > 0) setFeatures(parsed);
        }

        if (Array.isArray(payload?.homeStats)) {
          const parsed = (payload.homeStats as unknown[])
            .map((entry: unknown) => {
              const row = entry as Record<string, unknown>;
              const iconRaw = String(row.icon ?? "");
              if (!(iconRaw in ICON_BY_KEY)) return null;
              return {
                value: String(row.value ?? "").trim(),
                label: String(row.label ?? "").trim(),
                icon: iconRaw as keyof typeof ICON_BY_KEY,
                color: String(row.color ?? "text-orange-500"),
              };
            })
            .filter((item: HomeStat | null): item is HomeStat => Boolean(item?.value && item?.label));

          if (parsed.length > 0) setStats(parsed);
        }
      } catch {
        // Keep defaults when config fetch fails.
      }
    }

    void loadSiteConfig();
    return () => controller.abort();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff9f2] text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_12%_18%,rgba(251,146,60,0.30),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_86%_18%,rgba(236,72,153,0.14),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_70%_95%,rgba(56,189,248,0.14),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.54),rgba(255,247,237,0.82))]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-8 pt-5 sm:px-8 lg:px-10">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="flex items-center justify-between"
        >
          <Logo variant="lockup" size="md" />
          <Link
            href="/login"
            className="rounded-xl border border-slate-300/80 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 backdrop-blur hover:bg-white"
          >
            Log in
          </Link>
        </motion.header>

        <section className="grid flex-1 items-center gap-8 py-7 lg:grid-cols-12 lg:gap-12 lg:py-12">
          <div className="lg:col-span-7">
            <motion.p
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mb-4 inline-flex rounded-full border border-orange-300 bg-orange-100/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-orange-700 sm:text-xs"
            >
              For South African learners
            </motion.p>

            <motion.h1
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="max-w-2xl text-3xl font-black leading-[1.04] text-slate-900 sm:text-5xl lg:text-6xl"
            >
              Dream big.
              <span className="block text-orange-500">Apply with confidence.</span>
              Win your future.
            </motion.h1>

            <motion.p
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-5 max-w-xl text-sm leading-relaxed text-slate-600 sm:mt-6 sm:text-lg"
            >
              {subtitle}
            </motion.p>

            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-7 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/onboarding"
                className="group relative inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-4 text-base font-black text-white shadow-[0_10px_35px_rgba(249,115,22,0.55)] transition-all hover:-translate-y-0.5 hover:bg-orange-400 sm:w-auto"
              >
                <span className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative">Get started for free</span>
                <ArrowRight size={18} className="relative transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                href="/plans"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-4 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-100 sm:w-auto"
              >
                View plans
              </Link>

              <Link
                href="/website"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-4 text-base font-semibold text-slate-700 transition-colors hover:bg-slate-100 sm:w-auto"
              >
                View website
              </Link>
            </motion.div>

            <motion.div
              custom={5}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-5 grid grid-cols-3 gap-2 sm:gap-3 lg:hidden"
            >
              {stats.map(({ icon, value, label, color }) => {
                const Icon = ICON_BY_KEY[icon];
                return (
                <div key={`mobile-${label}`} className="rounded-2xl border border-orange-100 bg-white/90 p-2.5 text-center shadow-sm">
                  <Icon size={14} className={`${color} mx-auto`} />
                  <p className="mt-1 text-sm font-black leading-none text-slate-900">{value}</p>
                  <p className="mt-1 text-[10px] leading-tight text-slate-500">{label}</p>
                </div>
                );
              })}
            </motion.div>

            <motion.p
              custom={6}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-5 text-xs text-slate-500 sm:text-sm"
            >
              Free to start. No credit card. Setup takes around 2 minutes.
            </motion.p>
          </div>

          <motion.aside
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="hidden lg:col-span-5 lg:block"
          >
            <div className="rounded-3xl border border-orange-100 bg-white/80 p-5 shadow-[0_20px_60px_rgba(249,115,22,0.16)] backdrop-blur-md sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Application command center</p>

              <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
                {stats.map(({ icon, value, label, color }) => {
                  const Icon = ICON_BY_KEY[icon];
                  return (
                  <div key={label} className="rounded-2xl border border-orange-100 bg-white p-3 text-center">
                    <Icon size={17} className={`${color} mx-auto`} />
                    <p className="mt-1.5 text-lg font-black leading-none text-slate-900">{value}</p>
                    <p className="mt-1 text-[11px] leading-tight text-slate-500">{label}</p>
                  </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-2xl bg-orange-50/90 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-orange-700">What you get</p>
                <div className="mt-3 grid gap-2">
                  {features.map((feature, i) => (
                    <motion.div
                      key={feature}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.06, duration: 0.35, ease: "easeOut" }}
                      className="flex items-start gap-2"
                    >
                      <CheckCircle size={15} className="mt-0.5 shrink-0 text-orange-500" />
                      <span className="text-sm leading-snug text-slate-700">{feature}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.aside>
        </section>
      </div>

      <footer className="relative z-10 border-t border-orange-100/60 bg-[#fff9f2] py-4 px-4 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Lumen AI (Pty) Ltd</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-600 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
