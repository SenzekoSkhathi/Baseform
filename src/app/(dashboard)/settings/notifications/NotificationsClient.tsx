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
        <ul className="mt-5 space-y-3">
          {TOGGLES.map(({ key, title, description }) => (
            <li key={key} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div>
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="mt-0.5 text-xs text-gray-500">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => toggle(key)}
                disabled={isSyncing}
                className={[
                  "relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60",
                  prefs[key] ? "bg-orange-500" : "bg-gray-300",
                ].join(" ")}
                aria-label={`Toggle ${title}`}
              >
                <span
                  className={[
                    "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform",
                    prefs[key] ? "translate-x-5" : "translate-x-0.5",
                  ].join(" ")}
                />
              </button>
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
