import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, guardian_token, guardian_name, guardian_email")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  if (!profile.guardian_email) {
    return NextResponse.json({ error: "No guardian email saved on your profile" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://baseform.co.za";
  const portalUrl = `${appUrl}/parent/${profile.guardian_token}`;
  const studentName = (profile.full_name ?? "").trim() || "your child";
  const guardianFirst = (profile.guardian_name ?? "").trim().split(" ")[0] || "there";

  // Send via Resend
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    // Still return the link even if email isn't configured
    return NextResponse.json({ portalUrl, emailSent: false });
  }

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
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:900;color:#111827;">Hi ${guardianFirst},</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
            <strong>${studentName}</strong> has shared their university application progress with you on Baseform.
            You can view their APS score, applications, and upcoming deadlines at any time.
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
            This is a read-only view — no sign-up or password required.
          </p>
          <a href="${portalUrl}" style="display:inline-block;background:#f97316;color:#ffffff;font-size:14px;font-weight:700;padding:14px 28px;border-radius:12px;text-decoration:none;">
            View ${studentName}'s progress →
          </a>
          <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
            Or copy this link: ${portalUrl}
          </p>
        </td></tr>
        <tr><td style="background:#fff7ed;border-top:1px solid #fed7aa;padding:16px 28px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:11px;">Baseform · Helping SA students apply smarter</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Baseform <notifications@baseform.co.za>",
      to: profile.guardian_email,
      subject: `${studentName} shared their university progress with you`,
      html,
    }),
  });

  return NextResponse.json({
    portalUrl,
    emailSent: emailRes.ok,
  });
}
