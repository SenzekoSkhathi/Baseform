"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";

export default function TrackerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fff9f2] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
          <AlertTriangle size={22} className="text-orange-500" />
        </div>
        <h2 className="text-lg font-black text-gray-900">Couldn&apos;t load your tracker</h2>
        <p className="mt-2 text-sm text-gray-500">
          There was a problem loading your progress data. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 w-full rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white hover:bg-orange-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
