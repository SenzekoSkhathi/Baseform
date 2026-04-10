"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type NotificationItem = {
  id: string;
};

const READ_KEY = "baseform.notifications.read";

function getReadIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function TopRightActions() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);

  const pathname = usePathname();
  const showActions = pathname === "/dashboard" || pathname === "/profile";

  useEffect(() => {
    setReadIds(getReadIds());
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setNotifications([]));

    // Clear badge immediately when the notifications page marks everything read
    const handleRead = () => setReadIds(getReadIds());
    window.addEventListener("notifications:read", handleRead);
    return () => window.removeEventListener("notifications:read", handleRead);
  }, []);

  const unreadCount = useMemo(() => {
    const read = new Set(readIds);
    return notifications.filter((n) => !read.has(n.id)).length;
  }, [notifications, readIds]);

  if (!showActions) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex items-center gap-2 md:right-6 md:top-5">
      <Link
        href="/notifications"
        className="pointer-events-auto relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white/95 text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-gray-50"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>

      <Link
        href="/settings"
        className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white/95 text-gray-600 shadow-sm backdrop-blur transition-colors hover:bg-gray-50"
        aria-label="Settings"
      >
        <Settings size={18} />
      </Link>
    </div>
  );
}
