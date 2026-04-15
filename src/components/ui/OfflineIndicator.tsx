"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Set initial state — navigator.onLine can be false on first render
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!navigator.onLine) setIsOffline(true);

    const goOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
    };

    const goOnline = () => {
      setIsOffline(false);
      // Show "back online" briefly then clear
      setTimeout(() => setWasOffline(false), 3000);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline && !wasOffline) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2.5 rounded-2xl px-4 py-3 shadow-lg text-sm font-medium transition-all duration-300 ${
        isOffline
          ? "bg-gray-900 text-white"
          : "bg-emerald-500 text-white"
      }`}
    >
      {isOffline ? (
        <>
          <WifiOff size={15} className="shrink-0" />
          <span>You&apos;re offline — some features won&apos;t work</span>
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full bg-white animate-pulse shrink-0" />
          <span>Back online</span>
        </>
      )}
    </div>
  );
}
