import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { anthropic, AI_MODEL, SYSTEM_PROMPT } from "../lib/ai.js";
import { withRetry } from "../lib/retry.js";
import { redactPII } from "../lib/redact.js";
import { recordUsage } from "../lib/aiUsageLog.js";
import { createLogger } from "../lib/logger.js";

const log = createLogger("ai-route");
const ai = new Hono();

ai.use("*", requireAuth);

type ImageMediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";
type DocumentMediaType = "application/pdf";

type Attachment = {
  type: "image" | "document";
  mediaType: string;
  data: string; // base64
  name?: string;
};

const ALLOWED_IMAGE_TYPES = new Set<ImageMediaType>(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const ALLOWED_DOC_TYPES = new Set<DocumentMediaType>(["application/pdf"]);

// Run lightweight memory extraction roughly every Nth assistant turn instead
// of every turn — halves Anthropic spend on chat without hurting recall.
const MEMORY_EXTRACTION_EVERY_N_TURNS = 3;

function isImageMediaType(value: string): value is ImageMediaType {
  return (ALLOWED_IMAGE_TYPES as Set<string>).has(value);
}

function isDocumentMediaType(value: string): value is DocumentMediaType {
  return (ALLOWED_DOC_TYPES as Set<string>).has(value);
}

type ClaudeContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: ImageMediaType; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: DocumentMediaType; data: string } };

function toClaudeMessages(
  messages: { role: string; content: string }[],
  lastUserAttachments: Attachment[],
) {
  return messages.map((m, idx) => {
    const isLastUserMessage = idx === messages.length - 1 && m.role === "user";
    // Redact PII from free-form user text (not from attachments — those are
    // intentionally part of the product surface).
    const safeContent = m.role === "user" ? redactPII(m.content) : m.content;

    if (!isLastUserMessage || lastUserAttachments.length === 0) {
      return { role: m.role as "user" | "assistant", content: safeContent };
    }

    const blocks: ClaudeContentBlock[] = [];
    for (const att of lastUserAttachments) {
      if (att.type === "image" && isImageMediaType(att.mediaType)) {
        blocks.push({
          type: "image",
          source: { type: "base64", media_type: att.mediaType, data: att.data },
        });
      } else if (att.type === "document" && isDocumentMediaType(att.mediaType)) {
        blocks.push({
          type: "document",
          source: { type: "base64", media_type: att.mediaType, data: att.data },
        });
      }
    }
    blocks.push({ type: "text", text: safeContent });

    return { role: "user" as const, content: blocks };
  });
}

type Memory = { key: string; value: string; category: string };
type Subject = { subject: string; mark: number };

/**
 * Builds the system prompt as a TWO-BLOCK array so we can attach
 * cache_control to the large stable block.
 *
 * Block 1: SYSTEM_PROMPT (large, identity + product knowledge) — CACHED.
 *          Anthropic charges 25% extra on first write but 10% on reads, so
 *          this saves ~80% on input cost from turn 2 onwards.
 * Block 2: per-student dynamic context (name, marks, memories) — NOT cached.
 */
function buildSystemBlocks(ctx: Record<string, unknown>) {
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
    const memLines = memories.map((m) => `- ${m.key.replace(/_/g, " ")}: ${m.value}`);
    lines.push(`\nWhat I remember about this student:\n${memLines.join("\n")}`);
  }

  const isFollowUp = Boolean(ctx.isFollowUp);
  lines.push(
    `\nConversation state: ${
      isFollowUp
        ? "FOLLOW-UP TURN. Do not greet. Do not say the student's name. Continue the conversation naturally and answer directly."
        : "FIRST TURN of this conversation. A short, warm opener is OK only if the student's message itself is a greeting; otherwise answer directly."
    }`,
  );

  const dynamic = lines.length > 0 ? `Student context:\n${lines.join("\n")}` : "";

  return [
    {
      type: "text" as const,
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" as const },
    },
    ...(dynamic ? [{ type: "text" as const, text: dynamic }] : []),
  ];
}

function validateMessages(messages: unknown): { ok: true; messages: { role: string; content: string }[] } | { ok: false; error: string } {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "messages array is required" };
  }
  for (const msg of messages) {
    if (!msg || typeof msg !== "object") {
      return { ok: false, error: "Each message must be an object" };
    }
    const m = msg as { role?: unknown; content?: unknown };
    if (m.role !== "user" && m.role !== "assistant") {
      return { ok: false, error: "Each message must have role 'user' or 'assistant'" };
    }
    if (typeof m.content !== "string" || !m.content.trim()) {
      return { ok: false, error: "Each message must have non-empty string content" };
    }
  }
  return { ok: true, messages: messages as { role: string; content: string }[] };
}

/**
 * POST /ai/coach
 * Non-streaming chat with the AI Coach.
 */
