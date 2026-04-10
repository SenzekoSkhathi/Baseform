"use client";

import { useRouter } from "next/navigation";
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

export default function SettingsClient() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard");
  }

  useEffect(() => {
    let active = true;

    async function loadPrefs() {
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
        const data = (await res.json()) as { preferences?: Partial<Prefs> };
        const merged = { ...DEFAULT_PREFS, ...data.preferences };
        if (active) setPrefs(merged);
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
      } catch {
        // Keep local fallback when API sync is unavailable.
      }
    }

    loadPrefs();

    return () => {
      active = false;
    };
  }, []);

  async function persist(next: Prefs) {
    setIsSyncing(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: next }),
      });
    } finally {
      setIsSyncing(false);
    }
  }

  function update(key: keyof Prefs) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      void persist(next);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1200);
      return next;
    });
  }

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
          <p className="mt-1 text-sm text-gray-500">Control how BaseForm keeps you updated.</p>
          {saved && <p className="mt-2 text-xs font-semibold text-green-600">Saved</p>}
          {isSyncing && <p className="mt-1 text-xs text-gray-500">Syncing changes...</p>}
        </div>

        <div className="mt-4 space-y-3">
          <ToggleCard
            title="Deadline alerts"
            description="Get reminders before application deadlines."
            enabled={prefs.deadlineAlerts}
            onToggle={() => update("deadlineAlerts")}
          />
          <ToggleCard
            title="Status updates"
            description="Get notified when an application status changes."
            enabled={prefs.statusUpdates}
            onToggle={() => update("statusUpdates")}
          />
          <ToggleCard
            title="Weekly summary"
            description="Receive a compact summary of your progress each week."
            enabled={prefs.weeklySummary}
            onToggle={() => update("weeklySummary")}
          />
        </div>
      </div>
    </div>
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
