import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { anthropic, AI_MODEL, SYSTEM_PROMPT } from "../lib/ai.js";

const ai = new Hono();

ai.use("*", requireAuth);

type Attachment = {
  type: "image" | "document";
  mediaType: string;
  data: string; // base64
  name?: string;
};

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const ALLOWED_DOC_TYPES = new Set(["application/pdf"]);

type ClaudeContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: string; data: string } };

function toClaudeMessages(
  messages: { role: string; content: string }[],
  lastUserAttachments: Attachment[],
) {
  return messages.map((m, idx) => {
    const isLastUserMessage = idx === messages.length - 1 && m.role === "user";
    if (!isLastUserMessage || lastUserAttachments.length === 0) {
      return { role: m.role as "user" | "assistant", content: m.content };
    }

    // Attach files only to the most recent user turn — historical turns keep
    // their text-only form so we don't re-upload the same file each turn.
    const blocks: ClaudeContentBlock[] = [];
    for (const att of lastUserAttachments) {
      if (att.type === "image" && ALLOWED_IMAGE_TYPES.has(att.mediaType)) {
        blocks.push({
          type: "image",
          source: { type: "base64", media_type: att.mediaType, data: att.data },
        });
      } else if (att.type === "document" && ALLOWED_DOC_TYPES.has(att.mediaType)) {
        blocks.push({
          type: "document",
          source: { type: "base64", media_type: att.mediaType, data: att.data },
        });
      }
    }
    blocks.push({ type: "text", text: m.content });

    return { role: "user" as const, content: blocks };
  });
}

type Memory = { key: string; value: string; category: string };
type Subject = { subject: string; mark: number };

function buildSystemPrompt(
  base: string,
  ctx: Record<string, unknown>
): string {
  const lines: string[] = [];
  if (ctx.name) lines.push(`Student name: ${ctx.name}`);
  if (ctx.grade) lines.push(`Grade: ${ctx.grade}`);
  if (ctx.school) lines.push(`School: ${ctx.school}`);
  if (ctx.province) lines.push(`Province: ${ctx.province}`);
  if (ctx.field) lines.push(`Field of interest: ${ctx.field}`);
  if (ctx.aps) lines.push(`APS score: ${ctx.aps}/42`);
  if (ctx.financialNeed) lines.push(`Financial need: ${ctx.financialNeed}`);
  if (ctx.mode === "planning") {
    lines.push(`Application stage: planning (Grade 11 — exploring options before final-year applications)`);
  }

  const subjects = ctx.subjects as Subject[] | undefined;
  if (Array.isArray(subjects) && subjects.length > 0) {
    const subjectLines = subjects.map((s) => `- ${s.subject}: ${s.mark}%`);
    lines.push(`\nSubjects and marks:\n${subjectLines.join("\n")}`);
  }

  const memories = ctx.memories as Memory[] | undefined;
  if (Array.isArray(memories) && memories.length > 0) {
    const memLines = memories.map(
      (m) => `- ${m.key.replace(/_/g, " ")}: ${m.value}`
    );
    lines.push(`\nWhat I remember about this student:\n${memLines.join("\n")}`);
  }

  // Conversation state drives the no-greeting / build-on-prior-context behaviour.
  const isFollowUp = Boolean(ctx.isFollowUp);
  lines.push(
    `\nConversation state: ${
      isFollowUp
        ? "FOLLOW-UP TURN. Do not greet. Do not say the student's name. Continue the conversation naturally and answer directly."
        : "FIRST TURN of this conversation. A short, warm opener is OK only if the student's message itself is a greeting; otherwise answer directly."
    }`,
  );

  return lines.length > 0
    ? `${base}\n\nStudent context:\n${lines.join("\n")}`
    : base;
}

/**
 * POST /ai/coach
 * Chat with the AI Coach. Sends a conversation and gets a reply.
 *
 * Body:
 *   - messages: { role: "user" | "assistant", content: string }[]
 *     Pass the full conversation history for multi-turn support.
 *   - context: { aps?: number, field?: string, name?: string } (optional)
 *     Student context injected into the system prompt.
 */
ai.post("/coach", async (ctx) => {
  const user = ctx.var.user;
  const body = await ctx.req.json();

  const messages: { role: string; content: string }[] = body.messages;
  const studentContext: Record<string, unknown> = body.context ?? {};
  const attachments: Attachment[] = Array.isArray(body.attachments) ? body.attachments.slice(0, 4) : [];

  if (!Array.isArray(messages) || messages.length === 0) {
    return ctx.json({ error: "messages array is required" }, 400);
  }

  for (const msg of messages) {
    if (!["user", "assistant"].includes(msg.role)) {
      return ctx.json({ error: "Each message must have role 'user' or 'assistant'" }, 400);
    }
    if (typeof msg.content !== "string" || !msg.content.trim()) {
      return ctx.json({ error: "Each message must have non-empty string content" }, 400);
    }
  }

  const systemPrompt = buildSystemPrompt(SYSTEM_PROMPT, studentContext);
  const claudeMessages = toClaudeMessages(messages, attachments);

  try {
    const result = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 900,
      system: systemPrompt,
      messages: claudeMessages,
    });

    const reply = result.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    const usage = result.usage;

    void supabaseAdmin
      .from("ai_coach_logs")
      .insert({
        student_id: user.id,
        input_tokens: usage?.input_tokens ?? 0,
        output_tokens: usage?.output_tokens ?? 0,
        model: AI_MODEL,
      });

    return ctx.json({
      reply,
      usage: {
        input_tokens: usage?.input_tokens ?? 0,
        output_tokens: usage?.output_tokens ?? 0,
      },
    });
  } catch (err) {
    console.error("Claude API error:", err);
    return ctx.json({ error: "AI service temporarily unavailable" }, 503);
  }
});

