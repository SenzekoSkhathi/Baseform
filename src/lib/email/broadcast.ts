// Helpers for the admin email broadcast tool.
// Uses Resend's batch endpoint (up to 100 messages per request) so a 1000-user
// broadcast finishes in ~10 HTTP calls instead of 1000.

const FROM = process.env.EMAIL_FROM ?? "Baseform Inc. <noreply@baseformapplications.com>";
const BATCH_SIZE = 100;

// Public host used for absolute image/link URLs inside email HTML. Email
// clients won't resolve relative paths, so we always need this as an absolute
// origin. Override per environment if your production host differs.
export const EMAIL_BASE_URL = process.env.EMAIL_BASE_URL ?? "https://baseformapplications.com";

// Brand palette — keep in sync with Logo component / Tailwind theme.
export const BRAND = {
  orange: "#f97316",   // orange-500 — primary accent
  orangeDark: "#ea580c", // orange-600 — button hover / footer accents
  ink: "#111827",      // gray-900 — primary text + wordmark "base"
  paper: "#ffffff",
  surface: "#fafaf9",  // footer bg
  border: "#f1f1ef",
  muted: "#6b7280",    // gray-500 — footer copy
} as const;

export type BroadcastRecipient = {
  email: string;
  firstName: string | null;
};

export type BroadcastResult = {
  sent: number;
  failed: number;
};

/**
 * Wrap raw body content in the Baseform-branded HTML shell. Pass the body's
 * inner HTML (no <html>/<body> tags) and you get a complete email document.
 */
export function wrapInStandardHtml(subject: string, bodyHtml: string): string {
  const logoUrl = `${EMAIL_BASE_URL}/logo.svg`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${BRAND.ink};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f5;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${BRAND.paper};border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
            <!-- Brand accent strip -->
            <tr><td style="height:4px;background:${BRAND.orange};line-height:4px;font-size:0;">&nbsp;</td></tr>

            <!-- Logo header -->
            <tr>
              <td style="padding:22px 32px;border-bottom:1px solid ${BRAND.border};">
                <img src="${logoUrl}" width="180" height="42" alt="Baseform"
                     style="display:block;border:0;height:42px;width:auto;max-width:180px;" />
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px;font-size:15px;line-height:1.65;color:${BRAND.ink};">
                ${bodyHtml}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:20px 32px;background:${BRAND.surface};border-top:1px solid ${BRAND.border};font-size:12px;color:${BRAND.muted};">
                You received this email because you have a Baseform account.<br />
                <a href="${EMAIL_BASE_URL}" style="color:${BRAND.orange};text-decoration:none;font-weight:600;">baseformapplications.com</a>
                &nbsp;·&nbsp;
                <a href="${EMAIL_BASE_URL}/dashboard" style="color:${BRAND.muted};text-decoration:underline;">Dashboard</a>
                &nbsp;·&nbsp;
                <a href="${EMAIL_BASE_URL}/settings" style="color:${BRAND.muted};text-decoration:underline;">Settings</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch] as string);
}

/**
 * Replace simple {{first_name}} tokens with the recipient's first name (or
 * "there" as a friendly fallback). Add more tokens here if needed.
 */
export function personalize(html: string, recipient: BroadcastRecipient): string {
  const firstName = recipient.firstName?.trim() || "there";
  return html.replaceAll("{{first_name}}", escapeHtml(firstName));
}

/**
 * Send a broadcast in batches via Resend's batch endpoint. Returns counts.
 * Throws if RESEND_API_KEY is missing — the caller should surface that as an
 * actionable error so admins know the send was a no-op.
 */
export async function sendBroadcast(opts: {
  subject: string;
  html: string;
  recipients: BroadcastRecipient[];
}): Promise<BroadcastResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured on this environment.");

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < opts.recipients.length; i += BATCH_SIZE) {
    const slice = opts.recipients.slice(i, i + BATCH_SIZE);
    const payload = slice.map((r) => ({
      from: FROM,
      to: r.email,
      subject: opts.subject,
      html: personalize(opts.html, r),
    }));

    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        failed += slice.length;
        continue;
      }

      const json = (await res.json()) as { data?: Array<{ id?: string }> };
      const acked = Array.isArray(json.data) ? json.data.length : slice.length;
      sent += acked;
      failed += slice.length - acked;
    } catch {
      failed += slice.length;
    }
  }

  return { sent, failed };
}
