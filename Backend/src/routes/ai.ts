import { Hono } from "hono";
import type { MessageParam, Tool, ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { requireAuth } from "../middleware/auth.js";
import { anthropic, AI_MODEL, SYSTEM_PROMPT } from "../lib/ai.js";
import { withRetry } from "../lib/retry.js";
import { redactPII } from "../lib/redact.js";
import { recordUsage } from "../lib/aiUsageLog.js";
import { createLogger } from "../lib/logger.js";
import { searchBursaries, type BursaryHit } from "../lib/bursarySearch.js";

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

// ── Tool definitions ────────────────────────────────────────────────────────
//
// search_bursaries: lets BaseBot retrieve real bursary records from the
// pgvector layer instead of reciting from prompt memory. The model decides
// when to invoke it; we cap iterations at MAX_TOOL_LOOPS to avoid runaways.

const MAX_TOOL_LOOPS = 3;

const BURSARY_TOOL: Tool = {
  name: "search_bursaries",
  description:
    "Search the Baseform bursary database for South African bursaries that match a student's question. " +
    "Use this whenever the student asks about specific bursaries, eligibility for funding, who funds a particular field of study, or 'find me bursaries for X'. " +
    "Do NOT use it for generic APS / university / motivation-letter questions. " +
    "Returns the top matching bursaries with funding amount, eligibility, closing date, and an application URL the student can cite. " +
    "Search is keyword-based (Postgres full-text search), so the `query` argument should be the most specific terms a bursary listing would actually contain — provider names, fields of study, course names, eligibility phrases. " +
    "If the student says 'I want to be a doctor', search for 'medicine MBChB health sciences', not 'doctor'. " +
    "If they say 'I'm broke', search for 'financial need disadvantaged background'. " +
    "Always expand vague terms into the precise vocabulary a bursary description would use.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Space-separated search keywords. Prefer specific vocabulary that bursary listings actually use (e.g. 'engineering chemical mining', 'medicine MBChB health sciences', 'accounting CA chartered'). Multiple keywords increase recall.",
      },
      province: {
        type: "string",
        description: "Optional province filter (e.g. 'Gauteng', 'Western Cape'). Only set if the student explicitly cares about a province.",
      },
      field: {
        type: "string",
        description: "Optional field-of-study filter (e.g. 'Engineering', 'Health Sciences'). Only set if the student is asking about a specific field.",
      },
    },
    required: ["query"],
  },
};

const TOOLS: Tool[] = [BURSARY_TOOL];

async function runTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  if (name === "search_bursaries") {
    const query = typeof input.query === "string" ? input.query : "";
    const province = typeof input.province === "string" ? input.province : undefined;
    const field = typeof input.field === "string" ? input.field : undefined;
    const hits = await searchBursaries(query, { province, field, matchCount: 5 });
    // Strip embedding-only fields and keep what's useful for both Claude's
    // reasoning and the citation card the frontend renders.
    return hits.map((h) => ({
      id: h.id,
      title: h.title,
      provider: h.provider,
      funding_value: h.funding_value,
      amount_per_year: h.amount_per_year,
      minimum_aps: h.minimum_aps,
      requires_financial_need: undefined, // not selected by RPC
      closing_date: h.closing_date,
      detail_page_url: h.detail_page_url,
      application_url: h.application_url,
      eligibility_requirements: h.eligibility_requirements,
      fields_of_study: h.fields_of_study,
      provinces_eligible: h.provinces_eligible,
      similarity: Math.round(h.similarity * 100) / 100,
    }));
  }
  throw new Error(`Unknown tool: ${name}`);
}

/**
 * POST /ai/coach
 * Non-streaming chat with the AI Coach. Loops on tool calls so the model can
 * call search_bursaries and ground its answer in real DB rows. Returns any
 * citation hits alongside the reply so the UI can render bursary cards.
 */
