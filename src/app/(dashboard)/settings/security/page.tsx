import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SecurityClient from "./SecurityClient";

export const metadata = { title: "Security — Settings" };

export default async function SecuritySettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <SecurityClient />;
}
