import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isFreePlanTier } from "@/lib/access/tiers";
import BaseBotClient from "./BaseBotClient";

export default async function BaseBotPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, field_of_interest, tier")
    .eq("id", user.id)
    .single();

  // Middleware handles this redirect for most cases; this is a safety fallback.
  if (isFreePlanTier(profile?.tier)) {
    redirect("/basebot/preview");
  }

  return <BaseBotClient profile={profile} />;
}
