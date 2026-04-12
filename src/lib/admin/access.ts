type AdminAccessInput = {
  tier?: string | null;
  appMetadataRole?: string | null;
  appMetadataTier?: string | null;
};

export function hasAdminAccess(input: AdminAccessInput) {
  const tier = String(input.tier ?? "").trim().toLowerCase();
  const appRole = String(input.appMetadataRole ?? "").trim().toLowerCase();
  const appTier = String(input.appMetadataTier ?? "").trim().toLowerCase();

  return tier === "admin" || appRole === "admin" || appTier === "admin";
}
