import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { recordAdminContentAudit } from "@/lib/admin/contentAdmin";
import { NextResponse } from "next/server";

const USER_SORT_KEYS = ["full_name", "email", "tier", "created_at"] as const;
type UserSortKey = (typeof USER_SORT_KEYS)[number];
type UserSortDirection = "asc" | "desc";

function parseSortKey(value: string | null): UserSortKey {
  if (!value) return "created_at";
  return USER_SORT_KEYS.includes(value as UserSortKey) ? (value as UserSortKey) : "created_at";
}

function parseSortDirection(value: string | null, sortKey: UserSortKey): UserSortDirection {
  if (value === "asc" || value === "desc") return value;
  return sortKey === "created_at" ? "desc" : "asc";
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
  const pageRaw = Number(url.searchParams.get("page") ?? 1);
  const pageNumber = Number.isFinite(pageRaw) ? Math.max(Math.floor(pageRaw), 1) : 1;
  const queryText = url.searchParams.get("q")?.trim() || "";
  const tier = url.searchParams.get("tier")?.trim() || "all";
  const sortKey = parseSortKey(url.searchParams.get("sortKey"));
  const sortDirection = parseSortDirection(url.searchParams.get("sortDirection"), sortKey);
  const ascending = sortDirection === "asc";
  const from = (pageNumber - 1) * limit;
  const to = from + limit;

  let query = admin
    .from("profiles")
    .select("id,full_name,tier,created_at,email")
    .order(sortKey, { ascending, nullsFirst: !ascending })
    .order("id", { ascending })
    .range(from, to);

  if (tier === "free" || tier === "essential" || tier === "pro" || tier === "ultra" || tier === "admin" || tier === "disabled") {
    query = query.eq("tier", tier);
  }

  if (queryText) {
    const search = escapeLike(queryText);
    query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: profiles, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hasMore = (profiles?.length ?? 0) > limit;
  const pageItems = hasMore ? (profiles ?? []).slice(0, limit) : profiles ?? [];

  return NextResponse.json(
    {
      items: pageItems.map((profile) => ({
      id: profile.id,
      full_name: profile.full_name,
      tier: profile.tier,
      created_at: profile.created_at,
      email: profile.email ?? "",
    })),
      hasMore,
      nextCursor: null,
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
  if (!["free", "essential", "pro", "ultra", "disabled"].includes(normalizedTier)) {
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
