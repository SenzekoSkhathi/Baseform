import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateAPS } from "@/lib/aps/calculator";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = (await req.json()) as { message: string };
  if (!message?.trim()) {
    return Response.json({ error: "Message required" }, { status: 400 });
  }

  // Fetch student context to personalise the system prompt on the backend
  const [{ data: profile }, { data: subjects }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, province, field_of_interest")
      .eq("id", session.user.id)
      .maybeSingle(),
    supabase
      .from("student_subjects")
      .select("subject_name, mark")
      .eq("profile_id", session.user.id),
  ]);

  const aps = subjects?.length
    ? calculateAPS(subjects.map((s) => ({ name: s.subject_name, mark: s.mark })))
    : 0;

  const context: Record<string, string | number> = {};
  if (profile?.full_name) context.name = profile.full_name.split(" ")[0];
  if (aps > 0) context.aps = aps;
  if (profile?.field_of_interest) context.field = profile.field_of_interest;
  if (profile?.province) context.province = profile.province;

  const res = await fetch(`${BACKEND_URL}/ai/coach`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: message }],
      context,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Backend AI error:", err);
    return Response.json({ error: "AI service temporarily unavailable" }, { status: 502 });
  }

  const data = (await res.json()) as { reply?: string; error?: string };
  return Response.json({ response: data.reply ?? "" });
}
