"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import Logo from "@/components/ui/Logo";

const ROLES = [
  { value: "learner", label: "Learner / matric" },
  { value: "parent", label: "Parent / guardian" },
  { value: "teacher", label: "Teacher / counsellor" },
  { value: "school_ngo", label: "School / NGO" },
  { value: "other", label: "Other" },
];

const HELP = [
  { value: "bulk_school_licence", label: "Bulk school licence" },
  { value: "ngo_partnership", label: "NGO partnership" },
  { value: "press", label: "Press / media" },
  { value: "personal_help", label: "Personal account help" },
  { value: "bug", label: "Report a bug" },
  { value: "other", label: "Something else" },
];

export default function ContactPage() {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [cell, setCell] = useState("");
  const [school, setSchool] = useState("");
  const [role, setRole] = useState("");
  const [help, setHelp] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, surname, email, cell, school, role, help, message }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not send. Try again.");
        setSubmitting(false);
        return;
      }
      setDone(true);
      setSubmitting(false);
    } catch {
      setError("Network hiccup. Check your connection and try again.");
      setSubmitting(false);
    }
  }

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
      <style jsx global>{`
        .bg-paper { background-color: var(--paper); }
        .bg-ink { background-color: var(--ink); }
        .bg-forest { background-color: var(--forest); }
        .text-paper { color: var(--paper); }
        .text-ink { color: var(--ink); }
        .text-ink\\/55 { color: color-mix(in srgb, var(--ink) 55%, transparent); }
        .text-ink\\/65 { color: color-mix(in srgb, var(--ink) 65%, transparent); }
        .text-ink\\/45 { color: color-mix(in srgb, var(--ink) 45%, transparent); }
        .text-ink\\/35 { color: color-mix(in srgb, var(--ink) 35%, transparent); }
        .border-ink { border-color: var(--ink); }
        .border-ink\\/15 { border-color: color-mix(in srgb, var(--ink) 15%, transparent); }
        .border-ink\\/25 { border-color: color-mix(in srgb, var(--ink) 25%, transparent); }
        .placeholder-ink\\/40::placeholder { color: color-mix(in srgb, var(--ink) 40%, transparent); }
        .font-serif { font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif; }
        .font-sans  { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      `}</style>

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

      <section className="border-b border-ink/15">
        <div className="mx-auto max-w-3xl px-5 pt-12 pb-16 sm:px-8 sm:pt-16 sm:pb-20">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-orange-600">
            Contact
          </p>
          <h1 className="mt-4 font-serif text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Let us know what you need, and we&apos;ll{" "}
            <span className="italic text-orange-600">get back to you shortly.</span>
          </h1>
          <p className="mt-5 max-w-xl font-serif text-base italic leading-relaxed text-ink/65">
            Schools, NGOs, parents, learners — tell us what you&apos;re trying to do and we&apos;ll point
            you the right way.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
          {done ? (
            <div className="border-t-2 border-ink pt-10 text-center">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-orange-600">
                Message received
              </p>
              <h2 className="mt-3 font-serif text-3xl font-medium leading-tight text-ink sm:text-4xl">
                Thank you. We&apos;ll be in touch.
              </h2>
              <p className="mt-4 font-serif text-base italic text-ink/65">
                Most replies go out within 1–2 working days.
              </p>
              <Link
                href="/website"
                className="mt-8 inline-flex items-center gap-2 bg-ink px-6 py-3 font-sans text-xs font-bold uppercase tracking-[0.2em] text-paper hover:bg-orange-500"
              >
                <ArrowLeft size={12} />
                Back to home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
              <Field label="Name" required>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="contact-input"
                  maxLength={80}
                />
              </Field>
              <Field label="Surname">
                <input
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="contact-input"
                  maxLength={80}
                />
              </Field>

              <Field label="Email" required>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="contact-input"
                  maxLength={200}
                />
              </Field>
              <Field label="Cell number">
                <input
                  type="tel"
                  value={cell}
                  onChange={(e) => setCell(e.target.value)}
                  className="contact-input"
                  maxLength={40}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label="School">
                  <input
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    className="contact-input"
                    maxLength={200}
                  />
                </Field>
              </div>

              <Field label="Who are you?">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="contact-input"
                >
                  <option value="">Select…</option>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="How can we help?">
                <select
                  value={help}
                  onChange={(e) => setHelp(e.target.value)}
                  className="contact-input"
                >
                  <option value="">Select…</option>
                  {HELP.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="sm:col-span-2">
                <Field label="Your message" required>
                  <textarea
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                    className="contact-input resize-y"
                    maxLength={4000}
                    placeholder="Tell us what you need…"
                  />
                </Field>
              </div>

              {error && (
                <p className="border-l-2 border-rose-500 pl-4 font-serif text-base text-rose-700 sm:col-span-2">
                  {error}
                </p>
              )}

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 bg-ink px-7 py-4 font-sans text-xs font-bold uppercase tracking-[0.22em] text-paper transition-colors hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Submit"}
                  <Send size={13} />
                </button>
                <p className="mt-4 font-sans text-[10px] uppercase tracking-[0.18em] text-ink/45">
                  We&apos;ll only use your details to reply. POPIA compliant.
                </p>
              </div>
            </form>
          )}
        </div>
      </section>

      <style jsx global>{`
        .contact-input {
          width: 100%;
          background: transparent;
          border: 0;
          border-bottom: 2px solid color-mix(in srgb, var(--ink) 25%, transparent);
          padding: 10px 2px;
          font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
          font-size: 17px;
          color: var(--ink);
          outline: none;
          transition: border-color 160ms ease;
        }
        .contact-input:focus {
          border-bottom-color: #ea580c;
        }
        .contact-input::placeholder {
          color: color-mix(in srgb, var(--ink) 35%, transparent);
          font-style: italic;
        }
        select.contact-input {
          appearance: none;
          background-image: linear-gradient(45deg, transparent 50%, currentColor 50%),
            linear-gradient(135deg, currentColor 50%, transparent 50%);
          background-position: calc(100% - 14px) 18px, calc(100% - 8px) 18px;
          background-size: 6px 6px, 6px 6px;
          background-repeat: no-repeat;
          padding-right: 28px;
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-ink/55">
        {label}
        {required && <span className="ml-1 text-orange-600">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
