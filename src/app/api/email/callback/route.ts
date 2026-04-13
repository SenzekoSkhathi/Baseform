import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/sender";
import { isFreePlanTier } from "@/lib/access/tiers";

async function sendGmailConnectedEmail(to: string, firstName: string, gmailAddress: string, appUrl: string): Promise<"sent" | "skipped"> {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#fff9f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff9f2;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #fed7aa;">
        <tr><td style="background:#f97316;padding:24px 28px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:900;">Baseform</p>
          <p style="margin:4px 0 0;color:#ffedd5;font-size:12px;">Your SA university application companion</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f97316;text-transform:uppercase;letter-spacing:0.05em;">Gmail Connected</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:900;color:#111827;">Hi ${firstName}, your inbox is connected!</h1>
          <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
            <strong>${gmailAddress}</strong> is now linked to your Baseform account. We'll automatically scan your inbox for university replies and update your application statuses — no manual tracking needed.
          </p>
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:18px 20px;margin-bottom:24px;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;">What happens next</p>
            <div style="margin-bottom:10px;">
              <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">Auto status updates</p>
              <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">When a university emails you, we detect it and update your tracker automatically.</p>
            </div>
            <div style="margin-bottom:10px;">
              <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">Guardian notifications</p>
              <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">Your guardian will be notified when we detect a status change.</p>
            </div>
            <div>
              <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">Read-only access</p>
              <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">We only read emails — we never send, delete, or modify anything in your inbox.</p>
            </div>
          </div>
          <p style="margin:0 0 20px;font-size:13px;color:#9ca3af;line-height:1.6;">
            You can disconnect Gmail at any time from your profile settings.
          </p>
          <a href="${appUrl}/profile" style="display:inline-block;background:#f97316;color:#ffffff;font-size:14px;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;">
            View my profile →
          </a>
        </td></tr>
        <tr><td style="background:#fff7ed;border-top:1px solid #fed7aa;padding:16px 28px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:11px;">Lumen AI (Pty) Ltd · baseformapplications.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to,
    subject: `Gmail connected — we've got your inbox covered`,
    html,
  });
}

async function sendConnectedMailboxReceiptEmail(to: string, gmailAddress: string, appUrl: string): Promise<"sent" | "skipped"> {
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#fff9f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff9f2;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #fed7aa;">
        <tr><td style="background:#f97316;padding:24px 28px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:900;">Baseform</p>
          <p style="margin:4px 0 0;color:#ffedd5;font-size:12px;">Your SA university application companion</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#f97316;text-transform:uppercase;letter-spacing:0.05em;">Security confirmation</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:900;color:#111827;">This mailbox is now connected to Baseform</h1>
          <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
            <strong>${gmailAddress}</strong> was connected for read-only inbox tracking on Baseform.
          </p>
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:18px 20px;margin-bottom:24px;">
            <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#111827;">Did you do this?</p>
            <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">If yes, no action is needed. If this wasn't you, disconnect Gmail from your Baseform profile immediately and secure your account.</p>
          </div>
          <a href="${appUrl}/profile" style="display:inline-block;background:#f97316;color:#ffffff;font-size:14px;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;">
            Review connection →
          </a>
        </td></tr>
        <tr><td style="background:#fff7ed;border-top:1px solid #fed7aa;padding:16px 28px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:11px;">Lumen AI (Pty) Ltd · baseformapplications.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to,
    subject: "Mailbox connected to Baseform",
    html,
  });
}

async function resolveConnectedEmail(accessToken: string): Promise<string> {
  const gmailProfileRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (gmailProfileRes.ok) {
    const data = await gmailProfileRes.json().catch(() => ({}));
    const gmailAddress = typeof data.emailAddress === "string" ? data.emailAddress.trim() : "";
    if (gmailAddress) return gmailAddress;
  }

  const userInfoRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (userInfoRes.ok) {
    const data = await userInfoRes.json().catch(() => ({}));
    const userInfoEmail = typeof data.email === "string" ? data.email.trim() : "";
    if (userInfoEmail) return userInfoEmail;
  }

  return "";
}

function getAppUrl(req: NextRequest) {
  return new URL(req.url).origin;
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const state = searchParams.get("state"); // user ID we set in /connect
  const error = searchParams.get("error");

  const redirectBase = getAppUrl(req);

  if (error || !code || !state) {
    return NextResponse.redirect(`${redirectBase}/profile?gmail=error`);
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri  = new URL("/api/email/callback", req.url).toString();

  // Exchange auth code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("[email/callback] Token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(`${redirectBase}/profile?gmail=error`);
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokens;

  if (!access_token || !refresh_token) {
    return NextResponse.redirect(`${redirectBase}/profile?gmail=error`);
  }

  // Resolve the connected mailbox address (Gmail profile -> userinfo fallback).
  let emailAddress = await resolveConnectedEmail(access_token);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email, tier")
    .eq("id", state)
    .maybeSingle();

  if (isFreePlanTier(profile?.tier)) {
    return NextResponse.redirect(`${redirectBase}/profile?gmail=locked`);
  }

  if (!emailAddress) {
    emailAddress = profile?.email?.trim() ?? "";
  }

  if (!emailAddress) {
    console.error("[email/callback] Could not resolve connected Gmail email address");
    return NextResponse.redirect(`${redirectBase}/profile?gmail=error`);
  }

  const tokenExpiry = new Date(Date.now() + expires_in * 1000).toISOString();

  // Upsert into email_connections (one per user)
  const { error: dbError } = await supabaseAdmin
    .from("email_connections")
    .upsert(
      {
        user_id:       state,
        provider:      "gmail",
        email_address: emailAddress,
        access_token,
        refresh_token,
        token_expiry:  tokenExpiry,
        is_active:     true,
        updated_at:    new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (dbError) {
    console.error("[email/callback] DB upsert failed:", dbError);
    return NextResponse.redirect(`${redirectBase}/profile?gmail=error`);
  }

  let mailStatus: "sent" | "skipped" | "error" = "sent";

  // Send Gmail-connected confirmation email — non-fatal
  try {
    const firstName = profile?.full_name?.trim().split(" ")[0] ?? "there";
    const recipient = profile?.email?.trim() || emailAddress;
    mailStatus = await sendGmailConnectedEmail(recipient, firstName, emailAddress, redirectBase);

    const normalizedRecipient = recipient.trim().toLowerCase();
    const normalizedConnected = emailAddress.trim().toLowerCase();
    if (normalizedConnected && normalizedConnected !== normalizedRecipient) {
      await sendConnectedMailboxReceiptEmail(emailAddress, emailAddress, redirectBase);
    }
  } catch (e) {
    mailStatus = "error";
    console.error("[email/callback] Welcome email failed:", e);
  }

  return NextResponse.redirect(`${redirectBase}/profile?gmail=connected&mail=${mailStatus}`);
}
