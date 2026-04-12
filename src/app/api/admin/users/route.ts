import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { recordAdminContentAudit } from "@/lib/admin/contentAdmin";
import { NextResponse } from "next/server";

function parseCursor(value: string | null): string | null {
  if (!value) return null;
  const createdAt = decodeURIComponent(value);
  return createdAt || null;
}

function escapeLike(value: string): string {
  return value.replace(/[%,_]/g, (match) => `\\${match}`).replace(/,/g, " ");
}

export async function GET(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdminClient();
  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 10), 1), 100);
  const cursor = parseCursor(url.searchParams.get("cursor"));
  const queryText = url.searchParams.get("q")?.trim() || "";
  const tier = url.searchParams.get("tier")?.trim() || "all";

  let query = admin
    .from("profiles")
    .select("id,full_name,tier,created_at,email")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (tier === "free" || tier === "pro" || tier === "admin" || tier === "disabled") {
    query = query.eq("tier", tier);
  }

  if (queryText) {
    const search = escapeLike(queryText);
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: profiles, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hasMore = (profiles?.length ?? 0) > limit;
  const page = hasMore ? (profiles ?? []).slice(0, limit) : profiles ?? [];
  const nextCursor = hasMore && page.length > 0
    ? `${encodeURIComponent(page[page.length - 1].created_at ?? "")}`
    : null;

  return NextResponse.json(
    {
      items: page.map((profile) => ({
      id: profile.id,
      full_name: profile.full_name,
      tier: profile.tier,
      created_at: profile.created_at,
      email: profile.email ?? "",
    })),
      hasMore,
      nextCursor,
    }
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

  const normalizedTier = String(tier).trim().toLowerCase();
  if (!["free", "pro", "disabled"].includes(normalizedTier)) {
    return NextResponse.json(
      { error: "Invalid tier for this endpoint. Use the admin assignment workflow for admin tier changes." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: before, error: existingError } = await admin
    .from("profiles")
    .select("id,full_name,tier,created_at,email")
    .eq("id", String(userId))
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (!before) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (String(before.tier ?? "").toLowerCase() === "admin") {
    return NextResponse.json(
      { error: "Admin tier revocation must use the admin assignment workflow with a reason." },
      { status: 400 }
    );
  }

  const { error } = await admin.from("profiles").update({ tier: normalizedTier }).eq("id", String(userId));

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "user",
    entityKey: String(userId),
    action: "update",
    beforeData: before,
    afterData: { ...before, tier: normalizedTier },
  });

  return NextResponse.json({ success: true });
}