/**
 * POST /ai/coach/stream
 * Streaming version — returns a text/event-stream SSE response.
 * Same body shape as POST /ai/coach.
 */
ai.post("/coach/stream", async (ctx) => {
  const user = ctx.var.user;
  const body = await ctx.req.json();

  const messages: { role: string; content: string }[] = body.messages;
  const studentContext: Record<string, unknown> = body.context ?? {};
  const attachments: Attachment[] = Array.isArray(body.attachments) ? body.attachments.slice(0, 4) : [];

  if (!Array.isArray(messages) || messages.length === 0) {
    return ctx.json({ error: "messages array is required" }, 400);
  }

  for (const msg of messages) {
    if (!['user', 'assistant'].includes(msg.role)) {
      return ctx.json({ error: "Each message must have role 'user' or 'assistant'" }, 400);
    }
    if (typeof msg.content !== "string" || !msg.content.trim()) {
      return ctx.json({ error: "Each message must have non-empty string content" }, 400);
    }
  }

  const systemPrompt = buildSystemPrompt(SYSTEM_PROMPT, studentContext);
  const claudeMessages = toClaudeMessages(messages, attachments);

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let inputTokens = 0;
        let outputTokens = 0;

        try {
          const stream = await anthropic.messages.create({
            model: AI_MODEL,
            max_tokens: 900,
            system: systemPrompt,
            messages: claudeMessages,
            stream: true,
          });

          for await (const event of stream) {
            if (event.type === "message_start") {
              inputTokens = event.message.usage.input_tokens ?? inputTokens;
            }

            if (event.type === "message_delta") {
              outputTokens = event.usage.output_tokens ?? outputTokens;
            }

            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              const text = event.delta.text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }

          void supabaseAdmin.from("ai_coach_logs").insert({
            student_id: user.id,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            model: AI_MODEL,
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("Claude stream error:", err);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    }
  );
});

/**
 * POST /ai/extract-memory
 * Lightweight endpoint that extracts memorable facts from a single exchange.
 * Uses Haiku for speed/cost. Returns { facts: [{key, value, category}] }.
 */
ai.post("/extract-memory", async (ctx) => {
  const body = await ctx.req.json();
  const { user_message, bot_reply } = body as {
    user_message?: string;
    bot_reply?: string;
  };

  if (!user_message || !bot_reply) {
    return ctx.json({ facts: [] });
  }

  const extractionPrompt = `You extract facts about a student from their conversation with an AI university advisor.
Return ONLY a valid JSON array. Each element must have: {"key": "snake_case_key", "value": "string value", "category": "goal|applications|personal|academic|bursaries"}

Keys to extract (use these exact keys when applicable):
- career_goal: what they want to become, e.g. "doctor", "software engineer"
- target_university: universities they want to attend or are applying to
- target_programme: course or programme they're applying for
- school_name: their high school name
- home_city: where they live
- bursary_interest: bursaries they mentioned applying for
- application_deadline: specific deadlines they mentioned
- study_preference: full-time, part-time, or distance learning preference
- extracurricular: notable activities or achievements they shared

Rules:
- Only extract facts the STUDENT explicitly stated (not what the bot said)
- Use concise values, max 120 characters each
- Do NOT extract APS score, name, field of interest, or province — already in their profile
- Return [] if nothing new to extract

Student message: ${JSON.stringify(user_message)}
Bot reply: ${JSON.stringify(bot_reply)}

Return ONLY the JSON array, no other text:`;

  try {
    const result = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: extractionPrompt }],
    });

    const text = result.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return ctx.json({ facts: [] });

    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed)) return ctx.json({ facts: [] });

    const validCategories = ["goal", "applications", "personal", "academic", "bursaries"];
    const facts = (parsed as Array<Record<string, unknown>>)
      .filter((f) => typeof f.key === "string" && typeof f.value === "string" && f.key && f.value)
      .map((f) => ({
        key: String(f.key).toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 50),
        value: String(f.value).slice(0, 200),
        category: validCategories.includes(String(f.category)) ? String(f.category) : "general",
      }));

    return ctx.json({ facts });
  } catch (err) {
    console.error("Memory extraction error:", err);
    return ctx.json({ facts: [] });
  }
});

export default ai;
