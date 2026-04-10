import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TrackerClient from "./TrackerClient";

export default async function TrackerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: applications } = await supabase
    .from("applications")
    .select(`
      id, status, applied_at, notes,
      faculties ( id, name, field_of_study, qualification_type ),
      universities ( id, name, abbreviation, logo_url )
    `)
    .eq("student_id", user.id)
    .order("applied_at", { ascending: false });

  return <TrackerClient applications={applications ?? []} />;
}
