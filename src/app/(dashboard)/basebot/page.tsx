import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isFreePlanTier } from "@/lib/access/tiers";
import BaseBotClient from "./BaseBotClient";
import UpgradeGate from "@/components/UpgradeGate";
import { Bot } from "lucide-react";

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
    return (
      <UpgradeGate
        icon={<Bot size={36} className="text-orange-500" />}
        feature="BaseBot AI"
        description="Your personal AI coach for university applications — powered by everything Baseform knows about you."
        bullets={[
          "Ask anything about your applications and APS score",
          "Get personalised advice based on your subjects and goals",
          "Track deadlines, plan next steps, and stay on course",
        ]}
      />
    );
  }

  return <BaseBotClient profile={profile} />;
}
