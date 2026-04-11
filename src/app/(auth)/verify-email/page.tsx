"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get("email") ?? "", [searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifyingLink, setVerifyingLink] = useState(true);

  async function triggerWelcomeEmail() {
    try {
      await fetch("/api/auth/verify-email/welcome", { method: "POST" });
    } catch (e) {
      console.error("[verify-email] Welcome trigger failed:", e);
    }
  }

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    const supabase = createClient();

    async function tryLinkVerification() {
      try {
        const url = new URL(window.location.href);
        const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
        const hashParams = new URLSearchParams(hash);

        const tokenHash = url.searchParams.get("token_hash") ?? hashParams.get("token_hash");
        const type = (url.searchParams.get("type") ?? hashParams.get("type")) as
          | "signup"
          | "recovery"
          | null;

        if (tokenHash && type === "signup") {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            type: "signup",
            token_hash: tokenHash,
          });
          if (verifyError) throw verifyError;
          await triggerWelcomeEmail();
          router.replace("/plans");
          return;
        }

        const codeParam = url.searchParams.get("code");
        if (codeParam) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(codeParam);
          if (exchangeError) throw exchangeError;
          await triggerWelcomeEmail();
          router.replace("/plans");
          return;
        }

        setVerifyingLink(false);
      } catch (e) {
        console.error("[verify-email] Link verification failed:", e);
        setVerifyingLink(false);
      }
    }

    void tryLinkVerification();
  }, [router]);

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!email.trim()) {
      setError("Please enter the email you signed up with.");
      return;
    }

    if (!code.trim()) {
      setError("Please enter the verification code.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "signup",
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    await triggerWelcomeEmail();
    router.push("/plans");
  }

  async function handleResendCode() {
    setError("");
    setInfo("");

    if (!email.trim()) {
      setError("Enter your email first so we can resend the code.");
      return;
    }

    setResending(true);
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
      },
    });

    if (resendError) {
      setError(resendError.message);
      setResending(false);
      return;
    }

    setInfo("Verification email sent. Check your inbox for the new code.");
    setResending(false);
  }

  if (verifyingLink) {
    return (
      <main className="min-h-screen w-full bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8 text-center space-y-3">
          <h2 className="text-xl font-bold text-gray-900">Verifying your email…</h2>
          <p className="text-sm text-gray-500">Please wait while we confirm your account.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <Logo variant="lockup" size="md" className="mb-8" />

        <div className="space-y-1 mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Verify your email</h2>
          <p className="text-gray-500 text-sm">Enter the code from the email we sent to complete signup.</p>
        </div>

        <form onSubmit={handleVerifyCode} className="flex flex-col gap-4">
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
            <label className="text-sm font-medium text-gray-700">Verification code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
          {info && <p className="text-sm text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-semibold text-base mt-2 disabled:opacity-50 hover:bg-orange-600 transition-colors"
          >
            {loading ? "Verifying…" : "Verify email"}
          </button>

          <button
            type="button"
            onClick={handleResendCode}
            disabled={resending}
            className="w-full border border-gray-200 text-gray-700 py-3.5 rounded-2xl font-semibold text-base disabled:opacity-50 hover:bg-gray-50 transition-colors"
          >
            {resending ? "Resending…" : "Resend code"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already verified? <Link href="/login" className="text-orange-500 font-medium">Go to login</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
