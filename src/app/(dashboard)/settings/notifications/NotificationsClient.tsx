"use client";

import { useEffect, useState } from "react";

type Prefs = {
  deadlineAlerts: boolean;
  statusUpdates: boolean;
  weeklySummary: boolean;
};

const SETTINGS_KEY = "baseform.settings";

const DEFAULT_PREFS: Prefs = {
  deadlineAlerts: true,
  statusUpdates: true,
  weeklySummary: false,
};

type SettingsResponse = { preferences?: Partial<Prefs> };

const TOGGLES: { key: keyof Prefs; title: string; description: string }[] = [
  {
    key: "deadlineAlerts",
    title: "Deadline alerts",
    description: "Get reminders before application deadlines.",
  },
  {
    key: "statusUpdates",
    title: "Status updates",
    description: "Get notified when an application status changes.",
  },
  {
    key: "weeklySummary",
    title: "Weekly summary",
    description: "Receive a compact summary of your progress each week.",
  },
];

export default function NotificationsClient() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // Hydrate from localStorage immediately for instant UI
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch { /* ignore */ }

    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: SettingsResponse) => {
        if (!active) return;
        const merged = { ...DEFAULT_PREFS, ...data.preferences };
        setPrefs(merged);
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      })
      .catch(() => undefined)
      .finally(() => { if (active) setIsLoading(false); });

    return () => { active = false; };
  }, []);

  async function toggle(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    setSaved(false);
    setIsSyncing(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: next }),
      });
      if (!res.ok) {
        setError("Could not sync notification settings.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch {
      setError("Could not sync notification settings.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h1 className="text-lg font-black text-gray-900">Notifications</h1>
      <p className="mt-0.5 text-sm text-gray-500">Choose when Baseform sends you updates.</p>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-400">Loading…</p>
      ) : (
        <ul className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white overflow-hidden">
          {TOGGLES.map(({ key, title, description }) => (
            <li key={key}>
              <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs[key]}
                  onChange={() => toggle(key)}
                  disabled={isSyncing}
                  className="h-4 w-4 shrink-0 rounded border-gray-300 accent-orange-500 disabled:opacity-50 cursor-pointer"
                />
              </label>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-3 text-xs font-semibold text-red-600">{error}</p>}
      {saved && <p className="mt-3 text-xs font-semibold text-green-600">Saved</p>}
      {isSyncing && <p className="mt-3 text-xs text-gray-400">Syncing…</p>}
    </div>
  );
}
