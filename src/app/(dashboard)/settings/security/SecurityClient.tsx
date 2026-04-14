"use client";

import { useEffect, useMemo, useState } from "react";

type SecurityResponse = {
  email: string;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  createdAt: string | null;
};

export default function SecurityClient() {
  const [security, setSecurity] = useState<SecurityResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/settings/security", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: SecurityResponse) => { if (active) setSecurity(data); })
      .catch(() => { if (active) setLoadError("Could not load security details."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  async function changePassword() {
    setError(null);
    setMessage(null);
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/settings/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change-password", password: newPassword }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!res.ok) { setError(body?.error ?? "Could not update password."); return; }
      setNewPassword("");
      setConfirmPassword("");
      setMessage(body?.message ?? "Password updated.");
    } catch {
      setError("Could not update password.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function resendVerification() {
    setError(null);
    setMessage(null);
    setIsResending(true);
    try {
      const res = await fetch("/api/settings/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend-verification" }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!res.ok) { setError(body?.error ?? "Could not resend verification email."); return; }
      setMessage(body?.message ?? "Verification email sent.");
    } catch {
      setError("Could not resend verification email.");
    } finally {
      setIsResending(false);
    }
  }

  const verificationLabel = useMemo(() => {
    if (!security?.emailConfirmedAt) return "Not verified";
    const d = new Date(security.emailConfirmedAt);
    return Number.isNaN(d.getTime()) ? "Verified" : `Verified on ${d.toLocaleDateString()}`;
  }, [security?.emailConfirmedAt]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-black text-gray-900">Security</h1>
        <p className="mt-0.5 text-sm text-gray-500">Manage your password and email verification.</p>
      </div>

      {isLoading && (
        <p className="px-1 text-sm text-gray-400">Loading security details…</p>
      )}

      {loadError && (
        <p className="px-1 text-xs font-semibold text-red-600">{loadError}</p>
      )}

      {!isLoading && security && (
        <>
          {/* Email / verification */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">Login email</h2>
            <p className="mt-3 text-sm font-semibold text-gray-800">{security.email || "No email"}</p>
            <p className={[
              "mt-1 text-xs font-semibold",
              security.emailConfirmedAt ? "text-green-700" : "text-amber-600",
            ].join(" ")}>
              {verificationLabel}
            </p>
            {!security.emailConfirmedAt && (
              <button
                type="button"
                onClick={resendVerification}
                disabled={isResending}
                className="mt-3 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {isResending ? "Sending…" : "Resend verification email"}
              </button>
            )}
          </div>

          {/* Change password */}
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">Change password</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">New password</p>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={INPUT}
                />
              </label>
              <label className="block">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Confirm password</p>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={INPUT}
                />
              </label>
            </div>

            {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
            {message && <p className="mt-3 text-xs font-semibold text-green-700">{message}</p>}

            <button
              type="button"
              onClick={changePassword}
              disabled={isChangingPassword}
              className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
            >
              {isChangingPassword ? "Updating…" : "Update password"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const INPUT =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-orange-500/30 placeholder:text-gray-400 focus:ring";
