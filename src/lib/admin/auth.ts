import { createClient } from "@/lib/supabase/server";
import { ADMIN_TIER } from "@/lib/admin/access";

export type AdminGuardResult =
  | { ok: true; userId: string; email: string | null }
  | { ok: false; status: 401 | 403; error: string };

type AdminDecisionInput = {
  profileTier?: string | null;
  appMetadata?: unknown;
};

function readAdminMetadataField(metadata: unknown, field: "role" | "tier") {
  if (!metadata || typeof metadata !== "object") return "";
  const value = (metadata as Record<string, unknown>)[field];
  return typeof value === "string" ? value : "";
}

export function hasServerAuthoritativeAdminAccess(input: AdminDecisionInput) {
  const tier = String(input.profileTier ?? "").trim().toLowerCase();
  const appRole = readAdminMetadataField(input.appMetadata, "role").trim().toLowerCase();
  const appTier = readAdminMetadataField(input.appMetadata, "tier").trim().toLowerCase();

  return tier === ADMIN_TIER || appRole === ADMIN_TIER || appTier === ADMIN_TIER;
}

export async function requireAdminGuard(): Promise<AdminGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, status: 401, error: "Unauthorized" };

  // Admin tools must require a verified email regardless of tier — a stolen
  // session with an unconfirmed email shouldn't grant access to user data.
  if (!user.email_confirmed_at) {
    return { ok: false, status: 401, error: "Email not verified" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !hasServerAuthoritativeAdminAccess({
      profileTier: profile?.tier,
      appMetadata: user.app_metadata,
    })
  ) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, userId: user.id, email: user.email ?? null };
}
