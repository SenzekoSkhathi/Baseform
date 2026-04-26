"use client";

import { useState } from "react";

type Props = {
  onToast: (type: "success" | "error", message: string) => void;
};

type ReconcileResult = {
  ok: true;
  user: { id: string; email: string | null; full_name: string | null };
  plan: string;
  term: number | null;
  amountZar: number;
  billingEventId: string;
  creditsInitialized: boolean;
  invoiceEmailSent: boolean;
  invoiceError?: string;
};

export function PaymentReconcileSection({ onToast }: Props) {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"essential" | "pro" | "ultra">("essential");
  const [term, setTerm] = useState<"3" | "6" | "9" | "">("3");
  const [pfPaymentId, setPfPaymentId] = useState("");
  const [mPaymentId, setMPaymentId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [last, setLast] = useState<ReconcileResult | null>(null);

  async function handleSubmit() {
    if (!email.trim()) return onToast("error", "User email is required.");
    if (!pfPaymentId.trim()) return onToast("error", "PayFast payment ID (pf_payment_id) is required.");
    if (plan === "essential" && !term) return onToast("error", "Essential needs a term.");

    setSaving(true);
    try {
      const res = await fetch("/api/admin/payments/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          plan,
          term: plan === "essential" && term ? Number(term) : null,
          pfPaymentId: pfPaymentId.trim(),
          mPaymentId: mPaymentId.trim() || null,
          amountZar: amount.trim() ? Number(amount) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Reconcile failed");
      setLast(json as ReconcileResult);
      onToast(
        "success",
        `Reconciled ${json.user.email ?? json.user.id} → ${json.plan}${json.term ? ` (${json.term}m)` : ""}. ` +
          `Invoice ${json.invoiceEmailSent ? "sent" : "not sent"}.`,
      );
    } catch (error) {
      onToast("error", error instanceof Error ? error.message : "Reconcile failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-sm">
      <h2 className="text-lg font-black text-gray-900">Reconcile PayFast Payment</h2>
      <p className="mt-1 text-xs text-gray-500">
        For when a PayFast payment cleared but the ITN webhook didn&apos;t upgrade the user.
        Idempotently sets the tier, initializes credits if missing, writes the billing event,
        and emails the invoice. Safe to re-run — uses <code>pfPaymentId</code> as the unique key.
      </p>

      <div className="mt-4 grid gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-3">
        <label className="space-y-1 text-xs text-gray-600 md:col-span-2">
          <span className="block font-semibold text-gray-700">User email</span>
          <input
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-900 placeholder:text-gray-400"
          />
        </label>
        <label className="space-y-1 text-xs text-gray-600">
          <span className="block font-semibold text-gray-700">Plan</span>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as "essential" | "pro" | "ultra")}
            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-900"
          >
            <option value="essential">Essential</option>
            <option value="pro">Pro</option>
            <option value="ultra">Ultra</option>
          </select>
        </label>
        <label className="space-y-1 text-xs text-gray-600">
          <span className="block font-semibold text-gray-700">Term (Essential only)</span>
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value as "3" | "6" | "9" | "")}
            disabled={plan !== "essential"}
            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
          >
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="9">9 months</option>
          </select>
        </label>
        <label className="space-y-1 text-xs text-gray-600">
          <span className="block font-semibold text-gray-700">pf_payment_id (from PayFast)</span>
          <input
            type="text"
            placeholder="296434783"
            value={pfPaymentId}
            onChange={(e) => setPfPaymentId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-900 placeholder:text-gray-400"
          />
        </label>
        <label className="space-y-1 text-xs text-gray-600">
          <span className="block font-semibold text-gray-700">m_payment_id (optional)</span>
          <input
            type="text"
            placeholder="userId:plan:term"
            value={mPaymentId}
            onChange={(e) => setMPaymentId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-900 placeholder:text-gray-400"
          />
        </label>
        <label className="space-y-1 text-xs text-gray-600">
          <span className="block font-semibold text-gray-700">Amount in ZAR (optional)</span>
          <input
            type="number"
            step="0.01"
            placeholder="defaults to plan price"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-900 placeholder:text-gray-400"
          />
        </label>
        <div className="md:col-span-3 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !email.trim() || !pfPaymentId.trim()}
            className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? "Reconciling…" : "Reconcile payment"}
          </button>
        </div>
      </div>

      {last && (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <p>
            <span className="font-semibold">{last.user.email ?? last.user.id}</span>{" "}
            now on <span className="font-semibold">{last.plan}</span>
            {last.term ? ` (${last.term} months)` : ""} for R{last.amountZar.toFixed(2)}.
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-700">
            Billing event: <code>{last.billingEventId}</code> · Credits initialized:{" "}
            {last.creditsInitialized ? "yes" : "no (already had row)"} · Invoice email:{" "}
            {last.invoiceEmailSent ? "sent" : `failed${last.invoiceError ? ` — ${last.invoiceError}` : ""}`}
          </p>
        </div>
      )}

      <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] text-amber-800">
        <p className="font-semibold">If this is happening to multiple users, check:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li><code>NEXT_PUBLIC_APP_URL</code> env var must point to the production HTTPS domain — PayFast can&apos;t reach localhost or HTTP.</li>
          <li>PayFast dashboard → Settings → ITN — confirm the URL is <code>https://&lt;domain&gt;/api/payments/payfast/notify</code>.</li>
          <li>PayFast dashboard → ITN logs — look for delivery failures and click <em>Resend</em> to retry the original webhook.</li>
          <li><code>PAYFAST_PASSPHRASE</code> must match exactly between the merchant settings and the env var, otherwise signature validation fails silently.</li>
        </ul>
      </div>
    </section>
  );
}
