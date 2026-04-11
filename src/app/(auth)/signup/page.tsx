"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Check } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import type { OnboardingData } from "@/app/onboarding/page";

type GuardianData = {
  name: string;
  phone: string;
  relationship: string;
  email: string;
  whatsapp: string;
};

const RELATIONSHIPS = ["Parent", "Guardian", "Grandparent", "Sibling", "Other"];

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              s < current
                ? "bg-orange-500 text-white"
                : s === current
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {s < current ? <Check size={13} /> : s}
          </div>
          {s < 2 && (
            <div
              className={`h-0.5 w-10 transition-colors ${
                s < current ? "bg-orange-500" : "bg-gray-100"
              }`}
            />
          )}
        </div>
      ))}
      <span className="ml-1 text-xs text-gray-400">Step {current} of 2</span>
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2
  const [guardian, setGuardian] = useState<GuardianData>({
    name: "",
    phone: "",
    relationship: "Parent",
    email: "",
    whatsapp: "",
  });
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Step 1: validate then advance ─────────────────────────────
  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setStep(2);
    window.scrollTo(0, 0);
  }

  // ── Step 2: create account + save everything ──────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const raw = localStorage.getItem("bf_onboarding");
    const onboarding: OnboardingData | null = raw ? JSON.parse(raw) : null;

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        profile: {
          full_name: [onboarding?.firstName, onboarding?.lastName].filter(Boolean).join(" "),
          phone: onboarding?.phone ?? null,
          school_name: onboarding?.schoolName ?? null,
          grade_year: onboarding?.gradeYear ? onboarding.gradeYear : null,
          province: onboarding?.province ?? null,
          financial_need: onboarding?.financialNeed === "yes" || onboarding?.financialNeed === "no"
            ? onboarding.financialNeed
            : null,
          field_of_interest: onboarding?.fieldOfInterest ?? null,
          guardian_name: guardian.name,
          guardian_phone: guardian.phone,
          guardian_relationship: guardian.relationship,
          guardian_email: guardian.email || null,
          guardian_whatsapp_number: whatsappSameAsPhone
            ? guardian.phone
            : guardian.whatsapp || null,
        },
        subjects: onboarding?.subjects ?? [],
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    // Account created — now sign in so session cookies are set
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError("Account created but sign-in failed. Please go to the login page.");
      setLoading(false);
      return;
    }

    localStorage.removeItem("bf_onboarding");
    router.push("/plans");
  }

  return (
    <main className="min-h-screen w-full bg-gray-50">
      <div className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:grid lg:grid-cols-2 lg:gap-10 lg:px-10 lg:py-10">
        <section className="auth-enter-panel hidden lg:flex rounded-3xl bg-linear-to-br from-gray-900 via-gray-800 to-orange-900 p-10 text-white shadow-xl">
          <div className="flex h-full flex-col justify-between">
            <div>
              <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                Baseform
              </p>
              <h1 className="mt-6 max-w-sm text-4xl font-bold leading-tight">
                Create your account and start applying smarter.
              </h1>
              <p className="mt-4 max-w-sm text-sm text-white/80">
                Build your profile once, get guided support from BaseBot, and stay on top of every university deadline.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xs text-white/70">Onboarding</p>
                <p className="mt-1 text-lg font-semibold">2-step flow</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xs text-white/70">Support</p>
                <p className="mt-1 text-lg font-semibold">Parent-ready</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="auth-enter-card w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <Logo variant="lockup" size="md" className="mb-8" />
            <StepDots current={step} />

            {/* ── Step 1: Account credentials ─────────────────────── */}
            {step === 1 && (
              <>
                <div className="space-y-1 mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
                  <p className="text-gray-500 text-sm">Free to start. No credit card needed.</p>
                </div>

                <form onSubmit={handleStep1} className="flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        minLength={8}
                        required
                        className="w-full border border-gray-200 rounded-xl px-4 py-3.5 pr-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Confirm password</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-orange-500 text-white py-4 rounded-2xl font-semibold text-base mt-2 hover:bg-orange-600 transition-colors"
                  >
                    Continue
                  </button>

                  <p className="text-center text-sm text-gray-500">
                    Already have an account?{" "}
                    <Link href="/login" className="text-orange-500 font-medium">
                      Log in
                    </Link>
                  </p>
                </form>
              </>
            )}

            {/* ── Step 2: Parent / Guardian ────────────────────────── */}
            {step === 2 && (
              <>
                <div className="space-y-1 mb-8">
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-gray-400 mb-1 block"
                  >
                    ← Back
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900">Parent / Guardian</h2>
                  <p className="text-gray-500 text-sm">
                    We&apos;ll keep them informed about your applications and deadlines.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Full name</label>
                    <input
                      type="text"
                      value={guardian.name}
                      onChange={(e) => setGuardian({ ...guardian, name: e.target.value })}
                      placeholder="e.g. Nomsa Dlamini"
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Relationship to you</label>
                    <select
                      value={guardian.relationship}
                      onChange={(e) => setGuardian({ ...guardian, relationship: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      {RELATIONSHIPS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Phone number</label>
                    <input
                      type="tel"
                      value={guardian.phone}
                      onChange={(e) => setGuardian({ ...guardian, phone: e.target.value })}
                      placeholder="e.g. 082 555 1234"
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">WhatsApp number</label>
                      <button
                        type="button"
                        onClick={() => {
                          setWhatsappSameAsPhone(!whatsappSameAsPhone);
                          if (!whatsappSameAsPhone) setGuardian({ ...guardian, whatsapp: "" });
                        }}
                        className="flex items-center gap-1.5 text-xs text-gray-500"
                      >
                        <div
                          className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${
                            whatsappSameAsPhone ? "bg-orange-500" : "bg-gray-200"
                          }`}
                        >
                          <div
                            className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${
                              whatsappSameAsPhone ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </div>
                        Same as phone
                      </button>
                    </div>
                    <input
                      type="tel"
                      value={whatsappSameAsPhone ? guardian.phone : guardian.whatsapp}
                      onChange={(e) => setGuardian({ ...guardian, whatsapp: e.target.value })}
                      placeholder="e.g. 082 555 1234"
                      disabled={whatsappSameAsPhone}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      Email address{" "}
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={guardian.email}
                      onChange={(e) => setGuardian({ ...guardian, email: e.target.value })}
                      placeholder="parent@example.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-orange-500 text-white py-4 rounded-2xl font-semibold text-base mt-2 disabled:opacity-50 hover:bg-orange-600 transition-colors"
                  >
                    {loading ? "Creating account…" : "Create account"}
                  </button>

                  <p className="text-center text-xs text-gray-400 leading-relaxed">
                    By creating an account you agree to our{" "}
                    <Link href="/terms" className="text-gray-500 underline underline-offset-2">Terms of Service</Link>
                    {" "}and{" "}
                    <Link href="/privacy" className="text-gray-500 underline underline-offset-2">Privacy Policy</Link>.
                  </p>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
