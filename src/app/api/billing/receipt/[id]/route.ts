import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("billing_events")
    .select("id, plan_slug, amount_zar, status, term_months, term_label, payfast_payment_id, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  }

  const receiptText = [
    "Baseform Payment Receipt",
    `Receipt ID: ${data.id}`,
    `Date: ${new Date(String(data.created_at)).toLocaleString()}`,
    `Plan: ${String(data.plan_slug).toUpperCase()}`,
    `Term: ${data.term_label ?? (data.term_months ? `${data.term_months} months use` : "N/A")}`,
    `Amount: R${Number(data.amount_zar).toFixed(2)}`,
    `Status: ${data.status}`,
    data.payfast_payment_id ? `PayFast Payment ID: ${data.payfast_payment_id}` : "PayFast Payment ID: N/A",
  ].join("\n");

  return new NextResponse(receiptText, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="baseform-receipt-${data.id}.txt"`,
    },
  });
}