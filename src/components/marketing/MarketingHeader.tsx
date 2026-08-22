"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import Logo from "@/components/ui/Logo";

const NAV_LINKS = [
  { href: "/#try", label: "Ask BaseBot" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/#schools", label: "Schools" },
  { href: "/about", label: "About" },
];

export default function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-50 backdrop-blur-[12px] transition-all duration-300 ${
          scrolled
            ? "border-b border-[var(--line)] bg-[var(--cream)]/92"
            : "border-b border-transparent bg-[var(--cream)]/78"
        }`}
      >
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-6 h-[72px]">
          {/* Logo */}
          <Link
            href="/"
            aria-label="Baseform home"
            className="flex-shrink-0 hover:opacity-80 transition-opacity"
          >
            <Logo variant="lockup" size="md" />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[0.97rem] font-medium text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/login"
              className="text-[0.97rem] font-medium text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/onboarding"
              className="btn btn-primary inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-bold"
            >
              Start free
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="grid size-10 place-items-center rounded-xl border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--cream-2)] lg:hidden transition-colors"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Panel */}
      {menuOpen && (
        <div className="fixed inset-x-0 top-[72px] bottom-0 z-40 bg-[var(--cream)]/98 backdrop-blur-sm px-6 pt-6 pb-8 lg:hidden flex flex-col justify-between overflow-y-auto">
          <div className="flex flex-col gap-5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-xl font-semibold text-[var(--ink)]"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-4 mt-8">
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="text-lg font-semibold text-[var(--ink-soft)] text-center"
            >
              Sign in
            </Link>
            <Link
              href="/onboarding"
              onClick={() => setMenuOpen(false)}
              className="btn btn-primary inline-flex w-full items-center justify-center gap-2 py-4 text-lg font-bold"
            >
              Start free
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
