import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SecurityAction = "change-password" | "resend-verification";

function getSiteOrigin(req: NextRequest): string {
  const fromHeader = req.headers.get("origin");
  if (fromHeader) return fromHeader;

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv;

  return "http://localhost:3000";
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    email: user.email ?? "",
    emailConfirmedAt: user.email_confirmed_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
    createdAt: user.created_at ?? null,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        action?: SecurityAction;
        password?: string;
      }
    | null;

  if (body?.action === "change-password") {
    const password = String(body.password ?? "");

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Password updated." });
  }

  if (body?.action === "resend-verification") {
    if (!user.email) {
      return NextResponse.json({ error: "No email found for this account." }, { status: 400 });
    }

    if (user.email_confirmed_at) {
      return NextResponse.json({ ok: true, message: "Email is already verified." });
    }

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: {
        emailRedirectTo: `${getSiteOrigin(req)}/verify-email`,
      },
    });

    if (resendError) {
      return NextResponse.json({ error: resendError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Verification email sent." });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}