ai.post("/coach", async (ctx) => {
  const user = ctx.var.user;
  const body = await ctx.req.json();

  const validated = validateMessages(body.messages);
  if (!validated.ok) return ctx.json({ error: validated.error }, 400);

  const studentContext: Record<string, unknown> = body.context ?? {};
  const attachments: Attachment[] = Array.isArray(body.attachments) ? body.attachments.slice(0, 4) : [];

  const systemBlocks = buildSystemBlocks(studentContext);
  const conversation: MessageParam[] = toClaudeMessages(validated.messages, attachments) as MessageParam[];

  // Citations accumulated across tool calls in this turn — surfaced to the
  // frontend so the UI can render bursary cards under the bot reply.
  const citations: BursaryHit[] = [];
  const seenIds = new Set<number>();

  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheRead = 0;
  let totalCacheCreate = 0;

  try {
    for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
      const result = await withRetry(
        () =>
          anthropic.messages.create({
            model: AI_MODEL,
            max_tokens: 900,
            system: systemBlocks,
            tools: TOOLS,
            messages: conversation,
          }),
        { label: "anthropic.coach" }
      );

      const u = result.usage;
      totalInput += u?.input_tokens ?? 0;
      totalOutput += u?.output_tokens ?? 0;
      totalCacheRead += u?.cache_read_input_tokens ?? 0;
      totalCacheCreate += u?.cache_creation_input_tokens ?? 0;

      // Append the assistant turn (text + any tool_use blocks) to the conversation.
      conversation.push({ role: "assistant", content: result.content });

      // If the model didn't call any tools, we're done.
      if (result.stop_reason !== "tool_use") {
        const reply = result.content
          .filter((b) => b.type === "text")
          .map((b) => (b.type === "text" ? b.text : ""))
          .join("\n")
          .trim();

        void recordUsage({
          student_id: user.id,
          input_tokens: totalInput,
          output_tokens: totalOutput,
          cache_read_input_tokens: totalCacheRead,
          cache_creation_input_tokens: totalCacheCreate,
          model: AI_MODEL,
        });

        return ctx.json({
          reply,
          citations,
          usage: {
            input_tokens: totalInput,
            output_tokens: totalOutput,
            cache_read_input_tokens: totalCacheRead,
            cache_creation_input_tokens: totalCacheCreate,
          },
        });
      }

      // Execute every tool_use block and feed results back as a single user turn.
      const toolResults: ContentBlockParam[] = [];
      for (const block of result.content) {
        if (block.type !== "tool_use") continue;
        try {
          const out = await runTool(block.name, block.input as Record<string, unknown>);
          if (block.name === "search_bursaries" && Array.isArray(out)) {
            for (const h of out as BursaryHit[]) {
              if (!seenIds.has(h.id)) {
                seenIds.add(h.id);
                citations.push(h);
              }
            }
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(out),
          });
        } catch (err) {
          log.warn("Tool execution failed", {
            tool: block.name,
            error: err instanceof Error ? err.message : String(err),
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: "Tool error — continue without these results.",
            is_error: true,
          });
        }
      }
      conversation.push({ role: "user", content: toolResults });
    }

    // Hit the loop cap. Force a final, no-tools call so the model summarises
    // what it has gathered so far instead of leaving the user hanging.
    const final = await withRetry(
      () =>
        anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 900,
          system: systemBlocks,
          messages: conversation,
        }),
      { label: "anthropic.coach.final" }
    );
    totalInput += final.usage?.input_tokens ?? 0;
    totalOutput += final.usage?.output_tokens ?? 0;
    totalCacheRead += final.usage?.cache_read_input_tokens ?? 0;
    totalCacheCreate += final.usage?.cache_creation_input_tokens ?? 0;

    const reply = final.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();

    void recordUsage({
      student_id: user.id,
      input_tokens: totalInput,
      output_tokens: totalOutput,
      cache_read_input_tokens: totalCacheRead,
      cache_creation_input_tokens: totalCacheCreate,
      model: AI_MODEL,
    });

    return ctx.json({
      reply,
      citations,
      usage: {
        input_tokens: totalInput,
        output_tokens: totalOutput,
        cache_read_input_tokens: totalCacheRead,
        cache_creation_input_tokens: totalCacheCreate,
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
