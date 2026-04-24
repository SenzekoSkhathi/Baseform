"use client";

import { useState } from "react";

type Props = {
  onToast: (type: "success" | "error", message: string) => void;
};

type GrantResult = {
  ok: true;
  user: { id: string; email: string | null; full_name: string | null };
  newBalance: number;
};

export function CreditGrantSection({ onToast }: Props) {
  const [email, setEmail] = useState("");
  const [credits, setCredits] = useState("100");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastGrant, setLastGrant] = useState<GrantResult | null>(null);

  async function handleSubmit() {
    const parsed = Number(credits);
    if (!email.trim()) return onToast("error", "Email is required.");
    if (!Number.isFinite(parsed) || parsed === 0) return onToast("error", "Enter a non-zero credit amount.");

    setSaving(true);
    try {
      const res = await fetch("/api/admin/users/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), credits: parsed, note: note.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Grant failed");

      const action = parsed > 0 ? "added" : "removed";
      onToast(
        "success",
        `${Math.abs(parsed)} credits ${action}. ${json.user.email ?? "User"} now has ${json.newBalance}.`,
      );
      setLastGrant(json as GrantResult);
      setNote("");
    } catch (error) {
      onToast("error", error instanceof Error ? error.message : "Grant failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-sm">
      <h2 className="text-lg font-black text-gray-900">Manual Credit Grants</h2>
      <p className="mt-1 text-xs text-gray-500">
        Add or remove Base Credits on a user&apos;s account. Useful for test accounts and one-off support requests.
        Positive numbers grant credits, negative numbers deduct. No 300-credit cap is enforced here.
      </p>

      <div className="mt-4 grid gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-[1fr_140px_1fr_140px]">
        <input
          type="email"
          placeholder="User email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400"
        />
        <input
          type="number"
          step="1"
          placeholder="Credits (+/-)"
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400"
        />
        <input
          type="text"
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !email.trim() || !credits.trim()}
          className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-orange-600"
        >
          {saving ? "Applying…" : "Apply grant"}
        </button>
      </div>

      {lastGrant && (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Last grant applied to <span className="font-semibold">{lastGrant.user.email ?? lastGrant.user.id}</span>
          {lastGrant.user.full_name ? ` (${lastGrant.user.full_name})` : ""} — new balance:{" "}
          <span className="font-black">{lastGrant.newBalance}</span> credits.
        </div>
      )}

      <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] text-amber-800">
        <p className="font-semibold">Notes</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>If the user has no credits row yet, one is created with a 3-month term.</li>
          <li>Grants are logged to <code>credit_transactions</code> with action <code>admin_grant</code>.</li>
          <li>Deductions here do not affect the vault — only real usage does.</li>
        </ul>
      </div>
    </section>
  );
}
