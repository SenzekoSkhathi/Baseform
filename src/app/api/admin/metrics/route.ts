import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { NextResponse } from "next/server";

function dateKey(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

export async function GET() {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminClient();

  const [
    { count: totalUsers },
    { count: totalApplications },
    { data: profileRows },
    { data: appRows },
    { data: aiRows },
    { data: statusRows },
    { data: provinceRows },
    { count: waitlistCount },
    { count: bursaryTrackingCount },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("applications").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("created_at"),
    admin.from("applications").select("created_at, status"),
    admin.from("ai_coach_logs").select("created_at,input_tokens,output_tokens"),
    // Application status breakdown
    admin.from("applications").select("status"),
    // Province distribution
    admin.from("profiles").select("province"),
    // Waitlist count
    admin.from("waitlist").select("id", { count: "exact", head: true }),
    // Bursary tracking count
    admin.from("bursary_applications").select("id", { count: "exact", head: true }),
  ]);

  // ── Daily series ──────────────────────────────────────────────────────────

  const signupMap = new Map<string, number>();
  for (const row of profileRows ?? []) {
    const createdAt = (row as Record<string, unknown>).created_at as string | null;
    if (!createdAt) continue;
    const key = dateKey(createdAt);
    signupMap.set(key, (signupMap.get(key) ?? 0) + 1);
  }

  const applicationMap = new Map<string, number>();
  for (const row of appRows ?? []) {
    const createdAt = (row as Record<string, unknown>).created_at as string | null;
    if (!createdAt) continue;
    const key = dateKey(createdAt);
    applicationMap.set(key, (applicationMap.get(key) ?? 0) + 1);
  }

  const tokenMap = new Map<string, number>();
  let totalTokens = 0;
  for (const row of aiRows ?? []) {
    const createdAt = (row as Record<string, unknown>).created_at as string | null;
    if (!createdAt) continue;
    const inputTokens = Number((row as Record<string, unknown>).input_tokens ?? 0);
    const outputTokens = Number((row as Record<string, unknown>).output_tokens ?? 0);
    const tokens = inputTokens + outputTokens;
    totalTokens += tokens;
    const key = dateKey(createdAt);
    tokenMap.set(key, (tokenMap.get(key) ?? 0) + tokens);
  }

  const days = Array.from(
    new Set([...signupMap.keys(), ...applicationMap.keys(), ...tokenMap.keys()])
  ).sort();

  // ── Application status breakdown ──────────────────────────────────────────

  const statusBreakdown: Record<string, number> = {
    planning: 0, in_progress: 0, submitted: 0,
    accepted: 0, rejected: 0, waitlisted: 0,
  };
  for (const row of statusRows ?? []) {
    const s = (row as Record<string, unknown>).status as string;
    if (s in statusBreakdown) statusBreakdown[s]++;
  }

  // ── Province distribution ─────────────────────────────────────────────────

  const provinceMap = new Map<string, number>();
  for (const row of provinceRows ?? []) {
    const p = ((row as Record<string, unknown>).province as string | null) ?? "Unknown";
    provinceMap.set(p, (provinceMap.get(p) ?? 0) + 1);
  }
  const provinceDistribution = Array.from(provinceMap.entries())
    .map(([province, count]) => ({ province, count }))
    .sort((a, b) => b.count - a.count);

  // ── Funnel ────────────────────────────────────────────────────────────────

  const submitted = (statusBreakdown.submitted ?? 0)
    + (statusBreakdown.accepted ?? 0)
    + (statusBreakdown.rejected ?? 0)
    + (statusBreakdown.waitlisted ?? 0);

  const funnel = {
    signups: totalUsers ?? 0,
    createdApplications: totalApplications ?? 0,
    submittedApplications: submitted,
  };

  return NextResponse.json({
    totals: {
      users: totalUsers ?? 0,
      applications: totalApplications ?? 0,
      tokens: totalTokens,
      waitlist: waitlistCount ?? 0,
      bursaryTracking: bursaryTrackingCount ?? 0,
    },
    daily: days.map((day) => ({
      day,
      signups: signupMap.get(day) ?? 0,
      applications: applicationMap.get(day) ?? 0,
      tokens: tokenMap.get(day) ?? 0,
    })),
    statusBreakdown,
    provinceDistribution,
    funnel,
  });
}
