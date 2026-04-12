"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Prefs = {
  deadlineAlerts: boolean;
  statusUpdates: boolean;
  weeklySummary: boolean;
};

type AccountSettings = {
  fullName: string;
  phone: string;
  province: string;
  fieldOfInterest: string;
};

const SETTINGS_KEY = "baseform.settings";

const PROVINCES = [
  "Gauteng",
  "Western Cape",
  "Eastern Cape",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Free State",
  "Northern Cape",
];

const DEFAULT_PREFS: Prefs = {
  deadlineAlerts: true,
  statusUpdates: true,
  weeklySummary: false,
};

const DEFAULT_ACCOUNT: AccountSettings = {
  fullName: "",
  phone: "",
  province: "",
  fieldOfInterest: "",
};

type SettingsResponse = {
  preferences?: Partial<Prefs>;
  account?: Partial<AccountSettings>;
};

type SecurityResponse = {
  email: string;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  createdAt: string | null;
};

export default function SettingsClient() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [account, setAccount] = useState<AccountSettings>(DEFAULT_ACCOUNT);
  const [loadedAccount, setLoadedAccount] = useState<AccountSettings>(DEFAULT_ACCOUNT);
  const [saved, setSaved] = useState(false);
  const [isSyncingPrefs, setIsSyncingPrefs] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [security, setSecurity] = useState<SecurityResponse | null>(null);
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard");
  }

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      let localPrefs: Prefs = DEFAULT_PREFS;

      try {
        const raw = window.localStorage.getItem(SETTINGS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          localPrefs = { ...DEFAULT_PREFS, ...parsed };
        }
      } catch {
        localPrefs = DEFAULT_PREFS;
      }

      if (active) setPrefs(localPrefs);

      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as SettingsResponse;
        const mergedPrefs = { ...DEFAULT_PREFS, ...data.preferences };
        const mergedAccount = { ...DEFAULT_ACCOUNT, ...data.account };
        if (active) {
          setPrefs(mergedPrefs);
          setAccount(mergedAccount);
          setLoadedAccount(mergedAccount);
        }
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(mergedPrefs));
      } catch {
        // Keep local fallback when API sync is unavailable.
      }

      setIsLoadingSecurity(true);
      try {
        const res = await fetch("/api/settings/security", { cache: "no-store" });
        if (!res.ok) {
          setSecurityError("Could not load security details.");
          return;
        }
        const data = (await res.json()) as SecurityResponse;
        if (active) {
          setSecurity(data);
          setSecurityError(null);
        }
      } catch {
        if (active) setSecurityError("Could not load security details.");
      } finally {
        if (active) setIsLoadingSecurity(false);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  async function persistPrefs(next: Prefs) {
    setIsSyncingPrefs(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: next }),
      });

      if (!res.ok) {
        setSaveError("Could not sync notification settings.");
      } else {
        setSaveError(null);
      }
    } finally {
      setIsSyncingPrefs(false);
    }
  }

  async function saveAccount() {
    setIsSavingAccount(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setSaveError(body?.error ?? "Could not save account settings.");
        return;
      }

      const data = (await res.json()) as { account?: Partial<AccountSettings> };
      const next = { ...DEFAULT_ACCOUNT, ...data.account };
      setAccount(next);
      setLoadedAccount(next);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1400);
    } catch {
      setSaveError("Could not save account settings.");
    } finally {
      setIsSavingAccount(false);
    }
  }

  function updatePref(key: keyof Prefs) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      void persistPrefs(next);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1200);
      return next;
    });
  }

  function updateAccount<K extends keyof AccountSettings>(key: K, value: AccountSettings[K]) {
    setAccount((prev) => ({ ...prev, [key]: value }));
  }

  function resetAccountChanges() {
    setAccount(loadedAccount);
    setSaveError(null);
  }

  async function handleChangePassword() {
    setSecurityError(null);
    setSecurityMessage(null);

    if (newPassword.length < 8) {
      setSecurityError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityError("Passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/settings/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change-password", password: newPassword }),
      });

      const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!res.ok) {
        setSecurityError(body?.error ?? "Could not update password.");
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setSecurityMessage(body?.message ?? "Password updated.");
    } catch {
      setSecurityError("Could not update password.");
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleResendVerification() {
    setSecurityError(null);
    setSecurityMessage(null);
    setIsResendingVerification(true);

    try {
      const res = await fetch("/api/settings/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend-verification" }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;

      if (!res.ok) {
        setSecurityError(body?.error ?? "Could not resend verification email.");
        return;
      }

      setSecurityMessage(body?.message ?? "Verification email sent.");
    } catch {
      setSecurityError("Could not resend verification email.");
    } finally {
      setIsResendingVerification(false);
    }
  }

  const hasAccountChanges = useMemo(() => {
    return (
      account.fullName !== loadedAccount.fullName ||
      account.phone !== loadedAccount.phone ||
      account.province !== loadedAccount.province ||
      account.fieldOfInterest !== loadedAccount.fieldOfInterest
    );
  }, [account, loadedAccount]);

  const verificationLabel = useMemo(() => {
    if (!security?.emailConfirmedAt) return "Not verified";
    const date = new Date(security.emailConfirmedAt);
    if (Number.isNaN(date.getTime())) return "Verified";
    return `Verified on ${date.toLocaleDateString()}`;
  }, [security?.emailConfirmedAt]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fff9f2]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_10%_10%,rgba(251,146,60,0.16),transparent_62%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-10 pt-20 md:px-6">
        <div className="rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-sm">
          <button
            type="button"
            onClick={handleBack}
            className="mb-3 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your notifications and account details.</p>
          {saved && <p className="mt-2 text-xs font-semibold text-green-600">Saved</p>}
          {isSyncingPrefs && <p className="mt-1 text-xs text-gray-500">Syncing notification changes...</p>}
          {saveError && <p className="mt-1 text-xs font-semibold text-red-600">{saveError}</p>}
        </div>

        <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black text-gray-900">Notification settings</h2>
          <p className="mt-0.5 text-xs text-gray-500">Choose when Baseform sends you updates.</p>

          <div className="mt-3 space-y-3">
            <ToggleCard
              title="Deadline alerts"
              description="Get reminders before application deadlines."
              enabled={prefs.deadlineAlerts}
              onToggle={() => updatePref("deadlineAlerts")}
            />
            <ToggleCard
              title="Status updates"
              description="Get notified when an application status changes."
              enabled={prefs.statusUpdates}
              onToggle={() => updatePref("statusUpdates")}
            />
            <ToggleCard
              title="Weekly summary"
              description="Receive a compact summary of your progress each week."
              enabled={prefs.weeklySummary}
              onToggle={() => updatePref("weeklySummary")}
            />
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black text-gray-900">Account settings</h2>
          <p className="mt-0.5 text-xs text-gray-500">Keep your profile details up to date.</p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="Full name">
              <input
                value={account.fullName}
                onChange={(e) => updateAccount("fullName", e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-orange-500/30 placeholder:text-gray-400 focus:ring"
              />
            </Field>

            <Field label="Phone number">
              <input
                value={account.phone}
                onChange={(e) => updateAccount("phone", e.target.value)}
                placeholder="e.g. 082 000 0000"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-orange-500/30 placeholder:text-gray-400 focus:ring"
              />
            </Field>

            <Field label="Province">
              <select
                value={account.province}
                onChange={(e) => updateAccount("province", e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-orange-500/30 focus:ring"
              >
                <option value="">Select province</option>
                {PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Field of interest">
              <input
                value={account.fieldOfInterest}
                onChange={(e) => updateAccount("fieldOfInterest", e.target.value)}
                placeholder="e.g. Engineering & Technology"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-orange-500/30 placeholder:text-gray-400 focus:ring"
              />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!hasAccountChanges || isSavingAccount}
              onClick={saveAccount}
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
            >
              {isSavingAccount ? "Saving..." : "Save account settings"}
            </button>

            <button
              type="button"
              disabled={!hasAccountChanges || isSavingAccount}
              onClick={resetAccountChanges}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black text-gray-900">Security settings</h2>
          <p className="mt-0.5 text-xs text-gray-500">Manage password and email verification.</p>

          {isLoadingSecurity && <p className="mt-3 text-xs text-gray-500">Loading security details...</p>}

          {!isLoadingSecurity && security && (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Login email</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{security.email || "No email"}</p>
                <p className={`mt-1 text-xs font-semibold ${security.emailConfirmedAt ? "text-green-700" : "text-amber-700"}`}>
                  {verificationLabel}
                </p>
                {!security.emailConfirmedAt && (
                  <button
                    type="button"
                    disabled={isResendingVerification}
                    onClick={handleResendVerification}
                    className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                  >
                    {isResendingVerification ? "Sending..." : "Resend verification email"}
                  </button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="New password">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-orange-500/30 placeholder:text-gray-400 focus:ring"
                  />
                </Field>

                <Field label="Confirm new password">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-orange-500/30 placeholder:text-gray-400 focus:ring"
                  />
                </Field>
              </div>

              <button
                type="button"
                disabled={isChangingPassword}
                onClick={handleChangePassword}
                className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-500"
              >
                {isChangingPassword ? "Updating password..." : "Update password"}
              </button>
            </div>
          )}

          {securityMessage && <p className="mt-3 text-xs font-semibold text-green-700">{securityMessage}</p>}
          {securityError && <p className="mt-3 text-xs font-semibold text-red-600">{securityError}</p>}
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      {children}
    </label>
  );
}

function ToggleCard({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`relative h-7 w-12 rounded-full transition-colors ${enabled ? "bg-orange-500" : "bg-gray-300"}`}
          aria-label={`Toggle ${title}`}
        >
          <span
            className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </button>
      </div>
    </div>
  );
}