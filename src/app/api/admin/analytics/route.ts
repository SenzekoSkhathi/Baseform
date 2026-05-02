import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { getAdminUserAnalytics } from "@/lib/admin/userAnalytics";

export async function GET(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminClient();
  const url = new URL(req.url);

  const analytics = await getAdminUserAnalytics(admin, url.searchParams);
  return NextResponse.json(analytics);
}
