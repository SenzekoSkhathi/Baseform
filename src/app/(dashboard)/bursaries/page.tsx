import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { calculateAPS } from "@/lib/aps/calculator";
import BursariesClient from "./BursariesClient";

export default async function BursariesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let province: string | null = null;
  let aps = 0;
  let bursaries: Record<string, unknown>[] = [];

  try {
    const [{ data: profile }, { data: subjects }] = await Promise.all([
      supabase
        .from("profiles")
        .select("province")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("student_subjects").select("subject_name, mark").eq("profile_id", user.id),
    ]);

    province = profile?.province ?? null;

    const normalizedSubjects = (subjects ?? [])
      .filter((s) => typeof s.subject_name === "string" && typeof s.mark === "number")
      .map((s) => ({ name: s.subject_name as string, mark: s.mark as number }));

    aps = normalizedSubjects.length > 0 ? calculateAPS(normalizedSubjects) : 0;

    let query = supabase
      .from("bursaries")
      .select("id, title, provider, description, amount_per_year, minimum_aps, provinces_eligible, fields_of_study, requires_financial_need, application_url, closing_date, is_active, detail_page_url, application_links, funding_value, eligibility_requirements, application_instructions, source_category")
      .lte("minimum_aps", aps)
      .eq("is_active", true)
      .order("minimum_aps", { ascending: false });

    if (province) {
      query = query.or(
        `provinces_eligible.cs.{"${province}"},provinces_eligible.cs.{"All"}`
      );
    }

    const { data } = await query;
    bursaries = (data ?? []) as Record<string, unknown>[];
  } catch {
    // Gracefully render page even if upstream data is malformed or unavailable.
    bursaries = [];
  }

  let initialTracked: { bursary_id: string; bursary_name: string; status: "saved" | "applied"; updated_at: string }[] = [];
  try {
    const { data: tracked } = await supabase
      .from("bursary_applications")
      .select("bursary_id, bursary_name, status, updated_at")
      .eq("student_id", user.id);
    initialTracked = (tracked ?? []) as unknown as typeof initialTracked;
  } catch {
    initialTracked = [];
  }

  return (
    <BursariesClient
      bursaries={bursaries ?? []}
      aps={aps}
      province={province}
      userId={user.id}
      initialTracked={initialTracked}
    />
  );
}
