import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/billing/downgrade
 * Downgrades the authenticated user to the Free plan.
 * PayFast payments are one-time, so "cancellation" = downgrade to Free.
 * Credits row is cleared (user loses remaining balance).
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ tier: "free" })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: "Could not update plan." }, { status: 500 });
  }

  // Remove credits row — free plan has no credit allowance
  await admin.from("user_credits").delete().eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
