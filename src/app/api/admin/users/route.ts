import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminClient();

  const [{ data: profiles }, usersRes] = await Promise.all([
    admin.from("profiles").select("id,full_name,tier,created_at").order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emailById = new Map<string, string>();
  for (const user of usersRes.data.users ?? []) {
    emailById.set(user.id, user.email ?? "");
  }

  return NextResponse.json(
    (profiles ?? []).map((profile: any) => ({
      id: profile.id,
      full_name: profile.full_name,
      tier: profile.tier,
      created_at: profile.created_at,
      email: emailById.get(profile.id) ?? "",
    }))
  );
}

export async function PATCH(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { userId, tier } = await req.json();
  if (!userId || !tier) {
    return NextResponse.json({ error: "userId and tier are required" }, { status: 400 });
  }

  if (String(userId) === guard.userId && String(tier).toLowerCase() === "disabled") {
    return NextResponse.json({ error: "You cannot disable your own account." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ tier }).eq("id", String(userId));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
