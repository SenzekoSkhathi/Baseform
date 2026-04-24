import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";

type DepositRow = {
  id: string;
  credits_added: number;
  tokens_purchased: number | null;
  zar_cost: number | null;
  zar_per_1k_tokens: number | null;
  avg_tokens_per_credit: number | null;
  note: string | null;
  created_at: string;
};

export async function GET() {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminClient();

  const [balanceRes, depositsRes] = await Promise.all([
    admin.rpc("get_credit_vault_balance"),
    admin
      .from("credit_vault_deposits")
      .select("id, credits_added, tokens_purchased, zar_cost, zar_per_1k_tokens, avg_tokens_per_credit, note, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (balanceRes.error) return NextResponse.json({ error: balanceRes.error.message }, { status: 500 });
  if (depositsRes.error) return NextResponse.json({ error: depositsRes.error.message }, { status: 500 });

  const balance = Array.isArray(balanceRes.data) ? balanceRes.data[0] : balanceRes.data;

  return NextResponse.json({
    totalDeposited: Number(balance?.total_deposited ?? 0),
    totalUsed: Number(balance?.total_used ?? 0),
    remaining: Number(balance?.remaining ?? 0),
    deposits: (depositsRes.data ?? []) as DepositRow[],
  });
}

export async function POST(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const creditsAdded = Math.floor(Number(body.credits_added));
  if (!Number.isFinite(creditsAdded) || creditsAdded <= 0) {
    return NextResponse.json({ error: "credits_added must be a positive integer" }, { status: 400 });
  }

  const tokensPurchased = body.tokens_purchased == null ? null : Math.floor(Number(body.tokens_purchased));
  const zarCost = body.zar_cost == null ? null : Number(body.zar_cost);
  const zarPer1kTokens = body.zar_per_1k_tokens == null ? null : Number(body.zar_per_1k_tokens);
  const avgTokensPerCredit = body.avg_tokens_per_credit == null ? null : Math.floor(Number(body.avg_tokens_per_credit));
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("credit_vault_deposits")
    .insert({
      credits_added: creditsAdded,
      tokens_purchased: tokensPurchased,
      zar_cost: zarCost,
      zar_per_1k_tokens: zarPer1kTokens,
      avg_tokens_per_credit: avgTokensPerCredit,
      note,
      created_by: guard.userId ?? null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: data.id });
}
