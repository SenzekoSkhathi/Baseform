"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

export function CancelSubscriptionButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/cancel-subscription", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Could not cancel subscription.");
        setSubmitting(false);
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
      >
        <XCircle size={14} />
        Cancel subscription
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-red-100 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-700">Cancel your Pro subscription?</p>
      <p className="mt-1 text-xs text-red-600">
        You&apos;ll keep Pro access until the end of your current billing period, then drop to Free.
      </p>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {submitting ? "Cancelling..." : "Yes, cancel"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
