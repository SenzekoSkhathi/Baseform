"use client";

import { useEffect, useMemo, useState } from "react";

type AccountSettings = {
  fullName: string;
  phone: string;
  province: string;
  fieldOfInterest: string;
};

const PROVINCES = [
  "Gauteng", "Western Cape", "Eastern Cape", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "North West", "Free State", "Northern Cape",
];

const DEFAULT_ACCOUNT: AccountSettings = {
  fullName: "", phone: "", province: "", fieldOfInterest: "",
};

type SettingsResponse = { account?: Partial<AccountSettings> };

export default function AccountClient() {
  const [account, setAccount] = useState<AccountSettings>(DEFAULT_ACCOUNT);
  const [loaded, setLoaded] = useState<AccountSettings>(DEFAULT_ACCOUNT);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: SettingsResponse) => {
        if (!active) return;
        const merged = { ...DEFAULT_ACCOUNT, ...data.account };
        setAccount(merged);
        setLoaded(merged);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  function update<K extends keyof AccountSettings>(key: K, value: AccountSettings[K]) {
    setAccount((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not save account settings.");
        return;
      }
      const data = (await res.json()) as { account?: Partial<AccountSettings> };
      const next = { ...DEFAULT_ACCOUNT, ...data.account };
      setAccount(next);
      setLoaded(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1400);
    } catch {
      setError("Could not save account settings.");
    } finally {
      setIsSaving(false);
    }
  }

  const hasChanges = useMemo(
    () =>
      account.fullName !== loaded.fullName ||
      account.phone !== loaded.phone ||
      account.province !== loaded.province ||
      account.fieldOfInterest !== loaded.fieldOfInterest,
    [account, loaded],
  );

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h1 className="text-lg font-black text-gray-900">Account</h1>
      <p className="mt-0.5 text-sm text-gray-500">Keep your profile details up to date.</p>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input
              value={account.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              placeholder="Your full name"
              className={INPUT}
            />
          </Field>

          <Field label="Phone number">
            <input
              value={account.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="e.g. 082 000 0000"
              className={INPUT}
            />
          </Field>

          <Field label="Province">
            <select
              value={account.province}
              onChange={(e) => update("province", e.target.value)}
              className={INPUT}
            >
              <option value="">Select province</option>
              {PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>

          <Field label="Field of interest">
            <input
              value={account.fieldOfInterest}
              onChange={(e) => update("fieldOfInterest", e.target.value)}
              placeholder="e.g. Engineering & Technology"
              className={INPUT}
            />
          </Field>
        </div>
      )}

      {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
      {saved && <p className="mt-3 text-xs font-semibold text-green-600">Saved successfully</p>}

      {!isLoading && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!hasChanges || isSaving}
            className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => { setAccount(loaded); setError(null); }}
            disabled={!hasChanges || isSaving}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

const INPUT =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none ring-orange-500/30 placeholder:text-gray-400 focus:ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      {children}
    </label>
  );
}
