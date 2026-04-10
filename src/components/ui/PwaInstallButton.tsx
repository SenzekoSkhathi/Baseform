"use client";

import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true;
}

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsDismissed(false);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setIsDismissed(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const shouldShow = useMemo(() => {
    if (isInstalled) return false;
    if (isDismissed) return false;
    return true;
  }, [isDismissed, isInstalled]);

  async function handleInstall() {
    if (!deferredPrompt) {
      // beforeinstallprompt is not available yet on this browser/session.
      return;
    }

    setIsPrompting(true);

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "dismissed") {
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
    } finally {
      setIsPrompting(false);
    }
  }

  if (!shouldShow) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-70 flex justify-center px-4 sm:bottom-6">
      <button
        type="button"
        onClick={handleInstall}
        disabled={!deferredPrompt || isPrompting}
        className="pointer-events-auto inline-flex items-center rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(249,115,22,0.35)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
      >
        {isPrompting ? "Preparing install..." : "Install App"}
      </button>
    </div>
  );
}
