import Link from "next/link";
import { ArrowRight } from "lucide-react";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";

export const metadata = {
  title: "About — Baseform",
  description:
    "Why Baseform exists: flattening the playing field for every South African matric facing university applications, bursaries, and deadlines.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  {
    n: "01",
    title: "Access over gatekeeping",
    body: "Information about universities, bursaries, and funding shouldn't depend on which school you went to or who your parents know. We surface what students need — in plain language, for free or at a price any matriculant can afford.",
  },
  {
    n: "02",
    title: "Built for South Africa, not adapted for it",
    body: "NSFAS, Funza Lushaka, Allan Gray, USaf, CAO, individual university portals — we meet the system where it actually is, not where a Silicon Valley template assumes it should be.",
  },
  {
    n: "03",
    title: "Student outcomes over vanity metrics",
    body: "We measure ourselves by offers received, bursaries secured, and students placed — not by signups or screen time.",
  },
];

export default function AboutPage() {
  return (
    <>
      <MarketingHeader />

      <main className="relative min-h-screen">
        {/* Hero */}
        <section className="sec" style={{ paddingBottom: "60px" }}>
          <div className="wrap text-center">
            <span className="label">About Baseform</span>
            <h1 className="display mt-6 max-w-4xl mx-auto">
              The paperwork shouldn&apos;t be what{" "}
              <span className="accent">stops them.</span>
            </h1>
            <p className="lead mt-8 mx-auto">
              We&apos;re building the application layer every South African matric deserves —
              so the future of a learner is decided by their grades and their drive, not by
              who they know.
            </p>
          </div>
        </section>

        {/* Why it exists */}
        <section className="sec border-t border-[var(--line)]">
          <div className="wrap">
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-4">
                <span className="label">Why it exists</span>
                <h2 className="heading-lg mt-3">
                  The same impossible maze,{" "}
                  <span className="text-[var(--ink-soft)]">every year.</span>
                </h2>
              </div>

              <div className="lg:col-span-8 space-y-6 text-lg text-[var(--ink-soft)] leading-[1.6]">
                <p>
                  Every year, hundreds of thousands of South African matrics face the same
                  maze: applying to multiple universities, hunting down bursaries scattered
                  across the internet, tracking deadlines, gathering documents, and decoding
                  requirements that quietly assume you have someone in your corner who&apos;s
                  done this before. Most don&apos;t.
                </p>
                <p>
                  Promising students miss out — not because they aren&apos;t capable, but
                  because the system rewards those with access to information, guidance, and
                  admin support. The grades are there. The drive is there. What&apos;s missing
                  is the scaffolding everyone else takes for granted.
                </p>
                <p>
                  Baseform exists to flatten that playing field. One place to discover the
                  right universities and bursaries, manage applications end-to-end, and never
                  miss a deadline that could change a life. If a learner has the grades and
                  the drive,{" "}
                  <span className="font-semibold text-[var(--ink)]">
                    the paperwork shouldn&apos;t be what stops them.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pull quote — dark thesis section */}
        <section className="sec" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className="thesis">
            <div className="wrap">
              <span className="label" style={{ color: "var(--orange)" }}>
                In short
              </span>
              <h2 className="mt-5 max-w-4xl">
                We don&apos;t see a talent shortage in this country.{" "}
                <span className="accent">We see an information shortage.</span>
              </h2>
            </div>
          </div>
        </section>

        {/* What we stand for */}
        <section className="sec">
          <div className="wrap">
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-4">
                <span className="label">What we stand for</span>
                <h2 className="heading-lg mt-3">
                  Three principles.{" "}
                  <span className="accent">No exceptions.</span>
                </h2>
                <p className="mt-4 text-[var(--ink-soft)]">
                  Every product decision either passes through these or doesn&apos;t happen.
                </p>
              </div>

              <ol className="lg:col-span-8">
                {VALUES.map((v, i) => (
                  <li
                    key={v.n}
                    className={`grid gap-4 py-8 sm:grid-cols-12 sm:gap-8 ${
                      i !== 0 ? "border-t border-[var(--line)]" : ""
                    }`}
                  >
                    <p className="sm:col-span-2 text-2xl font-bold text-[var(--orange)]">
                      {v.n}
                    </p>
                    <div className="sm:col-span-10">
                      <h3 className="text-xl font-bold tracking-tight text-[var(--ink)]">
                        {v.title}
                      </h3>
                      <p className="mt-2 text-[1.05rem] leading-relaxed text-[var(--ink-soft)]">
                        {v.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="sec" style={{ paddingTop: 0 }}>
          <div className="final-cta text-center flex flex-col items-center">
            <span className="label text-[var(--ink)] mb-4">Sizokusiza · we&apos;ll help you</span>
            <h2 className="mx-auto text-center" style={{ maxWidth: "24ch" }}>
              If this is for you, the rest is{" "}
              <span className="underline underline-offset-4 decoration-2 decoration-white/40">just one click.</span>
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3 relative z-10">
              <Link href="/onboarding" className="btn btn-dark">
                Start free
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/contact"
                className="btn"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.25)",
                }}
              >
                Get in touch
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
