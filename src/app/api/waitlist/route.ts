import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const email = String(body.email).trim().toLowerCase();
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await admin.from("waitlist").upsert(
    {
      email,
      full_name: body.fullName ? String(body.fullName).trim() : null,
      aps: body.aps ? Number(body.aps) : null,
      province: body.province ? String(body.province).trim() : null,
      field_of_interest: body.fieldOfInterest ? String(body.fieldOfInterest).trim() : null,
      grade_year: body.gradeYear ? String(body.gradeYear).trim() : null,
    },
    { onConflict: "email", ignoreDuplicates: false }
  );

  if (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
