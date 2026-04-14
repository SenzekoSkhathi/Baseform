import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationsClient from "./NotificationsClient";

export const metadata = { title: "Notifications — Settings" };

export default async function NotificationsSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <NotificationsClient />;
}
