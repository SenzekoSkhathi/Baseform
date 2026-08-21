import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return <BaseBotClient profile={profile} userId={user.id} />;
}
