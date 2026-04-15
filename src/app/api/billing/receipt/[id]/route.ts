import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const planLabel = String(data.plan_slug).charAt(0).toUpperCase() + String(data.plan_slug).slice(1);
  const termLabel = data.term_label ?? (data.term_months ? `${data.term_months} months use` : "N/A");
  const amount = `R${Number(data.amount_zar).toFixed(2)}`;
  const dateStr = new Date(String(data.created_at)).toLocaleDateString("en-ZA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const statusLabel = String(data.status).charAt(0).toUpperCase() + String(data.status).slice(1).toLowerCase();
  const receiptId = String(data.id).slice(0, 8).toUpperCase();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Baseform Receipt ${receiptId}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #fff9f2;
      color: #1a1a1a;
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 40px 16px;
    }

    .card {
      background: #ffffff;
      border-radius: 20px;
      border: 1px solid #e5e7eb;
      width: 100%;
      max-width: 480px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
    }

    .header {
      background: #f97316;
      padding: 28px 32px;
      color: #ffffff;
    }

    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .logo {
      font-size: 20px;
      font-weight: 900;
      letter-spacing: -0.5px;
    }

    .paid-badge {
      background: rgba(255,255,255,0.25);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .amount {
      font-size: 42px;
      font-weight: 900;
      letter-spacing: -1px;
      line-height: 1;
    }

    .amount-label {
      font-size: 13px;
      opacity: 0.8;
      margin-top: 4px;
    }

    .body {
      padding: 28px 32px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 10px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 14px;
    }

    .row:last-child { border-bottom: none; }

    .row-label {
      color: #6b7280;
      font-weight: 500;
    }

    .row-value {
      font-weight: 700;
      color: #111827;
      text-align: right;
    }

    .id-value {
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: 12px;
    }

    .footer {
      background: #fafafa;
      border-top: 1px solid #f3f4f6;
      padding: 16px 32px;
      font-size: 11px;
      color: #9ca3af;
      text-align: center;
    }

    .print-btn {
      display: block;
      width: 100%;
      max-width: 480px;
      margin: 16px auto 0;
      padding: 13px;
      background: #f97316;
      color: #fff;
      border: none;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }

    .print-btn:hover { background: #ea6c0a; }

    @media print {
      body { background: white; padding: 0; }
      .card { box-shadow: none; border: none; max-width: 100%; border-radius: 0; }
      .print-btn { display: none; }
    }
  </style>
</head>
<body>
  <div>
    <div class="card">
      <div class="header">
        <div class="header-top">
          <span class="logo">Baseform</span>
          <span class="paid-badge">${statusLabel}</span>
        </div>
        <div class="amount">${amount}</div>
        <div class="amount-label">${planLabel} Plan &mdash; ${termLabel}</div>
      </div>

      <div class="body">
        <div class="row">
          <span class="row-label">Receipt ID</span>
          <span class="row-value id-value">${receiptId}</span>
        </div>
        <div class="row">
          <span class="row-label">Date</span>
          <span class="row-value">${dateStr}</span>
        </div>
        <div class="row">
          <span class="row-label">Plan</span>
          <span class="row-value">${planLabel}</span>
        </div>
        <div class="row">
          <span class="row-label">Term</span>
          <span class="row-value">${termLabel}</span>
        </div>
        <div class="row">
          <span class="row-label">Amount paid</span>
          <span class="row-value">${amount}</span>
        </div>
        <div class="row">
          <span class="row-label">Payment method</span>
          <span class="row-value">PayFast</span>
        </div>
        ${data.payfast_payment_id ? `
        <div class="row">
          <span class="row-label">PayFast ID</span>
          <span class="row-value id-value">${data.payfast_payment_id}</span>
        </div>` : ""}
      </div>

      <div class="footer">
        Baseform &middot; baseform.app &middot; This receipt is your proof of payment.
      </div>
    </div>

    <button class="print-btn" onclick="window.print()">Save as PDF / Print</button>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
