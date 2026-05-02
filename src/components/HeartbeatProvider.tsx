"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const HEARTBEAT_INTERVAL_MS = 60_000;

export function HeartbeatProvider() {
  const pathname = usePathname();
  const lastBeatRef = useRef<number>(0);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function beat(eventType: "page_view" | "heartbeat") {
      try {
        await fetch("/api/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_type: eventType, path: pathname }),
          keepalive: true,
        });
        if (!cancelled) lastBeatRef.current = Date.now();
      } catch {
        // Heartbeats are best-effort. Silently drop network errors.
      }
    }

    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname;
      void beat("page_view");
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void beat("heartbeat");
    }, HEARTBEAT_INTERVAL_MS);

    function onVisibility() {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastBeatRef.current > HEARTBEAT_INTERVAL_MS
      ) {
        void beat("heartbeat");
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname]);

  return null;
}
