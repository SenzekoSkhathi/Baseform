const SPECIAL_ADMIN_EMAILS = ["senzeko.admin@baseform.com"];

type AdminAccessInput = {
  email?: string | null;
  role?: string | null;
  tier?: string | null;
};

export function hasAdminAccess(input: AdminAccessInput) {
  const email = String(input.email ?? "").trim().toLowerCase();
  const role = String(input.role ?? "").trim().toLowerCase();
  const tier = String(input.tier ?? "").trim().toLowerCase();

  return role === "admin" || tier === "admin" || SPECIAL_ADMIN_EMAILS.includes(email);
}
