import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PlanId = "essential" | "pro" | "ultra";

function isAllowedPlan(plan: string): plan is PlanId {
  return plan === "essential" || plan === "pro" || plan === "ultra";
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { plan?: string } | null;
  const plan = String(body?.plan ?? "").trim().toLowerCase();

  if (!isAllowedPlan(plan)) {
    return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Could not verify payment status." }, { status: 500 });
  }

  const currentTier = String(profile?.tier ?? "").trim().toLowerCase();
  if (currentTier !== plan) {
    return NextResponse.json({ ok: false, pending: true, tier: currentTier });
  }

  return NextResponse.json({ ok: true, tier: currentTier });
}
