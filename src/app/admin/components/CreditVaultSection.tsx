"use client";

import { useEffect, useMemo, useState } from "react";

type VaultDeposit = {
  id: string;
  credits_added: number;
  tokens_purchased: number | null;
  zar_cost: number | null;
  zar_per_1k_tokens: number | null;
  avg_tokens_per_credit: number | null;
  note: string | null;
  created_at: string;
};

type VaultResponse = {
  remaining: number;
  totalDeposited: number;
  totalUsed: number;
  deposits: VaultDeposit[];
};

type Props = {
  onToast: (type: "success" | "error", message: string) => void;
};

// Haiku 4.5 blended at 70% input / 30% output:
//   0.7 × $1/M + 0.3 × $5/M = $2.20/M = $0.0022/1k
// At ~R19/USD that lands at ≈ R0.042/1k tokens. We round up to 0.05 to leave
// a little headroom for FX drift and occasional higher-output calls.
const DEFAULT_ZAR_PER_1K_TOKENS = 0.05;

// Weighted across Baseform's real action mix:
//   nudge ~800 tok/credit, gmail agent ~450 tok/credit, motivation letter ~600 tok/credit.
// 800 is a safe blended default that slightly overestimates token cost per credit.
const DEFAULT_TOKENS_PER_CREDIT = 800;

function formatNumber(value: number): string {
  return value.toLocaleString("en-ZA");
}

