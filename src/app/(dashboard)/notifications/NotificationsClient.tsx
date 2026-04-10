"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Zap, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

type NotificationItem = {
  id: string;
  type: "deadline" | "status" | "reminder" | "email_detected" | "milestone";
  title: string;
  message: string;
  timestamp: string;
  href: string;
};

const READ_KEY = "baseform.notifications.read";

function readIdsFromStorage(): string[] {
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveReadIds(ids: string[]) {
  window.localStorage.setItem(READ_KEY, JSON.stringify(ids));
}

export default function NotificationsClient() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/dashboard");
  }

  useEffect(() => {
    setReadIds(readIdsFromStorage());
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        const fetched: NotificationItem[] = Array.isArray(data) ? data : [];
        setItems(fetched);
        // Auto-mark all as read the moment the page is opened
        const allIds = fetched.map((i) => i.id);
        saveReadIds(allIds);
        setReadIds(allIds);
        // Tell the bell icon in the same tab to clear its badge immediately
        window.dispatchEvent(new CustomEvent("notifications:read"));
      })
      .finally(() => setLoading(false));
  }, []);

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
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-gray-900">Notifications</h1>
              <p className="mt-1 text-sm text-gray-500">Stay updated on deadlines and application changes.</p>
            </div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
              {items.length} total
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
              Loading notifications...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500">
              No notifications yet.
            </div>
          ) : (
            items.map((item) => {
              const wasUnread = !readIds.includes(item.id);
              const accent =
                item.type === "deadline"
                  ? "border-l-rose-400"
                  : item.type === "status"
                    ? "border-l-blue-400"
                    : item.type === "email_detected"
                      ? "border-l-emerald-400"
                      : item.type === "milestone"
                        ? "border-l-orange-400"
                        : "border-l-amber-400";

              const isMilestone = item.type === "milestone";

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`block rounded-2xl border border-l-4 ${accent} p-4 shadow-sm transition-colors hover:bg-gray-50 ${
                    isMilestone ? "border-orange-100 bg-orange-50/60" : "border-gray-100 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${isMilestone ? "text-orange-800" : "text-gray-900"}`}>
                        {item.title}
                      </p>
                      <p className={`mt-1 text-xs ${isMilestone ? "text-orange-700" : "text-gray-500"}`}>
                        {item.message}
                      </p>
                    </div>
                    {wasUnread && (
                      item.type === "email_detected"
                        ? <Zap size={14} className="shrink-0 text-emerald-500" />
                        : item.type === "milestone"
                          ? <Trophy size={14} className="shrink-0 text-orange-500" />
                          : <Bell size={14} className="shrink-0 text-orange-500" />
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
