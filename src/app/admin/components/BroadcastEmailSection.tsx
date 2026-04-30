"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  onToast: (type: "success" | "error", message: string) => void;
};

const TIERS = ["free", "essential", "pro", "admin"] as const;
type Tier = (typeof TIERS)[number];

type TierCounts = Record<Tier, number>;

// Same Baseform shell rendered server-side by wrapInStandardHtml. Kept in
// sync here so the iframe preview matches what recipients will receive.
function wrapPreview(subject: string, bodyHtml: string): string {
  const safeSubject = subject.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${safeSubject}</title></head>
  <body style="margin:0;padding:0;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f5;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
          <tr><td style="padding:24px 32px;border-bottom:1px solid #f1f1ef;"><span style="display:inline-block;font-weight:800;font-size:18px;color:#111827;letter-spacing:-0.01em;">Baseform</span></td></tr>
          <tr><td style="padding:32px;font-size:15px;line-height:1.65;color:#1f2937;">${bodyHtml}</td></tr>
          <tr><td style="padding:20px 32px;background:#fafaf9;border-top:1px solid #f1f1ef;font-size:12px;color:#6b7280;">You received this email because you have a Baseform account.<br/><a href="https://baseformapplications.com" style="color:#f97316;text-decoration:none;">baseformapplications.com</a></td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

export function BroadcastEmailSection({ onToast }: Props) {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState(
    `<p>Hi {{first_name}},</p>\n<p>Quick update from the Baseform team — …</p>\n<p><a href="https://baseformapplications.com">Open Baseform</a></p>`,
  );
  const [tierSelection, setTierSelection] = useState<Set<Tier>>(new Set<Tier>(["free"]));
  const [useStandardWrapper, setUseStandardWrapper] = useState(true);
  const [tierCounts, setTierCounts] = useState<TierCounts | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; failed: number; recipientCount: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingCounts(true);
    fetch("/api/admin/email/broadcast")
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.counts) setTierCounts(j.counts);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingCounts(false); });
    return () => { cancelled = true; };
  }, []);

  const recipientTotal = useMemo(() => {
    if (!tierCounts) return 0;
    let total = 0;
    for (const t of tierSelection) total += tierCounts[t] ?? 0;
    return total;
  }, [tierCounts, tierSelection]);

  const previewHtml = useMemo(
    () => useStandardWrapper ? wrapPreview(subject || "(no subject)", bodyHtml) : bodyHtml,
    [subject, bodyHtml, useStandardWrapper],
  );

  function toggleTier(t: Tier) {
    setTierSelection((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  }

  async function send(dryRun: boolean) {
    if (!subject.trim()) return onToast("error", "Subject is required.");
    if (!bodyHtml.trim()) return onToast("error", "Email body is required.");
    if (tierSelection.size === 0) return onToast("error", "Pick at least one recipient tier.");

    setSending(true);
    try {
      const res = await fetch("/api/admin/email/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          bodyHtml,
          tiers: [...tierSelection],
          useStandardWrapper,
          dryRun,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Send failed");

      if (dryRun) {
        onToast("success", `Dry run OK — would send to ${json.recipientCount} recipient(s). Sample: ${(json.sample ?? []).join(", ") || "(none)"}`);
      } else {
        setLastResult({ sent: json.sent, failed: json.failed, recipientCount: json.recipientCount });
        onToast("success", `Broadcast sent to ${json.sent} of ${json.recipientCount} recipient(s)${json.failed ? ` — ${json.failed} failed` : ""}.`);
      }
    } catch (err) {
      onToast("error", err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
      setConfirming(false);
    }
  }

  return (
    <section className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-sm">
      <h2 className="text-lg font-black text-gray-900">Broadcast Email</h2>
      <p className="mt-1 text-xs text-gray-500">
        Compose an email, choose which user tiers should receive it, and preview the rendered HTML before sending.
        Use <code>{"{{first_name}}"}</code> to personalise the greeting per recipient.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        {/* ── Compose column ───────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-gray-700">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's it about?"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* Body HTML */}
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-700">HTML body</label>
              <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
                <input
                  type="checkbox"
                  checked={useStandardWrapper}
                  onChange={(e) => setUseStandardWrapper(e.target.checked)}
                />
                Wrap in Baseform standard HTML shell
              </label>
            </div>
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={14}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs text-gray-900 placeholder:text-gray-400"
              spellCheck={false}
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Paste raw HTML or a fragment (paragraphs, links, images). With the wrapper on, it&apos;s placed inside a branded shell with header and footer.
            </p>
          </div>

          {/* Tier filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-700">Recipient tiers</label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TIERS.map((t) => {
                const count = tierCounts?.[t] ?? 0;
                const checked = tierSelection.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleTier(t)}
                    className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left transition ${
                      checked ? "border-orange-300 bg-orange-50" : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <span className="text-xs font-semibold capitalize text-gray-900">{t}</span>
                    <span className="text-[11px] text-gray-500">
                      {loadingCounts ? "…" : `${count.toLocaleString("en-ZA")} user${count === 1 ? "" : "s"}`}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-gray-700">
              Total recipients: <span className="font-bold text-gray-900">{recipientTotal.toLocaleString("en-ZA")}</span>
            </p>
          </div>

          {/* Send actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => send(true)}
              disabled={sending || recipientTotal === 0}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Dry run (no send)
            </button>
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={sending || recipientTotal === 0}
              className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              Send broadcast
            </button>
            {lastResult && (
              <span className="text-[11px] text-emerald-700">
                Last send: {lastResult.sent}/{lastResult.recipientCount} delivered
                {lastResult.failed > 0 ? `, ${lastResult.failed} failed` : ""}.
              </span>
            )}
          </div>
        </div>

        {/* ── Preview column ───────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-gray-700">Preview</label>
          <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 p-2">
            <div className="mb-2 rounded bg-white px-3 py-2 text-xs">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">Subject</p>
              <p className="font-semibold text-gray-900">{subject || "(no subject)"}</p>
            </div>
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={previewHtml}
              className="h-[600px] w-full rounded-lg border border-gray-200 bg-white"
            />
            <p className="mt-2 text-[11px] text-gray-500">
              The <code>{"{{first_name}}"}</code> token is replaced per recipient at send time. The preview shows it as-is.
            </p>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">Send to {recipientTotal.toLocaleString("en-ZA")} recipient{recipientTotal === 1 ? "" : "s"}?</h3>
            <p className="mt-2 text-xs text-gray-600">
              This will email <span className="font-semibold">{[...tierSelection].join(", ")}</span> users with the subject
              &ldquo;<span className="font-semibold">{subject}</span>&rdquo;. This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={sending}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => send(false)}
                disabled={sending}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {sending ? "Sending…" : "Yes, send now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
