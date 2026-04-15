/**
 * Invoice generation and delivery.
 * Generates a PDF invoice with pdfkit, then sends it via Resend
 * from invoice@baseformapplications.com.
 *
 * Server-only — never import this from client components.
 */

import PDFDocument from "pdfkit";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Resend client ─────────────────────────────────────────────────────────────

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY ?? "placeholder");
  return _resend;
}

const INVOICE_FROM = "Baseform Invoices <invoice@baseformapplications.com>";

// ── Types ─────────────────────────────────────────────────────────────────────

export type InvoiceData = {
  invoiceNumber: string;    // e.g. "BF-00A1B2C3"
  date: string;             // ISO string from billing_events.created_at
  customerName: string;
  customerEmail: string;
  planLabel: string;        // e.g. "Essential"
  termLabel: string;        // e.g. "3 months use"
  amountZar: number;
  payfastPaymentId: string | null;
  billingEventId: string;
};

// ── PDF generation ────────────────────────────────────────────────────────────

function generateInvoicePdf(inv: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const orange = "#f97316";
    const dark   = "#111827";
    const mid    = "#6b7280";
    const light  = "#f3f4f6";
    const white  = "#ffffff";

    const dateStr = new Date(inv.date).toLocaleDateString("en-ZA", {
      day: "numeric", month: "long", year: "numeric",
    });
    const amount = `R ${inv.amountZar.toFixed(2)}`;
    const pageW = doc.page.width;
    const margin = 56;
    const contentW = pageW - margin * 2;

    // ── Header band ──────────────────────────────────────────────────────────
    doc.rect(0, 0, pageW, 100).fill(orange);

    doc
      .font("Helvetica-Bold")
      .fontSize(26)
      .fillColor(white)
      .text("Baseform", margin, 28);

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor("rgba(255,255,255,0.8)")
      .text("Your SA university application companion", margin, 60);

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(white)
      .text("INVOICE", pageW - margin - 60, 40, { width: 60, align: "right" });

    // ── Invoice meta block ───────────────────────────────────────────────────
    let y = 124;

    doc
      .font("Helvetica-Bold").fontSize(9).fillColor(mid)
      .text("INVOICE NUMBER", margin, y);
    doc
      .font("Helvetica-Bold").fontSize(9).fillColor(mid)
      .text("DATE", margin + contentW / 2, y);

    y += 14;
    doc
      .font("Helvetica-Bold").fontSize(13).fillColor(dark)
      .text(inv.invoiceNumber, margin, y);
    doc
      .font("Helvetica").fontSize(13).fillColor(dark)
      .text(dateStr, margin + contentW / 2, y);

    // ── Divider ──────────────────────────────────────────────────────────────
    y += 36;
    doc.moveTo(margin, y).lineTo(margin + contentW, y).strokeColor(light).lineWidth(1).stroke();

    // ── Bill to / from ───────────────────────────────────────────────────────
    y += 20;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(mid).text("BILL TO", margin, y);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(mid).text("FROM", margin + contentW / 2, y);

    y += 14;
    doc
      .font("Helvetica-Bold").fontSize(12).fillColor(dark)
      .text(inv.customerName || inv.customerEmail, margin, y, { width: contentW / 2 - 16 });
    doc
      .font("Helvetica-Bold").fontSize(12).fillColor(dark)
      .text("Baseform Applications", margin + contentW / 2, y);

    y += 16;
    doc
      .font("Helvetica").fontSize(10).fillColor(mid)
      .text(inv.customerEmail, margin, y);
    doc
      .font("Helvetica").fontSize(10).fillColor(mid)
      .text("invoice@baseformapplications.com", margin + contentW / 2, y);

    // ── Line items table ─────────────────────────────────────────────────────
    y += 48;

    // Table header
    doc.rect(margin, y, contentW, 32).fill(dark);
    doc
      .font("Helvetica-Bold").fontSize(9).fillColor(white)
      .text("DESCRIPTION", margin + 12, y + 10);
    doc
      .font("Helvetica-Bold").fontSize(9).fillColor(white)
      .text("TERM", margin + contentW * 0.55, y + 10);
    doc
      .font("Helvetica-Bold").fontSize(9).fillColor(white)
      .text("AMOUNT", margin + contentW - 70, y + 10);

    y += 32;

    // Single line item
    doc.rect(margin, y, contentW, 40).fill("#fafafa");
    doc
      .font("Helvetica").fontSize(11).fillColor(dark)
      .text(`${inv.planLabel} Plan`, margin + 12, y + 13);
    doc
      .font("Helvetica").fontSize(11).fillColor(mid)
      .text(inv.termLabel, margin + contentW * 0.55, y + 13);
    doc
      .font("Helvetica-Bold").fontSize(11).fillColor(dark)
      .text(amount, margin + contentW - 70, y + 13);

    y += 40;

    // Total row
    doc.rect(margin, y, contentW, 40).fill(orange);
    doc
      .font("Helvetica-Bold").fontSize(12).fillColor(white)
      .text("TOTAL PAID", margin + 12, y + 13);
    doc
      .font("Helvetica-Bold").fontSize(14).fillColor(white)
      .text(amount, margin + contentW - 70, y + 12);

    // ── Payment reference ─────────────────────────────────────────────────────
    y += 60;
    doc.moveTo(margin, y).lineTo(margin + contentW, y).strokeColor(light).lineWidth(1).stroke();

    y += 16;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(mid).text("PAYMENT REFERENCE", margin, y);
    doc
      .font("Helvetica").fontSize(10).fillColor(dark)
      .text(inv.payfastPaymentId ?? inv.billingEventId, margin, y + 14);

    // ── Footer note ───────────────────────────────────────────────────────────
    const footerY = doc.page.height - 60;
    doc.moveTo(margin, footerY).lineTo(margin + contentW, footerY).strokeColor(light).lineWidth(1).stroke();
    doc
      .font("Helvetica").fontSize(9).fillColor(mid)
      .text(
        "This document serves as your official receipt. Baseform is not VAT registered. For queries email invoice@baseformapplications.com.",
        margin, footerY + 12,
        { width: contentW, align: "center" }
      );

    doc.end();
  });
}

