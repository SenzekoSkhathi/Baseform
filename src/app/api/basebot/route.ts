import * as Sentry from "@sentry/nextjs";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateAPS } from "@/lib/aps/calculator";
import { isEffectivelyFreeTier } from "@/lib/access/tiers";
import { deductCredits } from "@/lib/credits";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";

type HistoryMessage = { role: "user" | "assistant"; content: string };
type Attachment = { type: "image" | "document"; mediaType: string; data: string; name?: string };

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const ALLOWED_DOC_TYPES = new Set(["application/pdf"]);
const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB per file

function sanitizeAttachments(raw: unknown): Attachment[] {
  if (!Array.isArray(raw)) return [];
  const out: Attachment[] = [];
  for (const item of raw.slice(0, MAX_ATTACHMENTS)) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;
    const type = a.type === "image" || a.type === "document" ? a.type : null;
    const mediaType = typeof a.mediaType === "string" ? a.mediaType : "";
    const data = typeof a.data === "string" ? a.data : "";
    const name = typeof a.name === "string" ? a.name.slice(0, 120) : undefined;
    if (!type || !mediaType || !data) continue;
    if (type === "image" && !ALLOWED_IMAGE_TYPES.has(mediaType)) continue;
    if (type === "document" && !ALLOWED_DOC_TYPES.has(mediaType)) continue;
    // base64 size estimate: 4 chars per 3 bytes
    const approxBytes = Math.floor((data.length * 3) / 4);
    if (approxBytes > MAX_ATTACHMENT_BYTES) continue;
    out.push({ type, mediaType, data, name });
  }
  return out;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profileTier } = await supabase
    .from("profiles")
    .select("tier, plan_expires_at")
    .eq("id", session.user.id)
    .maybeSingle();

  if (isEffectivelyFreeTier(profileTier?.tier, profileTier?.plan_expires_at)) {
    return Response.json({ error: "AI Coach is available on paid plans only." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });
  const { message, history, attachments: rawAttachments } = body as {
    message: string;
    history?: HistoryMessage[];
    attachments?: unknown;
  };

  if (!message?.trim()) {
    return Response.json({ error: "Message required" }, { status: 400 });
  }

  const attachments = sanitizeAttachments(rawAttachments);

  const { ok: credited } = await deductCredits(session.user.id, "basebot_message", "AI Coach message");
  if (!credited) {
    return Response.json(
      { error: "You've run out of Base Credits. Your allowance refills 7 days after your last top-up." },
      { status: 402 },
    );
  }

  // Fetch profile, subjects, and memories in parallel
  const [{ data: profile }, { data: subjects }, { data: memories }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, province, field_of_interest, grade_year, school_name, financial_need")
      .eq("id", session.user.id)
      .maybeSingle(),
    supabase
      .from("student_subjects")
      .select("subject_name, mark")
      .eq("profile_id", session.user.id),
    supabase
      .from("basebot_memory")
      .select("key, value, category")
      .eq("user_id", session.user.id)
      .order("updated_at", { ascending: false }),
  ]);

  const aps = subjects?.length
    ? calculateAPS(subjects.map((s) => ({ name: s.subject_name, mark: s.mark })))
    : 0;

  // Build full conversation: cap history at last 20 messages to control token usage
  const priorMessages: HistoryMessage[] = Array.isArray(history) ? history.slice(-20) : [];
  const messages: HistoryMessage[] = [...priorMessages, { role: "user", content: message }];

  const context: Record<string, unknown> = {};
  if (profile?.full_name) context.name = profile.full_name.split(" ")[0];
  if (aps > 0) context.aps = aps;
  if (profile?.field_of_interest) context.field = profile.field_of_interest;
  if (profile?.province) context.province = profile.province;
  if (profile?.grade_year) context.grade = profile.grade_year;
  if (profile?.grade_year === "Grade 11") context.mode = "planning";
  if (profile?.school_name) context.school = profile.school_name;
  if (profile?.financial_need) context.financialNeed = profile.financial_need;
  if (subjects?.length) context.subjects = subjects.map((s) => ({ subject: s.subject_name, mark: s.mark }));
  if (memories?.length) context.memories = memories;
  // Tells the system prompt whether this is the opening turn or a follow-up,
  // so the model can drop greetings and build on prior context.
  context.isFollowUp = priorMessages.length > 0;

  const res = await fetch(`${BACKEND_URL}/ai/coach`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ messages, context, attachments }),
  });

  if (!res.ok) {
    const err = await res.text();
    Sentry.captureException(new Error(err));
    return Response.json({ error: "AI service temporarily unavailable" }, { status: 502 });
  }

  const data = (await res.json()) as {
    reply?: string;
    error?: string;
    citations?: Array<{
      id: number;
      title: string;
      provider: string | null;
      funding_value: string | null;
      closing_date: string | null;
      detail_page_url: string | null;
      application_url: string | null;
      similarity: number;
    }>;
  };
  const replyText = data.reply ?? "";
  const citations = Array.isArray(data.citations) ? data.citations : [];

  // Fire-and-forget: extract new memory facts from this exchange
  void (async () => {
    try {
      const extractRes = await fetch(`${BACKEND_URL}/ai/extract-memory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_message: message, bot_reply: replyText }),
      });
      if (!extractRes.ok) return;
      const { facts } = (await extractRes.json()) as {
        facts?: Array<{ key: string; value: string; category: string }>;
      };
      if (!Array.isArray(facts) || facts.length === 0) return;
      const rows = facts.map((f) => ({
        user_id: session.user.id,
        key: f.key.slice(0, 100),
        value: f.value.slice(0, 200),
        category: f.category ?? "general",
        updated_at: new Date().toISOString(),
      }));
      await supabase.from("basebot_memory").upsert(rows, { onConflict: "user_id,key" });
    } catch {
      // Background task — failures are silent
    }
  })();

  return Response.json({ response: replyText, citations });
}
