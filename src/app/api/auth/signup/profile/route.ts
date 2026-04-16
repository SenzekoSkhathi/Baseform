import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

const REFERRAL_PER_SIGNUP = 15;
const REFERRAL_UNLOCK     = 120;
const WINDOW_DAYS         = 30;

async function processReferral(
  admin: SupabaseClient,
  referredUserId: string,
  code: string
) {
  // Find the referrer
  const { data: codeRow } = await admin
    .from("referral_codes")
    .select("user_id")
    .eq("code", code.toUpperCase())
    .maybeSingle();

  if (!codeRow || codeRow.user_id === referredUserId) return; // invalid or self-referral

  const referrerId = codeRow.user_id;

  // Prevent duplicate credit for the same referred user
  const { data: existing } = await admin
    .from("referrals")
    .select("id")
    .eq("referred_id", referredUserId)
    .maybeSingle();
  if (existing) return;

  // Record the referral
  await admin.from("referrals").insert({
    referrer_id: referrerId,
    referred_id: referredUserId,
    code,
    credited_at: new Date().toISOString(),
  });

  // Award credits to referrer
  const { data: credits } = await admin
    .from("user_credits")
    .select("balance, referral_pending, referral_window_start, referral_unlocked")
    .eq("user_id", referrerId)
    .maybeSingle();

  const now = new Date();

  if (!credits) {
    // Free plan user with no credits row yet — create one
    const windowStart = now.toISOString();
    const newPending  = REFERRAL_PER_SIGNUP;
    const unlocked    = newPending >= REFERRAL_UNLOCK;
    await admin.from("user_credits").insert({
      user_id:               referrerId,
      balance:               unlocked ? newPending : 0,
      week_start_balance:    0,
      referral_pending:      unlocked ? 0 : newPending,
      referral_window_start: unlocked ? null : windowStart,
      referral_unlocked:     unlocked,
    });
    return;
  }

  // Referrer already has a credits row
  if (credits.referral_unlocked) {
    // Already unlocked: each new referral adds directly to balance
    await admin
      .from("user_credits")
      .update({ balance: (credits.balance ?? 0) + REFERRAL_PER_SIGNUP })
      .eq("user_id", referrerId);
    return;
  }

  // Not yet unlocked — check window
  const windowStart = credits.referral_window_start
    ? new Date(credits.referral_window_start)
    : null;
  const windowExpired = windowStart
    ? (now.getTime() - windowStart.getTime()) > WINDOW_DAYS * 86_400_000
    : false;

  let newPending     = windowExpired ? REFERRAL_PER_SIGNUP : (credits.referral_pending ?? 0) + REFERRAL_PER_SIGNUP;
  let newWindowStart = windowExpired || !windowStart ? now.toISOString() : credits.referral_window_start;
  const unlocked     = newPending >= REFERRAL_UNLOCK;

  await admin
    .from("user_credits")
    .update({
      balance:               unlocked ? (credits.balance ?? 0) + newPending : (credits.balance ?? 0),
      referral_pending:      unlocked ? 0 : newPending,
      referral_window_start: unlocked ? null : newWindowStart,
      referral_unlocked:     unlocked,
    })
    .eq("user_id", referrerId);
}

const subjectSchema = z.object({
  name: z.string().min(1).max(80),
  mark: z.number().int().min(0).max(100),
});

const bodySchema = z.object({
  profile: z.object({
    full_name: z.string().min(1).max(120),
    phone: z.string().max(20).nullable().optional(),
    school_name: z.string().max(120).nullable().optional(),
    grade_year: z.enum(["Grade 11", "Grade 12"]).nullable().optional(),
    province: z.enum([
      "Gauteng",
      "Western Cape",
      "Eastern Cape",
      "KwaZulu-Natal",
      "Limpopo",
      "Mpumalanga",
      "North West",
      "Free State",
      "Northern Cape",
    ]).nullable().optional(),
    financial_need: z.enum(["yes", "no"]).nullable().optional(),
    field_of_interest: z.string().max(80).nullable().optional(),
    guardian_name: z.string().min(1).max(120),
    guardian_phone: z.string().min(1).max(20),
    guardian_relationship: z.enum(["Parent", "Guardian", "Grandparent", "Sibling", "Other"]),
    guardian_email: z.string().email().nullable().optional(),
    guardian_whatsapp_number: z.string().max(20).nullable().optional(),
  }),
  subjects: z.array(subjectSchema).max(10).optional(),
  referral_code: z.string().max(20).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const email = user.email ?? "";
    const { profile, subjects, referral_code } = parsed.data;
    const admin = createAdminClient();

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
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (subjects?.length) {
      const rows = subjects.map((s) => ({
        profile_id: userId,
        subject_name: s.name,
        mark: s.mark,
      }));

      const { error: deleteError } = await admin
        .from("student_subjects")
        .delete()
        .eq("profile_id", userId);

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }

      const { error: insertError } = await admin.from("student_subjects").insert(rows);
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // ── Process referral credit (fire-and-forget, never block signup) ──────────
    if (referral_code?.trim()) {
      void processReferral(admin, userId, referral_code.trim()).catch(() => undefined);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
