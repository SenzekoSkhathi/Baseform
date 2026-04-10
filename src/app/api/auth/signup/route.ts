import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, profile, subjects } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Create user via admin API — this skips email confirmation entirely
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm so they can log in immediately
      user_metadata: { full_name: profile?.full_name ?? "" },
    });

    if (authError) {
      // User already exists — return a clear message
      if (authError.message.toLowerCase().includes("already been registered")) {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // Save profile
    if (profile) {
      const { error: profileError } = await admin.from("profiles").upsert({
        id: userId,
        ...profile,
        email,
        tier: "free",
      });

      if (profileError) {
        // Return the error so the client knows what failed — don't silently swallow it
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
        subjects.map((s: { name: string; mark: number }) => ({
          profile_id: userId,
          subject_name: s.name,
          mark: s.mark,
        }))
      );

      if (subjectError) {
        console.error("Subjects insert error:", subjectError.message);
      }
    }

    return NextResponse.json({ success: true, userId });
  } catch (err) {
    console.error("Signup route error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
