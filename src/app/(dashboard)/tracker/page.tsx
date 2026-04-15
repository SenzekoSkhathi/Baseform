import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TrackerClient from "./TrackerClient";

export const metadata = { title: "Progress — Baseform" };

export default async function TrackerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: applications }, { data: activityRows }] = await Promise.all([
    supabase
      .from("applications")
      .select(`
        id, status, notes, checklist, applied_at,
        faculties ( id, name, field_of_study, qualification_type ),
        universities ( id, name, abbreviation, logo_url, closing_date )
      `)
      .eq("student_id", user.id)
      .order("applied_at", { ascending: true }),

    supabase
      .from("applications_activity")
      .select("id, application_id, note, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const normalised = (applications ?? []).map((a) => ({
    ...a,
    faculties: Array.isArray(a.faculties) ? (a.faculties[0] ?? null) : a.faculties,
    universities: Array.isArray(a.universities) ? (a.universities[0] ?? null) : a.universities,
  }));

  return (
    <TrackerClient
      applications={normalised}
      activityRows={activityRows ?? []}
    />
  );
}
