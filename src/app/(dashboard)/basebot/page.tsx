import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BaseBotClient from "./BaseBotClient";
import { isFreePlanTier } from "@/lib/access/tiers";

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

  if (isFreePlanTier(profile?.tier)) {
    redirect("/settings/billing?upgrade=ai");
  }

  return <BaseBotClient profile={profile} />;
}
