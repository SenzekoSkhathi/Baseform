import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Logo from "@/components/ui/Logo";

export const metadata = {
  title: "About — Baseform",
  description:
    "Why Baseform exists: flattening the playing field for every South African matric facing university applications, bursaries, and deadlines.",
};

const VALUES = [
  {
    n: "I.",
    title: "Access over gatekeeping",
    body: "Information about universities, bursaries, and funding shouldn't depend on which school you went to or who your parents know. We surface what students need — in plain language, for free or at a price any matriculant can afford.",
  },
  {
    n: "II.",
    title: "Built for South Africa, not adapted for it",
    body: "NSFAS, Funza Lushaka, Allan Gray, USaf, CAO, individual university portals — we meet the system where it actually is, not where a Silicon Valley template assumes it should be.",
  },
  {
    n: "III.",
    title: "Student outcomes over vanity metrics",
    body: "We measure ourselves by offers received, bursaries secured, and students placed — not by signups or screen time.",
  },
];

export default function AboutPage() {
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
        .text-ink\\/55 { color: color-mix(in srgb, var(--ink) 55%, transparent); }
        .text-ink\\/65 { color: color-mix(in srgb, var(--ink) 65%, transparent); }
        .text-ink\\/75 { color: color-mix(in srgb, var(--ink) 75%, transparent); }
        .text-ink\\/85 { color: color-mix(in srgb, var(--ink) 85%, transparent); }
        .text-ink\\/45 { color: color-mix(in srgb, var(--ink) 45%, transparent); }
        .text-paper\\/55 { color: color-mix(in srgb, var(--paper) 55%, transparent); }
        .text-paper\\/75 { color: color-mix(in srgb, var(--paper) 75%, transparent); }
        .border-ink { border-color: var(--ink); }
        .border-ink\\/15 { border-color: color-mix(in srgb, var(--ink) 15%, transparent); }
        .border-paper\\/20 { border-color: color-mix(in srgb, var(--paper) 20%, transparent); }
        .font-serif { font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif; }
        .font-sans  { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .dropcap::first-letter {
          font-family: ui-serif, Georgia, "Times New Roman", Times, serif;
          float: left;
          font-size: 4.6em;
          line-height: 0.85;
          padding: 0.08em 0.12em 0 0;
          font-weight: 600;
          color: #ea580c;
        }
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
        <div className="mx-auto max-w-6xl px-5 pt-12 pb-16 sm:px-8 sm:pt-20 sm:pb-24">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-orange-600">
            About Baseform
          </p>
          <h1 className="mt-6 max-w-4xl font-serif text-[44px] font-medium leading-[0.98] tracking-tight text-ink sm:text-7xl lg:text-[88px]">
            The paperwork shouldn&apos;t be what{" "}
            <span className="italic text-orange-600">stops them.</span>
          </h1>
          <p className="mt-8 max-w-2xl font-serif text-lg italic leading-relaxed text-ink/65 sm:text-xl">
            We&apos;re building the application layer every South African matric deserves —
            so the future of a learner is decided by their grades and their drive, not by
            who they know.
          </p>
        </div>
      </section>

      {/* Why it exists */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-3">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-orange-600">
                Why it exists
              </p>
              <h2 className="mt-3 font-serif text-3xl font-medium leading-[1.05] tracking-tight text-ink sm:text-4xl">
                The same impossible maze,{" "}
                <span className="italic text-ink/55">every year.</span>
              </h2>
            </div>

            <div className="lg:col-span-9">
              <p className="dropcap max-w-3xl font-serif text-lg leading-[1.7] text-ink/85 sm:text-xl">
                Every year, hundreds of thousands of South African matrics face the same
                maze: applying to multiple universities, hunting down bursaries scattered
                across the internet, tracking deadlines, gathering documents, and decoding
                requirements that quietly assume you have someone in your corner who&apos;s
                done this before. Most don&apos;t.
              </p>

              <p className="mt-6 max-w-3xl font-serif text-lg leading-[1.7] text-ink/85 sm:text-xl">
                Promising students miss out — not because they aren&apos;t capable, but
                because the system rewards those with access to information, guidance, and
                admin support. The grades are there. The drive is there. What&apos;s missing
                is the scaffolding everyone else takes for granted.
              </p>

              <p className="mt-6 max-w-3xl font-serif text-lg leading-[1.7] text-ink/85 sm:text-xl">
                Baseform exists to flatten that playing field. One place to discover the
                right universities and bursaries, manage applications end-to-end, and never
                miss a deadline that could change a life. If a learner has the grades and
                the drive,{" "}
                <span className="italic text-orange-600">
                  the paperwork shouldn&apos;t be what stops them.
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pull quote — dark forest section */}
      <section className="bg-forest text-paper">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-6 lg:grid-cols-12">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-paper/55 lg:col-span-2">
              In short
            </p>
            <blockquote className="font-serif text-3xl font-medium leading-[1.15] tracking-tight text-paper sm:text-5xl lg:col-span-10 lg:text-6xl">
              We don&apos;t see a talent shortage in this country.{" "}
              <span className="italic text-orange-400">
                We see an information shortage.
              </span>
            </blockquote>
          </div>
        </div>
      </section>

      {/* What we stand for */}
      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-orange-600">
                What we stand for
              </p>
              <h2 className="mt-3 font-serif text-4xl font-medium leading-[1.02] tracking-tight text-ink sm:text-5xl">
                Three principles.{" "}
                <span className="italic">No exceptions.</span>
              </h2>
              <p className="mt-6 max-w-sm font-serif text-base italic leading-relaxed text-ink/65">
                Every product decision either passes through these or doesn&apos;t happen.
              </p>
            </div>

            <ol className="lg:col-span-8 lg:pl-8">
              {VALUES.map((v, i) => (
                <li
                  key={v.n}
                  className={`grid gap-4 py-8 lg:grid-cols-12 lg:gap-8 ${
                    i !== 0 ? "border-t border-ink/15" : ""
                  }`}
                >
                  <p className="font-serif text-3xl italic text-orange-600 lg:col-span-2 lg:text-4xl">
                    {v.n}
                  </p>
                  <div className="lg:col-span-10">
                    <h3 className="font-serif text-2xl font-medium tracking-tight text-ink sm:text-3xl">
                      {v.title}
                    </h3>
                    <p className="mt-3 max-w-2xl font-serif text-lg leading-relaxed text-ink/75">
                      {v.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-24 text-center sm:px-8 sm:py-32">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-orange-600">
            Sizokusiza · we&apos;ll help you
          </p>
          <h2 className="mx-auto mt-5 max-w-3xl font-serif text-4xl font-medium leading-none tracking-tight text-ink sm:text-6xl">
            If this is for you, the rest is{" "}
            <span className="italic text-orange-600">just one click.</span>
          </h2>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 bg-orange-500 px-8 py-4 font-sans text-xs font-bold uppercase tracking-[0.22em] text-white transition-colors hover:bg-ink"
            >
              Start free
              <ArrowRight size={14} />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 border border-ink px-8 py-4 font-sans text-xs font-bold uppercase tracking-[0.22em] text-ink hover:bg-ink hover:text-paper"
            >
              Get in touch
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
