"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fff9f2] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
          <AlertTriangle size={22} className="text-orange-500" />
        </div>
        <h2 className="text-lg font-black text-gray-900">Something went wrong</h2>
        <p className="mt-2 text-sm text-gray-500">
          We couldn&apos;t load your dashboard. This is usually a temporary issue.
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
