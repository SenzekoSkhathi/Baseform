export const ADMIN_TIER = "admin" as const;

type AdminAccessInput = {
  tier?: string | null;
  appMetadataRole?: string | null;
  appMetadataTier?: string | null;
};

export function hasAdminAccess(input: AdminAccessInput) {
  const tier = String(input.tier ?? "").trim().toLowerCase();
  const appRole = String(input.appMetadataRole ?? "").trim().toLowerCase();
  const appTier = String(input.appMetadataTier ?? "").trim().toLowerCase();

  return tier === ADMIN_TIER || appRole === ADMIN_TIER || appTier === ADMIN_TIER;
}
