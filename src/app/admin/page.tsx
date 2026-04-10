import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasAdminAccess } from "@/lib/admin/access";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .maybeSingle();

  if (!hasAdminAccess({ email: user.email, role: user.user_metadata?.role, tier: profile?.tier })) {
    redirect("/dashboard");
  }

  return <AdminClient />;
}
