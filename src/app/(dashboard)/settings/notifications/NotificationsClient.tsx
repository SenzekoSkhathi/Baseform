"use client";

import { useEffect, useState } from "react";
import PushNotificationManager from "@/components/PushNotificationManager";
import { Bell, BellOff, BellRing } from "lucide-react";

type Prefs = {
  deadlineAlerts: boolean;
  statusUpdates: boolean;
  weeklySummary: boolean;
};

// Per-user namespacing — a shared device must never let one user see another's
// notification preferences (or, worse, save toggles to the wrong account).
const SETTINGS_KEY_PREFIX = "baseform.settings:";
const LEGACY_SETTINGS_KEY = "baseform.settings";

function settingsKeyFor(userId: string): string {
  return `${SETTINGS_KEY_PREFIX}${userId}`;
}

function purgeForeignSettingsCaches(currentUserId: string): void {
  try {
    localStorage.removeItem(LEGACY_SETTINGS_KEY);
    const myKey = settingsKeyFor(currentUserId);
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(SETTINGS_KEY_PREFIX) && k !== myKey) toRemove.push(k);
    }
    for (const k of toRemove) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

const DEFAULT_PREFS: Prefs = {
  deadlineAlerts: true,
  statusUpdates: true,
  weeklySummary: false,
};

type SettingsResponse = { preferences?: Partial<Prefs> };

const TOGGLES_GRADE12: { key: keyof Prefs; title: string; description: string }[] = [
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

const TOGGLES_GRADE11: { key: keyof Prefs; title: string; description: string }[] = [
  {
    key: "deadlineAlerts",
    title: "Deadline alerts",
    description: "Get reminders before bursary and programme closing dates.",
  },
  {
    key: "statusUpdates",
    title: "Planning updates",
    description: "Get notified when a target programme updates its requirements or APS minimum.",
  },
  {
    key: "weeklySummary",
    title: "Weekly summary",
    description: "Receive a compact summary of your planning progress each week.",
  },
];

export default function NotificationsClient({ gradeYear, userId }: { gradeYear: string | null; userId: string }) {
  const TOGGLES = gradeYear === "Grade 11" ? TOGGLES_GRADE11 : TOGGLES_GRADE12;
  const settingsKey = settingsKeyFor(userId);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // Wipe any other user's cached prefs on this device first.
    purgeForeignSettingsCaches(userId);

    // Hydrate from per-user localStorage for instant UI
    try {
      const raw = window.localStorage.getItem(settingsKey);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch { /* ignore */ }

    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: SettingsResponse) => {
        if (!active) return;
        const merged = { ...DEFAULT_PREFS, ...data.preferences };
        setPrefs(merged);
        try {
          window.localStorage.setItem(settingsKey, JSON.stringify(merged));
        } catch { /* ignore */ }
      })
      .catch(() => undefined)
      .finally(() => { if (active) setIsLoading(false); });

    return () => { active = false; };
  }, [userId, settingsKey]);

  async function toggle(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      window.localStorage.setItem(settingsKey, JSON.stringify(next));
    } catch { /* ignore */ }
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
    <div className="space-y-4">

    {/* Push permission card */}
    <PushNotificationManager>
      {({ permission, isLoading, enable, disable }) => {
        if (permission === "unsupported") return null;

        return (
          <div className={[
            "rounded-2xl border p-5",
            permission === "granted" ? "border-green-100 bg-green-50/60" : "border-orange-100 bg-orange-50/40",
          ].join(" ")}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className={[
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  permission === "granted" ? "bg-green-100" : "bg-orange-100",
                ].join(" ")}>
                  {permission === "granted"
                    ? <BellRing size={17} className="text-green-600" />
                    : <Bell size={17} className="text-orange-500" />}
                </span>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {permission === "granted" ? "Push notifications on" : "Turn on push notifications"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {permission === "granted"
                      ? "You'll receive alerts on this device even when the app is closed."
                      : "Get deadline alerts and credit warnings directly on your screen, even when the app is closed."}
                  </p>
                  {permission === "denied" && (
                    <p className="mt-1 text-xs font-semibold text-red-500">
                      Notifications are blocked. Open your browser settings to allow them for this site.
                    </p>
                  )}
                </div>
              </div>

              {permission !== "denied" && (
                <button
                  type="button"
                  onClick={permission === "granted" ? disable : enable}
                  disabled={isLoading}
                  className={[
                    "shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-colors disabled:opacity-50",
                    permission === "granted"
                      ? "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      : "bg-orange-500 text-white hover:bg-orange-600",
                  ].join(" ")}
                >
                  {isLoading ? "…" : permission === "granted" ? (
                    <span className="flex items-center gap-1.5"><BellOff size={12} /> Turn off</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><Bell size={12} /> Enable</span>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      }}
    </PushNotificationManager>

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

    </div>
  );
}
