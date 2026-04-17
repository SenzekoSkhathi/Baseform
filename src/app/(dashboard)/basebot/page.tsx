import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isEffectivelyFreeTier } from "@/lib/access/tiers";
import BaseBotClient from "./BaseBotClient";

export default async function BaseBotPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, field_of_interest, tier, plan_expires_at")
    .eq("id", user.id)
    .single();

  // Middleware handles this redirect for most cases; this is a safety fallback.
  if (isEffectivelyFreeTier(profile?.tier, profile?.plan_expires_at)) {
    redirect("/basebot/preview");
  }

  return <BaseBotClient profile={profile} />;
}
