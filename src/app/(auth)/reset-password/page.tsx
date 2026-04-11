"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import Logo from "@/components/ui/Logo";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash.
    // onAuthStateChange fires PASSWORD_RECOVERY once the client picks it up.
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
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

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setDone(true);

    await supabase.auth.signOut();
    setTimeout(() => router.push("/login"), 2000);
  }

  if (done) {
    return (
      <main className="min-h-screen w-full bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
            <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Password updated</h2>
          <p className="text-sm text-gray-500">Redirecting you to login…</p>
        </div>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="min-h-screen w-full bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8 text-center space-y-3">
          <h2 className="text-xl font-bold text-gray-900">Verifying your link…</h2>
          <p className="text-sm text-gray-500">
            This link may have expired.{" "}
            <Link href="/forgot-password" className="text-orange-500 font-medium">
              Request a new one
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <Logo variant="lockup" size="md" className="mb-8" />

        <div className="space-y-1 mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Set a new password</h2>
          <p className="text-gray-500 text-sm">Choose something strong and memorable.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">New password</label>
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
            <label className="text-sm font-medium text-gray-700">Confirm new password</label>
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
            disabled={loading}
            className="w-full bg-orange-500 text-white py-4 rounded-2xl font-semibold text-base mt-2 disabled:opacity-50 hover:bg-orange-600 transition-colors"
          >
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </main>
  );
}
