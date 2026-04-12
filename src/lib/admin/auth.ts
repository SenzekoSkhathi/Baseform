import { createClient } from "@/lib/supabase/server";

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

  return tier === "admin" || appRole === "admin" || appTier === "admin";
}

export async function requireAdminGuard(): Promise<AdminGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, status: 401, error: "Unauthorized" };

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
