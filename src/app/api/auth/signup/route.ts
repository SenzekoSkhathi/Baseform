import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signupSchema } from "@/lib/validation/schemas";
import { sendWelcomeEmail } from "@/lib/email/sendWelcome";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const { email, password, profile, subjects } = parsed.data;

    const admin = createAdminClient();

    // Create user via admin API — auto-confirm so they can log in immediately
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: profile?.full_name ?? "" },
    });

    if (authError) {
      if (authError.message.toLowerCase().includes("already been registered")) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // Save profile — only whitelisted fields reach the DB
    if (profile) {
      const { error: profileError } = await admin.from("profiles").upsert({
        id: userId,
        email,
        tier: "free",
        full_name: profile.full_name,
        phone: profile.phone ?? null,
        school_name: profile.school_name ?? null,
        grade_year: profile.grade_year ?? null,
        province: profile.province ?? null,
        financial_need: profile.financial_need ?? null,
        field_of_interest: profile.field_of_interest ?? null,
        guardian_name: profile.guardian_name,
        guardian_phone: profile.guardian_phone,
        guardian_relationship: profile.guardian_relationship,
        guardian_email: profile.guardian_email ?? null,
        guardian_whatsapp_number: profile.guardian_whatsapp_number ?? null,
      });

      if (profileError) {
        console.error("Profile upsert error:", profileError.message);
        return NextResponse.json(
          { error: `Account created but profile could not be saved: ${profileError.message}` },
          { status: 500 }
        );
      }
    }

    // Save subjects
    if (subjects?.length) {
      const { error: subjectError } = await admin.from("student_subjects").insert(
        subjects.map((s) => ({
          profile_id: userId,
          subject_name: s.name,
          mark: s.mark,
        }))
      );

      if (subjectError) {
        console.error("Subjects insert error:", subjectError.message);
      }
    }

    // Send welcome email — non-fatal if it fails
    const firstName = profile?.full_name?.trim().split(" ")[0] ?? "there";
    void sendWelcomeEmail(email, firstName);

    return NextResponse.json({ success: true, userId });
  } catch (err) {
    console.error("Signup route error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
