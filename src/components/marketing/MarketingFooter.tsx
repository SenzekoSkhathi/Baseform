import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import Logo from "@/components/ui/Logo";

/**
 * Shared marketing site footer — modern sans-serif design.
 * 4-column grid matching the new Baseform design system.
 */
export default function MarketingFooter() {
  return (
    <footer className="relative z-10" style={{ background: "var(--cream)" }}>
      <div className="mx-auto max-w-[1180px] px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-5">
            <Logo variant="lockup" size="md" />
            <p className="mt-4 max-w-sm text-[0.95rem] leading-relaxed text-[var(--ink-soft)]">
              AI career guidance for every South African learner. From career
              question to submitted application — public universities, NSFAS and
              bursaries, all in one place.
            </p>
            <div className="mt-6 space-y-2">
              <Link
                href="mailto:info@baseformapplications.com"
                className="inline-flex items-center gap-2 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
              >
                <Mail size={13} className="text-[var(--orange)]" />
                info@baseformapplications.com
              </Link>
              <br />
              <Link
                href="mailto:support@baseformapplications.com"
                className="inline-flex items-center gap-2 text-sm text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
              >
                <MessageCircle size={13} className="text-[var(--orange)]" />
                support@baseformapplications.com
              </Link>
            </div>
          </div>

          {/* Sections */}
          <div className="lg:col-span-2">
            <h4 className="label text-[0.68rem]">Product</h4>
            <ul className="mt-5 space-y-2.5 text-[0.95rem]">
              <li>
                <Link
                  href="/#try"
                  className="text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
                >
                  Ask BaseBot
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
                >
                  How it works
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
                >
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Partners */}
          <div className="lg:col-span-2">
            <h4 className="label text-[0.68rem]">Partners</h4>
            <ul className="mt-5 space-y-2.5 text-[0.95rem]">
              <li>
                <Link
                  href="/#schools"
                  className="text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
                >
                  Schools
                </Link>
              </li>
              <li>
                <Link
                  href="/#schools"
                  className="text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
                >
                  NGOs
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
                >
                  Contact us
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="lg:col-span-3">
            <h4 className="label text-[0.68rem]">Legal</h4>
            <ul className="mt-5 space-y-2.5 text-[0.95rem]">
              <li>
                <Link
                  href="/privacy"
                  className="text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li className="text-sm text-[var(--ink-soft)]/60">
                POPIA compliant
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 flex flex-col items-start justify-between gap-2 border-t border-[var(--line)] pt-6 sm:flex-row sm:items-center">
          <span className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-[var(--ink-soft)]/55">
            © {new Date().getFullYear()} Lumen AI (Pty) Ltd · Made in South
            Africa
          </span>
          <span className="label text-[0.68rem] text-[var(--orange)]">
            Sizokusiza · we&apos;ll help you
          </span>
        </div>
      </div>
    </footer>
  );
}
