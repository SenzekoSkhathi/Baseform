const FROM = `Baseform Inc. <noreply@baseformapplications.com>`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://baseformapplications.com";

function buildWelcomeHtml(firstName: string): string {
  const dashboardUrl = `${APP_URL}/dashboard`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#fff9f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff9f2;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #fed7aa;">

        <tr><td style="background:#f97316;padding:24px 28px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">Baseform</p>
          <p style="margin:4px 0 0;color:#ffedd5;font-size:12px;font-weight:500;">Your SA university application companion</p>
        </td></tr>

        <tr><td style="padding:28px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f97316;text-transform:uppercase;letter-spacing:0.05em;">Welcome aboard</p>
          <h1 style="margin:0 0 16px;font-size:24px;font-weight:900;color:#111827;">Hi ${firstName}, you're in!</h1>

          <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
            Your Baseform account is ready. We're here to help you discover universities and bursaries
            you qualify for, track every application, and never miss a deadline.
          </p>

          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:18px 20px;margin-bottom:24px;">
            <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;">Here's what to do next</p>

            <div style="margin-bottom:12px;">
              <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">1. Browse your matches</p>
              <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">See every university and bursary you qualify for based on your APS.</p>
            </div>

            <div style="margin-bottom:12px;">
              <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">2. Add applications to track</p>
              <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">Keep all your applications in one place and watch your progress.</p>
            </div>

            <div>
              <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">3. Ask BaseBot anything</p>
              <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">Got questions about APS, bursaries, or applications? BaseBot has answers 24/7.</p>
            </div>
          </div>

          <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
            Deadlines move fast in SA — the earlier you start, the better your chances. Let's go.
          </p>

          <a href="${dashboardUrl}" style="display:inline-block;background:#f97316;color:#ffffff;font-size:14px;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;">
            Go to my dashboard →
          </a>
        </td></tr>

        <tr><td style="background:#fff7ed;border-top:1px solid #fed7aa;padding:16px 28px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:11px;">Baseform Inc. · Helping SA students apply smarter</p>
          <p style="margin:4px 0 0;color:#d1d5db;font-size:11px;">baseformapplications.com</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(to: string, firstName: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return; // skip silently in dev if key not set

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: `Welcome to Baseform, ${firstName}!`,
      html: buildWelcomeHtml(firstName),
    }),
  });

  if (!res.ok) {
    // Non-fatal — account is created regardless
    console.error("[sendWelcomeEmail] Resend error:", await res.text());
  }
}