function formatZar(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `R ${value.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CreditVaultSection({ onToast }: Props) {
  const [vault, setVault] = useState<VaultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Conversion inputs
  const [zarPer1kTokens, setZarPer1kTokens] = useState<string>(String(DEFAULT_ZAR_PER_1K_TOKENS));
  const [tokensPerCredit, setTokensPerCredit] = useState<string>(String(DEFAULT_TOKENS_PER_CREDIT));
  const [mode, setMode] = useState<"zar" | "tokens">("zar");
  const [zarInput, setZarInput] = useState<string>("");
  const [tokensInput, setTokensInput] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const rate = Number(zarPer1kTokens);
  const perCredit = Number(tokensPerCredit);

  const { tokens, credits, zarCost } = useMemo(() => {
    if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(perCredit) || perCredit <= 0) {
      return { tokens: 0, credits: 0, zarCost: 0 };
    }

    if (mode === "zar") {
      const z = Number(zarInput);
      if (!Number.isFinite(z) || z <= 0) return { tokens: 0, credits: 0, zarCost: 0 };
      const computedTokens = (z / rate) * 1000;
      return {
        tokens: Math.floor(computedTokens),
        credits: Math.floor(computedTokens / perCredit),
        zarCost: z,
      };
    }

    const t = Number(tokensInput);
    if (!Number.isFinite(t) || t <= 0) return { tokens: 0, credits: 0, zarCost: 0 };
    return {
      tokens: Math.floor(t),
      credits: Math.floor(t / perCredit),
      zarCost: (t / 1000) * rate,
    };
  }, [mode, zarInput, tokensInput, rate, perCredit]);

  async function loadVault() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/credit-vault");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load vault");
      setVault(json as VaultResponse);
    } catch (error) {
      onToast("error", error instanceof Error ? error.message : "Could not load vault");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadVault();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDeposit() {
    if (credits <= 0) {
      onToast("error", "Enter a ZAR amount or token count first.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/credit-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credits_added: credits,
          tokens_purchased: tokens || null,
          zar_cost: zarCost > 0 ? Number(zarCost.toFixed(2)) : null,
          zar_per_1k_tokens: rate,
          avg_tokens_per_credit: perCredit,
          note: note.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Deposit failed");
      onToast("success", `Added ${formatNumber(credits)} credits to the vault.`);
      setZarInput("");
      setTokensInput("");
      setNote("");
      await loadVault();
    } catch (error) {
      onToast("error", error instanceof Error ? error.message : "Deposit failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-gray-100 bg-white/95 p-5 shadow-sm">
      <h2 className="text-lg font-black text-gray-900">Credit Vault</h2>
      <p className="mt-1 text-xs text-gray-500">
        Convert purchased AI tokens to Base Credits and track how many are left. The vault decreases automatically as users
        spend credits (tokens burned by the AI provider).
      </p>

      {/* Balance cards */}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-medium text-emerald-700">Remaining in vault</p>
          <p className="mt-1 text-2xl font-black text-emerald-900">
            {loading ? "…" : formatNumber(vault?.remaining ?? 0)}
          </p>
          <p className="mt-0.5 text-[11px] text-emerald-700">Base Credits available to users</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Total deposited</p>
          <p className="mt-1 text-2xl font-black text-gray-900">
            {loading ? "…" : formatNumber(vault?.totalDeposited ?? 0)}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Total used</p>
          <p className="mt-1 text-2xl font-black text-gray-900">
            {loading ? "…" : formatNumber(vault?.totalUsed ?? 0)}
          </p>
        </div>
      </div>

      {/* Converter */}
      <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <p className="text-sm font-bold text-gray-900">Token → Base Credit converter</p>
        <p className="mt-0.5 text-[11px] text-gray-500">
          Enter what you bought — in rands or tokens — and add the resulting credits to the vault.
        </p>
        <p className="mt-1 text-[11px] text-gray-500">
          Defaults assume <span className="font-semibold">Haiku 4.5</span> at a 70% input / 30% output mix
          (≈ $2.20 per million tokens) and a blended ~800 tokens per Base Credit across nudges, Gmail
          agent runs, and motivation letters. Override if pricing or your action mix shifts.
        </p>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-medium text-gray-600">ZAR per 1,000 tokens</span>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={zarPer1kTokens}
              onChange={(e) => setZarPer1kTokens(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-gray-600">Avg tokens per Base Credit</span>
            <input
              type="number"
              step="1"
              min="1"
              value={tokensPerCredit}
              onChange={(e) => setTokensPerCredit(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900"
            />
          </label>
        </div>

        <div className="mt-3 flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setMode("zar")}
            className={[
              "rounded-lg border px-3 py-1.5 font-semibold transition-colors",
              mode === "zar"
                ? "border-orange-200 bg-orange-500 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
            ].join(" ")}
          >
            By ZAR spent
          </button>
          <button
            type="button"
            onClick={() => setMode("tokens")}
            className={[
              "rounded-lg border px-3 py-1.5 font-semibold transition-colors",
              mode === "tokens"
                ? "border-orange-200 bg-orange-500 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
            ].join(" ")}
          >
            By token count
          </button>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {mode === "zar" ? (
            <label className="block">
              <span className="text-[11px] font-medium text-gray-600">ZAR spent on tokens</span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 100"
                value={zarInput}
                onChange={(e) => setZarInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900"
              />
            </label>
          ) : (
            <label className="block">
              <span className="text-[11px] font-medium text-gray-600">Tokens purchased</span>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="e.g. 1000000"
                value={tokensInput}
                onChange={(e) => setTokensInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900"
              />
            </label>
          )}
          <label className="block">
            <span className="text-[11px] font-medium text-gray-600">Note (optional)</span>
            <input
              type="text"
              placeholder="e.g. OpenAI top-up 24 Apr"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900"
            />
          </label>
        </div>

        <div className="mt-3 grid gap-2 rounded-xl border border-gray-200 bg-white p-3 md:grid-cols-3">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Tokens</p>
            <p className="mt-0.5 text-sm font-bold text-gray-900">{formatNumber(tokens)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-500">ZAR value</p>
            <p className="mt-0.5 text-sm font-bold text-gray-900">{formatZar(zarCost)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-gray-500">Base Credits</p>
            <p className="mt-0.5 text-sm font-black text-emerald-700">{formatNumber(credits)}</p>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleDeposit}
            disabled={saving || credits <= 0}
            className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-orange-600"
          >
            {saving ? "Adding…" : `Add ${formatNumber(credits)} credits to vault`}
          </button>
        </div>
      </div>

      {/* Recent deposits */}
      <div className="mt-5">
        <p className="text-sm font-bold text-gray-900">Recent deposits</p>
        {loading ? (
          <p className="mt-2 text-xs text-gray-500">Loading…</p>
        ) : !vault?.deposits.length ? (
          <p className="mt-2 text-xs text-gray-500">No deposits yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Credits</th>
                  <th className="py-2 pr-3 font-medium">Tokens</th>
                  <th className="py-2 pr-3 font-medium">Cost</th>
                  <th className="py-2 pr-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {vault.deposits.map((d) => (
                  <tr key={d.id} className="border-b border-gray-100 text-gray-700">
                    <td className="py-2 pr-3 text-[11px] text-gray-500">{formatDate(d.created_at)}</td>
                    <td className="py-2 pr-3 font-semibold text-emerald-700">+{formatNumber(d.credits_added)}</td>
                    <td className="py-2 pr-3">{d.tokens_purchased != null ? formatNumber(d.tokens_purchased) : "—"}</td>
                    <td className="py-2 pr-3">{formatZar(d.zar_cost)}</td>
                    <td className="py-2 pr-3 text-gray-600">{d.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
