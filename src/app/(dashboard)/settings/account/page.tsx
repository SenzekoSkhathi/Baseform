import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountClient from "./AccountClient";

export const metadata = { title: "Account — Settings" };

export default async function AccountSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <AccountClient />;
}
