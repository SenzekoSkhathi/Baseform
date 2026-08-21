import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import Logo from "@/components/ui/Logo";

/**
 * Shared marketing site footer (masthead style).
 *
 * Extracted from the landing page. Section links use absolute hashes
 * (`/#try`) so they resolve from any marketing sub-page. Relies on the
 * `.marketing-root` theme from (marketing)/layout.tsx.
 */
export default function MarketingFooter() {
  return (
    <footer className="bg-paper">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="border-t-2 border-ink pt-8">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <Logo variant="lockup" size="md" />
              <p className="mt-4 max-w-sm font-serif text-base leading-relaxed text-ink/70">
                AI career guidance for every South African learner. From career question to
                submitted application — public universities, NSFAS and bursaries, all in one
                place.
              </p>
              <div className="mt-6 space-y-2">
                <Link
                  href="mailto:info@baseformapplications.com"
                  className="inline-flex items-center gap-2 font-serif text-sm italic text-ink/70 hover:text-ink"
                >
                  <Mail size={13} className="text-orange-600" />
                  info@baseformapplications.com
                </Link>
                <br />
                <Link
                  href="mailto:support@baseformapplications.com"
                  className="inline-flex items-center gap-2 font-serif text-sm italic text-ink/70 hover:text-ink"
                >
                  <MessageCircle size={13} className="text-orange-600" />
                  support@baseformapplications.com
                </Link>
              </div>
            </div>

            <div className="lg:col-span-2">
              <h4 className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-ink">
                Sections
              </h4>
              <ul className="mt-5 space-y-2.5 font-serif text-base text-ink/75">
                <li><Link href="/#try" className="hover:text-ink">Ask BaseBot</Link></li>
                <li><Link href="/how-it-works" className="hover:text-ink">How it works</Link></li>
                <li><Link href="/#pricing" className="hover:text-ink">Pricing</Link></li>
                <li><Link href="/about" className="hover:text-ink">About</Link></li>
              </ul>
            </div>

            <div className="lg:col-span-2">
              <h4 className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-ink">
                Partners
              </h4>
              <ul className="mt-5 space-y-2.5 font-serif text-base text-ink/75">
                <li><Link href="/#schools" className="hover:text-ink">Schools</Link></li>
                <li><Link href="/#schools" className="hover:text-ink">NGOs</Link></li>
                <li>
                  <Link
                    href="mailto:info@baseformapplications.com"
                    className="hover:text-ink"
                  >
                    Press
                  </Link>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-3">
              <h4 className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-ink">
                Colophon
              </h4>
              <ul className="mt-5 space-y-2.5 font-serif text-base text-ink/75">
                <li><Link href="/privacy" className="hover:text-ink">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-ink">Terms</Link></li>
                <li className="font-serif text-sm italic text-ink/60">POPIA compliant</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-2 border-t border-ink/15 pt-6 sm:flex-row sm:items-center">
            <span className="font-sans text-[10px] uppercase tracking-[0.22em] text-ink/55">
              © {new Date().getFullYear()} Lumen AI (Pty) Ltd · Made in South Africa
            </span>
            <span className="font-serif text-sm italic text-ink/60">
              Sizokusiza · we&apos;ll help you
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
