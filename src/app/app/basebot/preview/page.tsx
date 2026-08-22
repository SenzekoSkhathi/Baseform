import { Suspense } from "react";
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

  return (
    <Suspense fallback={<div className="flex justify-center p-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" /></div>}>
      <BaseBotPreviewClient firstName={profile?.full_name?.split(" ")[0] ?? "there"} />
    </Suspense>
  );
}

export const dynamic = "force-dynamic";
