"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor, Check } from "lucide-react";

type Theme = "light" | "system";
const STORAGE_KEY = "bf_theme";

const THEMES: { value: Theme; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: "light",
    label: "Light",
    description: "Clean white interface — easy on the eyes in bright environments.",
    icon: Sun,
  },
  {
    value: "system",
    label: "System",
    description: "Follows your device's current appearance setting.",
    icon: Monitor,
  },
];

export default function AppearancePage() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored === "light" || stored === "system") setTheme(stored);
    } catch { /* ignore */ }
  }, []);

  function selectTheme(t: Theme) {
    setTheme(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch { /* ignore */ }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-black text-gray-900">Appearance</h1>
        <p className="mt-0.5 text-sm text-gray-500">Customise how Baseform looks on your device.</p>
      </div>

      {/* Theme */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">Theme</h2>
        <p className="mt-0.5 text-xs text-gray-400">Choose your preferred colour theme.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {THEMES.map(({ value, label, description, icon: Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => selectTheme(value)}
                className={[
                  "relative flex items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                  active
                    ? "border-orange-300 bg-orange-50 ring-1 ring-orange-300"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
                ].join(" ")}
              >
                <span className={[
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  active ? "bg-orange-100" : "bg-gray-100",
                ].join(" ")}>
                  <Icon size={17} className={active ? "text-orange-500" : "text-gray-400"} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={["text-sm font-bold", active ? "text-orange-700" : "text-gray-800"].join(" ")}>
                    {label}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{description}</p>
                </div>
                {active && (
                  <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500">
                    <Check size={11} className="text-white" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}

          {/* Dark mode — coming soon */}
          <button
            type="button"
            disabled
            className="relative flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left opacity-70 cursor-not-allowed"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
              <Moon size={17} className="text-gray-400" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-gray-500">Dark</p>
                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500">
                  Soon
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">
                A dark interface optimised for low-light use.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Text size */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">Text size</h2>
        <p className="mt-0.5 text-xs text-gray-400 mb-4">Adjustable text sizing is coming in a future update.</p>
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3">
          <span className="text-2xl font-black text-gray-200">Aa</span>
          <div>
            <p className="text-xs font-semibold text-gray-400">Default size active</p>
            <p className="text-[11px] text-gray-400">Larger text options coming soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
