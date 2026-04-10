"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";
import { hasAdminAccess } from "@/lib/admin/access";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data: signInData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      if (authError.message.toLowerCase().includes("email not confirmed")) {
        setError("Your email isn't confirmed yet. Check your inbox, or contact support.");
      } else if (authError.message.toLowerCase().includes("invalid login")) {
        setError("Incorrect email or password.");
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    const signedInUser = signInData.user;
    const { data: profile } = signedInUser?.id
      ? await supabase.from("profiles").select("tier").eq("id", signedInUser.id).maybeSingle()
      : { data: null };

    // Keep profiles.email in sync so deadline notifications can reach the student.
    if (signedInUser?.id && signedInUser.email) {
      void supabase
        .from("profiles")
        .update({ email: signedInUser.email })
        .eq("id", signedInUser.id);
    }

    router.push(
      hasAdminAccess({ email: signedInUser?.email ?? email, role: signedInUser?.user_metadata?.role, tier: profile?.tier })
        ? "/admin"
        : "/dashboard"
    );
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
                Welcome back. Let&apos;s finish what you started.
              </h1>
              <p className="mt-4 max-w-sm text-sm text-white/80">
                Continue building your university applications, track deadlines, and stay ahead with BaseBot support.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xs text-white/70">Applications</p>
                <p className="mt-1 text-lg font-semibold">All in one</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xs text-white/70">Assistant</p>
                <p className="mt-1 text-lg font-semibold">BaseBot AI</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="auth-enter-card w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
            <Logo variant="lockup" size="md" className="mb-8" />

            <div className="space-y-1 mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500 text-sm">Log in to your Baseform account.</p>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
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
                {loading ? "Logging in…" : "Log in"}
              </button>

              <p className="text-center text-sm text-gray-500">
                Don&apos;t have an account?{" "}
                <Link href="/onboarding" className="text-orange-500 font-medium">
                  Get started free
                </Link>
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
