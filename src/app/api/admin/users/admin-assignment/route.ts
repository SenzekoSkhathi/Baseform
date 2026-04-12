import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminGuard } from "@/lib/admin/auth";
import { recordAdminContentAudit } from "@/lib/admin/contentAdmin";
import { NextResponse } from "next/server";

type AdminAssignmentAction = "grant" | "revoke";

function normalizeAction(value: unknown): AdminAssignmentAction | null {
  const action = String(value ?? "").trim().toLowerCase();
  if (action === "grant" || action === "revoke") return action;
  return null;
}

function normalizeTier(value: unknown): "free" | "essential" | "pro" | "ultra" | "disabled" {
  const tier = String(value ?? "free").trim().toLowerCase();
  if (tier === "essential" || tier === "pro" || tier === "ultra" || tier === "disabled") return tier;
  return "free";
}

export async function PATCH(req: Request) {
  const guard = await requireAdminGuard();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const body = await req.json();
  const userId = String(body?.userId ?? "").trim();
  const action = normalizeAction(body?.action);
  const reason = String(body?.reason ?? "").trim();

  if (!userId || !action) {
    return NextResponse.json({ error: "userId and action are required" }, { status: 400 });
  }

  if (!reason) {
    return NextResponse.json({ error: "A reason is required for admin assignment changes" }, { status: 400 });
  }

  if (userId === guard.userId && action === "revoke") {
    return NextResponse.json({ error: "You cannot revoke your own admin access." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: before, error: existingError } = await admin
    .from("profiles")
    .select("id,full_name,tier,created_at,email")
    .eq("id", userId)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (!before) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const currentTier = String(before.tier ?? "").trim().toLowerCase();
  if (action === "grant" && currentTier === "admin") {
    return NextResponse.json({ error: "User already has admin access." }, { status: 400 });
  }

  if (action === "revoke" && currentTier !== "admin") {
    return NextResponse.json({ error: "Only admin users can be revoked through this workflow." }, { status: 400 });
  }

  const nextTier = action === "grant" ? "admin" : normalizeTier(body?.revokeToTier);
  const { error } = await admin.from("profiles").update({ tier: nextTier }).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void recordAdminContentAudit(admin, { userId: guard.userId, email: guard.email }, {
    entityType: "user",
    entityKey: userId,
    action: "update",
    beforeData: before,
    afterData: {
      ...before,
      tier: nextTier,
      admin_assignment_action: action,
      admin_assignment_reason: reason,
    },
  });

  return NextResponse.json({ success: true, userId, previousTier: before.tier, tier: nextTier, action });
}