// ── Email HTML body ───────────────────────────────────────────────────────────

function buildInvoiceEmailHtml(inv: InvoiceData): string {
  const dateStr = new Date(inv.date).toLocaleDateString("en-ZA", {
    day: "numeric", month: "long", year: "numeric",
  });
  const amount = `R${inv.amountZar.toFixed(2)}`;
  const firstName = inv.customerName ? inv.customerName.split(" ")[0] : "there";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#fff9f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fff9f2;padding:32px 16px;">
  <tr><td align="center">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #fed7aa;">

    <!-- Header -->
    <tr><td style="background:#f97316;padding:24px 28px;">
      <p style="margin:0;color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">Baseform</p>
      <p style="margin:4px 0 0;color:#ffedd5;font-size:12px;">Your SA university application companion</p>
    </td></tr>

    <!-- Body -->
    <tr><td style="padding:28px;">
      <p style="margin:0 0 6px;font-size:18px;font-weight:800;color:#111827;">Payment confirmed, ${firstName}!</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
        Your <strong>${inv.planLabel} Plan</strong> (${inv.termLabel}) is now active. Your invoice is attached to this email as a PDF.
      </p>

      <!-- Summary card -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border-radius:12px;border:1px solid #fed7aa;overflow:hidden;margin-bottom:24px;">
        <tr><td style="padding:16px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:11px;font-weight:700;color:#f97316;letter-spacing:0.08em;text-transform:uppercase;padding-bottom:12px;">Invoice Summary</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#6b7280;padding:5px 0;">Invoice number</td>
              <td style="font-size:13px;font-weight:700;color:#111827;text-align:right;padding:5px 0;">${inv.invoiceNumber}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#6b7280;padding:5px 0;">Date</td>
              <td style="font-size:13px;font-weight:700;color:#111827;text-align:right;padding:5px 0;">${dateStr}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#6b7280;padding:5px 0;">Plan</td>
              <td style="font-size:13px;font-weight:700;color:#111827;text-align:right;padding:5px 0;">${inv.planLabel}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#6b7280;padding:5px 0;">Term</td>
              <td style="font-size:13px;font-weight:700;color:#111827;text-align:right;padding:5px 0;">${inv.termLabel}</td>
            </tr>
            <tr style="border-top:1px solid #fed7aa;">
              <td style="font-size:14px;font-weight:800;color:#111827;padding:12px 0 5px;">Total paid</td>
              <td style="font-size:16px;font-weight:900;color:#f97316;text-align:right;padding:12px 0 5px;">${amount}</td>
            </tr>
          </table>
        </td></tr>
      </table>

      <p style="margin:0 0 20px;font-size:13px;color:#6b7280;line-height:1.6;">
        The PDF invoice is attached. You can also view and save it from your billing settings at any time.
      </p>

      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://baseform.co.za"}/settings/billing"
         style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:12px;">
        View billing settings →
      </a>
    </td></tr>

    <!-- Footer -->
    <tr><td style="background:#fff7ed;border-top:1px solid #fed7aa;padding:16px 28px;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:11px;">Baseform · Helping SA students apply smarter</p>
      <p style="margin:4px 0 0;color:#d1d5db;font-size:11px;">Questions? Reply to this email or contact invoice@baseformapplications.com</p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetch billing event + user details, generate PDF invoice, and send via Resend.
 * Silently logs errors — never throws, so payment flow is never blocked.
 */
export async function sendInvoiceEmail(
  userId: string,
  billingEventId: string
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[invoice] RESEND_API_KEY not set — skipping invoice email");
    return;
  }

  try {
    const admin = createAdminClient();

    // Fetch billing event + user profile in parallel
    const [{ data: event }, { data: profile }] = await Promise.all([
      admin
        .from("billing_events")
        .select("id, plan_slug, amount_zar, term_months, term_label, payfast_payment_id, created_at")
        .eq("id", billingEventId)
        .maybeSingle(),
      admin
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    if (!event || !profile?.email) {
      console.warn("[invoice] Missing event or profile email — skipping invoice email");
      return;
    }

    const invoiceNumber = `BF-${String(event.id).slice(0, 8).toUpperCase()}`;
    const planLabel =
      String(event.plan_slug).charAt(0).toUpperCase() + String(event.plan_slug).slice(1);
    const termLabel =
      event.term_label ?? (event.term_months ? `${event.term_months} months use` : "N/A");

    const inv: InvoiceData = {
      invoiceNumber,
      date: String(event.created_at),
      customerName: String(profile.full_name ?? ""),
      customerEmail: String(profile.email),
      planLabel,
      termLabel,
      amountZar: Number(event.amount_zar),
      payfastPaymentId: event.payfast_payment_id ?? null,
      billingEventId: String(event.id),
    };

    const pdfBuffer = await generateInvoicePdf(inv);
    const html = buildInvoiceEmailHtml(inv);

    const { error } = await getResend().emails.send({
      from: INVOICE_FROM,
      to: inv.customerEmail,
      subject: `Your Baseform Invoice ${invoiceNumber}`,
      html,
      attachments: [
        {
          filename: `baseform-invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

    if (error) {
      console.error("[invoice] Resend error:", error);
    }
  } catch (err) {
    console.error("[invoice] Failed to send invoice email:", err);
  }
}
