import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/email/sendWelcome";

const WELCOME_NOTIFICATION_TYPE = "welcome_email";
const WELCOME_REFERENCE_ID = "signup_verification";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ sent: false, skipped: true, reason: "resend_not_configured" });
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from("notification_sent_log")
      .select("id")
      .eq("user_id", user.id)
      .eq("notification_type", WELCOME_NOTIFICATION_TYPE)
      .eq("reference_id", WELCOME_REFERENCE_ID)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ sent: false, skipped: true, reason: "already_sent" });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    const recipient = profile?.email?.trim() || user.email?.trim() || "";
    if (!recipient) {
      return NextResponse.json({ sent: false, skipped: true, reason: "missing_recipient" });
    }

    const firstName =
      profile?.full_name?.trim().split(" ")[0] ||
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name.trim().split(" ")[0]
        : "there");

    await sendWelcomeEmail(recipient, firstName);

    await admin.from("notification_sent_log").insert({
      user_id: user.id,
      notification_type: WELCOME_NOTIFICATION_TYPE,
      reference_id: WELCOME_REFERENCE_ID,
      email_address: recipient,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Failed to send welcome email" }, { status: 500 });
  }
}