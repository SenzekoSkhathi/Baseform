import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  const redirectBase = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (error || !code || !state) {
    return NextResponse.redirect(`${redirectBase}/profile?gmail=error`);
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI!;

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

  // Fetch the Gmail address for this token
  const profileRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    { headers: { Authorization: `Bearer ${access_token}` } }
  );

  const profileData = profileRes.ok ? await profileRes.json() : {};
  const emailAddress: string = profileData.emailAddress ?? "";

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

  return NextResponse.redirect(`${redirectBase}/profile?gmail=connected`);
}
