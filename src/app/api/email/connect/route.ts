import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFreePlanTier } from "@/lib/access/tiers";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();

  if (isFreePlanTier(profile?.tier)) {
    return NextResponse.json({ error: "Connect Gmail is available on paid plans only." }, { status: 403 });
  }

  const clientId    = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = new URL("/api/email/callback", req.url).toString();

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
  }

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         GOOGLE_SCOPES,
    access_type:   "offline",   // needed to get a refresh_token
    prompt:        "consent",   // always show consent to ensure refresh_token is returned
    state:         user.id,     // carry user ID through the OAuth flow
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  return NextResponse.json({ url: authUrl });
}
