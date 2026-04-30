// Helpers for the admin email broadcast tool.
// Uses Resend's batch endpoint (up to 100 messages per request) so a 1000-user
// broadcast finishes in ~10 HTTP calls instead of 1000.

const FROM = process.env.EMAIL_FROM ?? "Baseform Inc. <noreply@baseformapplications.com>";
// Set EMAIL_REPLY_TO to a real human inbox (e.g. "senzeko@baseformapplications.com").
// Gmail down-ranks senders whose Reply-To matches a no-reply address — having a
// real reply target is one of the strongest signals for Primary tab placement.
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "";
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
// Intentionally minimal HTML shell — no big logo banner, no accent strips, no
// marketing-style buttons in the chrome. Gmail's Promotions classifier looks
// at HTML weight, image-to-text ratio, and "marketing card" patterns. Keeping
// the wrapper close to a plain personal letter is one of the strongest levers
// we have for landing in the Primary tab. Brand colour is preserved via the
// wordmark + footer link; that's enough identity without screaming "campaign."
export function wrapInStandardHtml(subject: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:24px 16px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${BRAND.ink};font-size:15px;line-height:1.6;">
    <div style="max-width:560px;margin:0 auto;">
      <p style="margin:0 0 24px 0;font-weight:700;font-size:16px;letter-spacing:-0.01em;">
        <span style="color:${BRAND.ink};">base</span><span style="color:${BRAND.orange};">form</span>
      </p>
      ${bodyHtml}
      <p style="margin:32px 0 0 0;padding-top:16px;border-top:1px solid #eeeeec;font-size:12px;color:${BRAND.muted};line-height:1.5;">
        You're receiving this because you have a Baseform account.
        <a href="${EMAIL_BASE_URL}/settings" style="color:${BRAND.muted};text-decoration:underline;">Manage email preferences</a>.
      </p>
    </div>
  </body>
</html>`;
}

/**
 * Naive HTML → text conversion for the multipart plain-text alternative.
 * Marketing emails almost never include a text/plain part — providing one
 * pushes Gmail away from the Promotions classifier.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
    const payload = slice.map((r) => {
      const personalisedHtml = personalize(opts.html, r);
      const message: Record<string, unknown> = {
        from: FROM,
        to: r.email,
        subject: opts.subject,
        html: personalisedHtml,
        text: htmlToPlainText(personalisedHtml),
      };
      if (REPLY_TO) message.reply_to = REPLY_TO;
      return message;
    });

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
