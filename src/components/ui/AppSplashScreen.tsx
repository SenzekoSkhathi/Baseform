"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SPLASH_SEEN_KEY = "bf_splash_seen";

export default function AppSplashScreen() {
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem(SPLASH_SEEN_KEY) === "1";
    if (seen) return;

    setVisible(true);

    const hideTimer = window.setTimeout(() => {
      setHiding(true);
      sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
    }, 850);

    const removeTimer = window.setTimeout(() => {
      setVisible(false);
    }, 1150);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-80 flex items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.2),transparent_48%),linear-gradient(180deg,#fff7ed_0%,#ffffff_100%)] transition-opacity duration-300 ${
        hiding ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-500 shadow-[0_18px_40px_rgba(249,115,22,0.35)]">
          <Image src="/icon.svg" alt="Baseform" width={42} height={42} priority />
        </div>
        <p className="text-sm font-semibold tracking-wide text-orange-700">Baseform</p>
      </div>
    </div>
  );
}
