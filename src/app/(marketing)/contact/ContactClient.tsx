"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import MarketingFooter from "@/components/marketing/MarketingFooter";

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

export default function ContactClient() {
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
    <>
      <MarketingHeader />

      <main className="relative min-h-screen">
        <section className="sec border-b border-[var(--line)]">
          <div className="wrap max-w-3xl">
            <span className="label">Contact</span>
            <h1 className="display mt-4 leading-[1.05]">
              Let us know what you need, and we&apos;ll{" "}
              <span className="accent">get back to you shortly.</span>
            </h1>
            <p className="lead mt-5 max-w-xl">
              Schools, NGOs, parents, learners — tell us what you&apos;re trying to do and we&apos;ll point
              you the right way.
            </p>
          </div>
        </section>

        <section className="sec" style={{ paddingTop: "clamp(48px, 6vw, 80px)" }}>
          <div className="wrap max-w-3xl">
            {done ? (
              <div className="border-t border-[var(--line)] pt-10 text-center">
                <span className="label">Message received</span>
                <h2 className="heading-lg mt-3">
                  Thank you. We&apos;ll be in touch.
                </h2>
                <p className="mt-4 text-lg text-[var(--ink-soft)]">
                  Most replies go out within 1–2 working days.
                </p>
                <Link
                  href="/"
                  className="mt-8 btn btn-dark"
                >
                  <ArrowLeft size={16} />
                  Back to home
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-6 sm:grid-cols-2">
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
                      rows={5}
                      className="contact-input resize-y"
                      maxLength={4000}
                      placeholder="Tell us what you need…"
                    />
                  </Field>
                </div>

                {error && (
                  <p className="border-l-2 border-red-500 pl-4 text-red-600 font-medium sm:col-span-2">
                    {error}
                  </p>
                )}

                <div className="sm:col-span-2 mt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-dark"
                  >
                    {submitting ? "Sending…" : "Submit"}
                    <Send size={16} />
                  </button>
                  <p className="mt-4 text-[0.7rem] uppercase tracking-widest font-bold text-[var(--ink-soft)]/60">
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
            border-bottom: 2px solid var(--line);
            padding: 12px 2px;
            font-size: 1.05rem;
            color: var(--ink);
            outline: none;
            border-radius: 0;
            transition: border-color 0.2s ease;
          }
          .contact-input:focus {
            border-bottom-color: var(--orange);
          }
          .contact-input::placeholder {
            color: var(--ink-soft);
            opacity: 0.5;
          }
          select.contact-input {
            appearance: none;
            background-image: linear-gradient(45deg, transparent 50%, currentColor 50%),
              linear-gradient(135deg, currentColor 50%, transparent 50%);
            background-position: calc(100% - 14px) 22px, calc(100% - 8px) 22px;
            background-size: 6px 6px, 6px 6px;
            background-repeat: no-repeat;
            padding-right: 28px;
          }
        `}</style>
      </main>

      <MarketingFooter />
    </>
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
      <span className="label">
        {label}
        {required && <span className="ml-1 text-[var(--orange)]">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
