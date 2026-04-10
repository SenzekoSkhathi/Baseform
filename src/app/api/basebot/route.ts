import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateAPS } from "@/lib/aps/calculator";

const BASE_SYSTEM_PROMPT = `You are BaseBot, an expert university admissions advisor for South African students.
You help Grade 12 learners understand their APS score, choose the right universities and programmes,
find bursaries they qualify for, and manage their application deadlines.

Key facts:
- APS uses a 7-point scale: 80%+=7, 70-79%=6, 60-69%=5, 50-59%=4, 40-49%=3, 30-39%=2, 0-29%=1
- Life Orientation is excluded from APS at all major SA universities
- Best 6 subjects are used for APS (excluding Life Orientation)
- Major SA universities: UCT, Stellenbosch (SU), CPUT, UWC, UP, WITS, UJ, UKZN, NWU, DUT, TUT

Tone: Friendly, encouraging, and practical. Give actionable advice. Keep responses concise.
If asked about unrelated topics, politely redirect to university applications.`;

function buildSystemPrompt(profile: {
  full_name: string | null;
  province: string | null;
  field_of_interest: string | null;
  school_name: string | null;
  grade_year: string | null;
} | null, aps: number, subjectLines: string): string {
  if (!profile) return BASE_SYSTEM_PROMPT;

  const name = profile.full_name?.split(" ")[0] ?? null;
  const contextLines: string[] = [];

  if (name) contextLines.push(`Student name: ${name}`);
  if (profile.grade_year) contextLines.push(`Current grade: ${profile.grade_year}`);
  if (profile.school_name) contextLines.push(`School: ${profile.school_name}`);
  if (profile.province) contextLines.push(`Province: ${profile.province}`);
  if (profile.field_of_interest) contextLines.push(`Field of interest: ${profile.field_of_interest}`);
  if (aps > 0) contextLines.push(`APS score: ${aps}`);
  if (subjectLines) contextLines.push(`Subjects:\n${subjectLines}`);

  if (contextLines.length === 0) return BASE_SYSTEM_PROMPT;

  return `${BASE_SYSTEM_PROMPT}

--- STUDENT PROFILE ---
${contextLines.join("\n")}
-----------------------
Always address the student by their first name when it feels natural. Tailor your advice to their APS, province, field of interest, and subject performance.`;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { message } = (await req.json()) as { message: string };
  if (!message?.trim()) return Response.json({ error: "Message required" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "AI not configured" }, { status: 500 });

  // Fetch user profile + subjects to personalise the system prompt
  const [{ data: profile }, { data: subjects }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, province, field_of_interest, school_name, grade_year")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("student_subjects")
      .select("subject_name, mark")
      .eq("profile_id", user.id),
  ]);

  const aps = subjects?.length
    ? calculateAPS(subjects.map((s) => ({ name: s.subject_name, mark: s.mark })))
    : 0;

  const subjectLines = (subjects ?? [])
    .sort((a, b) => b.mark - a.mark)
    .map((s) => `  - ${s.subject_name}: ${s.mark}%`)
    .join("\n");

  const systemPrompt = buildSystemPrompt(profile ?? null, aps, subjectLines);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Anthropic API error:", err);
    return Response.json({ error: "AI request failed" }, { status: 502 });
  }

  const data = await res.json();
  const response = data.content?.[0]?.text ?? "Sorry, I couldn't generate a response.";

  return Response.json({ response });
}
