import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name,tier,email,created_at")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      app_metadata: user.app_metadata,
    },
    profile: profile || null,
    admin_check: {
      profile_tier_is_admin: profile?.tier === "admin",
      app_metadata_role_is_admin: user.app_metadata?.role === "admin",
      app_metadata_tier_is_admin: user.app_metadata?.tier === "admin",
      will_redirect_to_admin: profile?.tier === "admin" || user.app_metadata?.role === "admin" || user.app_metadata?.tier === "admin",
    },
  });
}
