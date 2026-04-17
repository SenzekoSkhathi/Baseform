"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Settings } from "lucide-react";
import { useEffect, useState } from "react";

export default function TopRightActions() {
  const [unreadCount, setUnreadCount] = useState(0);

  const pathname = usePathname();
  const showActions = pathname === "/dashboard" || pathname === "/profile";

  useEffect(() => {
    const load = () =>
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((data) => setUnreadCount(typeof data?.unreadCount === "number" ? data.unreadCount : 0))
        .catch(() => setUnreadCount(0));

    void load();

    // Clear badge immediately when the notifications page marks everything read
    const handleRead = () => setUnreadCount(0);
    window.addEventListener("notifications:read", handleRead);
    return () => window.removeEventListener("notifications:read", handleRead);
  }, []);

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
