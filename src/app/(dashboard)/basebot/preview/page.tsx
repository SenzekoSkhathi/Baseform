import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BaseBotPreviewClient from "./BaseBotPreviewClient";

export default async function BaseBotPreviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return <BaseBotPreviewClient firstName={profile?.full_name?.split(" ")[0] ?? "there"} />;
}