ai.post("/coach", async (ctx) => {
  const user = ctx.var.user;
  const body = await ctx.req.json();

  const validated = validateMessages(body.messages);
  if (!validated.ok) return ctx.json({ error: validated.error }, 400);

  const studentContext: Record<string, unknown> = body.context ?? {};
  const attachments: Attachment[] = Array.isArray(body.attachments) ? body.attachments.slice(0, 4) : [];

  const systemBlocks = buildSystemBlocks(studentContext);
  const claudeMessages = toClaudeMessages(validated.messages, attachments);

  try {
    const result = await withRetry(
      () =>
        anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 900,
          system: systemBlocks,
          messages: claudeMessages,
        }),
      { label: "anthropic.coach" }
    );

    const reply = result.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    const usage = result.usage;

    void recordUsage({
      student_id: user.id,
      input_tokens: usage?.input_tokens ?? 0,
      output_tokens: usage?.output_tokens ?? 0,
      cache_read_input_tokens: usage?.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: usage?.cache_creation_input_tokens ?? 0,
      model: AI_MODEL,
    });

    return ctx.json({
      reply,
      usage: {
        input_tokens: usage?.input_tokens ?? 0,
        output_tokens: usage?.output_tokens ?? 0,
        cache_read_input_tokens: usage?.cache_read_input_tokens ?? 0,
        cache_creation_input_tokens: usage?.cache_creation_input_tokens ?? 0,
      },
    });
  } catch (err) {
    log.error("Claude API error after retries", {
      error: err instanceof Error ? err.message : String(err),
    });
    return ctx.json({ error: "AI service temporarily unavailable" }, 503);
  }
});

/**
 * POST /ai/coach/stream
 * SSE streaming version. Sends a `:` heartbeat every 15s so proxies don't
 * close idle connections and the client can detect a stall.
 */
ai.post("/coach/stream", async (ctx) => {
  const user = ctx.var.user;
  const body = await ctx.req.json();

  const validated = validateMessages(body.messages);
  if (!validated.ok) return ctx.json({ error: validated.error }, 400);

  const studentContext: Record<string, unknown> = body.context ?? {};
  const attachments: Attachment[] = Array.isArray(body.attachments) ? body.attachments.slice(0, 4) : [];

  const systemBlocks = buildSystemBlocks(studentContext);
  const claudeMessages = toClaudeMessages(validated.messages, attachments);

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let inputTokens = 0;
        let outputTokens = 0;
        let cacheReadTokens = 0;
        let cacheCreationTokens = 0;
        let closed = false;

        // SSE comment heartbeat — keeps the connection warm through proxies
        // and lets the client see "still alive" frames even mid-thinking.
        const heartbeat = setInterval(() => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            /* controller already closed */
          }
        }, 15_000);

        try {
          const stream = await withRetry(
            () =>
              anthropic.messages.create({
                model: AI_MODEL,
                max_tokens: 900,
                system: systemBlocks,
                messages: claudeMessages,
                stream: true,
              }),
            { label: "anthropic.coach.stream" }
          );

          for await (const event of stream) {
            if (event.type === "message_start") {
              const u = event.message.usage;
              inputTokens = u.input_tokens ?? inputTokens;
              cacheReadTokens = u.cache_read_input_tokens ?? cacheReadTokens;
              cacheCreationTokens = u.cache_creation_input_tokens ?? cacheCreationTokens;
            }

            if (event.type === "message_delta") {
              outputTokens = event.usage.output_tokens ?? outputTokens;
            }

            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              const text = event.delta.text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }

          void recordUsage({
            student_id: user.id,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cache_read_input_tokens: cacheReadTokens,
            cache_creation_input_tokens: cacheCreationTokens,
            model: AI_MODEL,
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          log.error("Claude stream error", {
            error: err instanceof Error ? err.message : String(err),
          });
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`)
          );
        } finally {
          closed = true;
          clearInterval(heartbeat);
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
 * Extracts durable facts from a student/bot exchange. Throttled so we only
 * call Claude every Nth turn (driven by the client passing `turn_index`),
 * cutting Anthropic spend on this side-channel by ~66%.
 */
ai.post("/extract-memory", async (ctx) => {
  const body = await ctx.req.json();
  const { user_message, bot_reply, turn_index } = body as {
    user_message?: string;
    bot_reply?: string;
    turn_index?: number;
  };

  if (!user_message || !bot_reply) {
    return ctx.json({ facts: [] });
  }

  // If the client passes a turn index, only run extraction periodically.
  // (turn_index is the 0-based assistant turn count.)
  if (typeof turn_index === "number" && turn_index % MEMORY_EXTRACTION_EVERY_N_TURNS !== 0) {
    return ctx.json({ facts: [], skipped: true });
  }

  const safeUser = redactPII(user_message);
  const safeBot = redactPII(bot_reply);

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

Student message: ${JSON.stringify(safeUser)}
Bot reply: ${JSON.stringify(safeBot)}

Return ONLY the JSON array, no other text:`;

  try {
    const result = await withRetry(
      () =>
        anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
          messages: [{ role: "user", content: extractionPrompt }],
        }),
      { label: "anthropic.extract-memory" }
    );

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
    log.error("Memory extraction error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return ctx.json({ facts: [] });
  }
});

export default ai;
