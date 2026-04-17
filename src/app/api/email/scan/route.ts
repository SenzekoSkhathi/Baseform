import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isEffectivelyFreeTier } from "@/lib/access/tiers";
import { deductCredits } from "@/lib/credits";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

export async function POST() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, plan_expires_at")
    .eq("id", session.user.id)
    .maybeSingle();

  if (isEffectivelyFreeTier(profile?.tier, profile?.plan_expires_at)) {
    return NextResponse.json({ error: "Connect Gmail is available on paid plans only." }, { status: 403 });
  }

  const { ok: credited } = await deductCredits(session.user.id, "email_scan", "Gmail agent check");
  if (!credited) {
    return NextResponse.json({ error: "You've run out of Base Credits. Your weekly allowance refills every Monday." }, { status: 402 });
  }

  const res = await fetch(`${BACKEND_URL}/email/scan`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    return NextResponse.json({ error: json.error ?? "Scan failed" }, { status: res.status });
  }

  return NextResponse.json({ message: "Scan started" });
}
