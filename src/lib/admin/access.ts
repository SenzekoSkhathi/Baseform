type AdminAccessInput = {
  email?: string | null;
  role?: string | null;
  tier?: string | null;
};

export function hasAdminAccess(input: AdminAccessInput) {
  const role = String(input.role ?? "").trim().toLowerCase();
  const tier = String(input.tier ?? "").trim().toLowerCase();

  if (tier === "disabled") return false;
  return role === "admin" || tier === "admin";
}
