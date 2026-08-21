"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import Logo from "@/components/ui/Logo";

/**
 * Shared marketing site header — masthead strip + sticky nav + mobile menu.
 *
 * Extracted from the landing page so every public page (about, how-it-works,
 * contact, plans...) shares one nav. Section links point at the landing page
 * with an absolute hash (`/#pricing`) so they resolve from any sub-page, not
 * only from "/".
 *
 * Relies on the `.marketing-root` theme from (marketing)/layout.tsx for the
 * paper/ink palette classes used below.
 */

const NAV_LINKS = [
  { href: "/#try", label: "Ask BaseBot" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#schools", label: "Schools" },
  { href: "/about", label: "About" },
];

export default function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
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
    </>
  );
}
