/**
 * Resend-powered email sender with Baseform-branded HTML templates.
 */

import { Resend } from "resend";

// Lazily initialised so the module can be imported without a key (e.g. preview scripts).
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY ?? "placeholder");
  return _resend;
}

const FROM = process.env.EMAIL_FROM ?? "Baseform <notifications@baseform.co.za>";

// ── Base layout ───────────────────────────────────────────────────────────────

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#fff9f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff9f2;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #fed7aa;">

          <!-- Header -->
          <tr>
            <td style="background:#f97316;padding:24px 28px;">
              <p style="margin:0;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">Baseform</p>
              <p style="margin:4px 0 0;color:#ffedd5;font-size:12px;font-weight:500;">Your SA university application companion</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fff7ed;border-top:1px solid #fed7aa;padding:16px 28px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:11px;">
                Baseform · Helping SA students apply smarter
              </p>
              <p style="margin:4px 0 0;color:#d1d5db;font-size:11px;">
                You're receiving this because you track university applications on Baseform.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:20px;background:#f97316;color:#ffffff;font-size:14px;font-weight:700;padding:12px 24px;border-radius:12px;text-decoration:none;">${label} →</a>`;
}

function statusBadge(status: string): string {
  const colours: Record<string, string> = {
    planning:    "background:#f3f4f6;color:#6b7280",
    in_progress: "background:#dbeafe;color:#1d4ed8",
    submitted:   "background:#ede9fe;color:#7c3aed",
    accepted:    "background:#d1fae5;color:#065f46",
    rejected:    "background:#fee2e2;color:#991b1b",
    waitlisted:  "background:#fef3c7;color:#92400e",
  };
  const style = colours[status] ?? colours.planning;
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `<span style="${style};padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700;">${label}</span>`;
}

// ── Templates ─────────────────────────────────────────────────────────────────

export function buildDeadlineEmail(opts: {
  firstName: string;
  universityName: string;
  closingDate: string;
  daysLeft: number;
  programmeCount: number;
  appStatus: string;
  appUrl: string;
}): { subject: string; html: string } {
  const urgency = opts.daysLeft === 1 ? "LAST DAY" : `${opts.daysLeft} days left`;
  const subject = `⏰ ${opts.universityName} closes in ${opts.daysLeft} day${opts.daysLeft === 1 ? "" : "s"} — don't miss it`;

  const closingFormatted = new Date(opts.closingDate).toLocaleDateString("en-ZA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const urgencyColor = opts.daysLeft === 1 ? "#dc2626" : opts.daysLeft <= 7 ? "#d97706" : "#2563eb";

  const html = layout(`
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f97316;text-transform:uppercase;letter-spacing:0.05em;">Application Deadline Reminder</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#111827;">Hi ${opts.firstName},</h1>

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:18px 20px;margin-bottom:20px;">
      <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;font-weight:500;">University</p>
      <p style="margin:0 0 14px;font-size:17px;font-weight:800;color:#111827;">${opts.universityName}</p>

      <p style="margin:0 0 6px;font-size:13px;color:#9ca3af;font-weight:500;">Closing date</p>
      <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#111827;">${closingFormatted}</p>

      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <div>
          <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;font-weight:500;">Status</p>
          ${statusBadge(opts.appStatus)}
        </div>
        <div>
          <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;font-weight:500;">Programmes</p>
          <p style="margin:0;font-size:15px;font-weight:700;color:#111827;">${opts.programmeCount}</p>
        </div>
      </div>
    </div>

    <div style="background:${urgencyColor}15;border-left:4px solid ${urgencyColor};border-radius:8px;padding:12px 16px;">
      <p style="margin:0;font-size:14px;font-weight:700;color:${urgencyColor};">${urgency} — ${
        opts.daysLeft === 1
          ? "Submit today or you'll miss your chance."
          : opts.daysLeft <= 7
            ? "Act now — the deadline is almost here."
            : "Start getting your documents ready."
      }</p>
    </div>

    ${ctaButton("View my application", opts.appUrl)}
  `);

  return { subject, html };
}

export function buildGuardianEmail(opts: {
  guardianName: string;
  studentName: string;
  universityName: string;
  programmeName: string;
  newStatus: string;
  closingDate: string | null;
  appUrl: string;
}): { subject: string; html: string } {
  const subject = `Update on ${opts.studentName}'s application to ${opts.universityName}`;

  const closingFormatted = opts.closingDate
    ? new Date(opts.closingDate).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })
    : "Check app for details";

  const html = layout(`
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f97316;text-transform:uppercase;letter-spacing:0.05em;">Guardian Update</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#111827;">Hi ${opts.guardianName},</h1>

    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
      We wanted to let you know that there has been an update on <strong>${opts.studentName}</strong>'s university application.
    </p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:18px 20px;margin-bottom:20px;">
      <p style="margin:0 0 12px;font-size:13px;color:#9ca3af;font-weight:500;text-transform:uppercase;letter-spacing:0.05em;">Application details</p>

      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;font-weight:500;">University</p>
      <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#111827;">${opts.universityName}</p>

      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;font-weight:500;">Programme</p>
      <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#111827;">${opts.programmeName}</p>

      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;font-weight:500;">Current status</p>
      <div style="margin:0 0 14px;">${statusBadge(opts.newStatus)}</div>

      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;font-weight:500;">Application deadline</p>
      <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${closingFormatted}</p>
    </div>

    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
      ${opts.studentName} is using Baseform to track and manage all their university applications in one place.
    </p>

    ${ctaButton("View on Baseform", opts.appUrl)}
  `);

  return { subject, html };
}

// ── Send helper ───────────────────────────────────────────────────────────────

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[emailSender] RESEND_API_KEY not set — skipping email send");
    return;
  }

  const { error } = await getResend().emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }
}
