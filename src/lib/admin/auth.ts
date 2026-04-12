import { createClient } from "@/lib/supabase/server";
import { hasAdminAccess } from "@/lib/admin/access";

export type AdminGuardResult =
  | { ok: true; userId: string; email: string | null }
  | { ok: false; status: 401 | 403; error: string };

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

  if (!hasAdminAccess({ email: user.email, role: user.user_metadata?.role, tier: profile?.tier })) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, userId: user.id, email: user.email ?? null };
}
