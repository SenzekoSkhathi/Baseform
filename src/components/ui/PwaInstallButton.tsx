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

function isIosSafariBrowser() {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/crios|fxios|edgios|chrome/.test(userAgent);

  return isIos && isSafari;
}

export default function PwaInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [isPrompting, setIsPrompting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());
    setIsSafari(isIosSafariBrowser());

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
    if (isInstalled === null) return false;
    if (isInstalled) return false;
    if (isDismissed) return false;
    return true;
  }, [deferredPrompt, isDismissed, isInstalled]);

  async function handleInstall() {
    if (!deferredPrompt) {
      setIsInstructionsOpen(true);
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
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-70 flex justify-center px-4 sm:bottom-6">
        <button
          type="button"
          onClick={handleInstall}
          disabled={isPrompting}
          className="pointer-events-auto inline-flex items-center rounded-full bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(249,115,22,0.35)] transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
        >
          {isPrompting
            ? "Preparing install..."
            : deferredPrompt
              ? "Install App"
              : isSafari
                ? "Add to Home Screen"
                : "Install App"}
        </button>
      </div>

      {isInstructionsOpen && !deferredPrompt && (
        <div className="fixed inset-0 z-80 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-slate-900">Install Baseform</p>
                <p className="mt-1 text-xs text-slate-500">
                  {isSafari
                    ? "Safari does not support the native install prompt. Use the Share menu instead."
                    : "Your browser does not expose the native install prompt yet. Try again after a moment."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInstructionsOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
                aria-label="Close install instructions"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-700">
              {isSafari ? (
                <>
                  <div className="rounded-2xl bg-orange-50 p-3">
                    <p className="font-bold text-orange-700">On iPhone / iPad</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Tap the Share button in Safari, then choose Add to Home Screen.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="font-bold text-slate-900">On Mac Safari</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Use Safari’s File menu or address bar share options to add Baseform to your dock or home screen, if available.
                    </p>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl bg-slate-50 p-3">
                  <p className="font-bold text-slate-900">Chrome / Edge</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Wait a few seconds, then tap Install App when the browser makes it available.
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsInstructionsOpen(false)}
              className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
