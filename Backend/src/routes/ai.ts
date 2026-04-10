import { Hono } from "hono";
import { requireAuth } from "../middleware/auth.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { geminiModel, GEMINI_SYSTEM_PROMPT } from "../lib/gemini.js";

const ai = new Hono();

ai.use("*", requireAuth);

/** Convert frontend message history to Gemini's Content[] format.
 *  Frontend uses role "assistant"; Gemini requires "model". */
function toGeminiHistory(messages: { role: string; content: string }[]) {
  return messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

function buildSystemPrompt(
  base: string,
  ctx: Record<string, string | number>
): string {
  if (Object.keys(ctx).length === 0) return base;
  const lines: string[] = [];
  if (ctx.name) lines.push(`Student name: ${ctx.name}`);
  if (ctx.aps) lines.push(`APS score: ${ctx.aps}/42`);
  if (ctx.field) lines.push(`Field of interest: ${ctx.field}`);
  if (ctx.province) lines.push(`Province: ${ctx.province}`);
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
  const studentContext: Record<string, string | number> = body.context ?? {};

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

  const systemPrompt = buildSystemPrompt(GEMINI_SYSTEM_PROMPT, studentContext);
  const history = toGeminiHistory(messages);
  const lastMessage = messages[messages.length - 1].content;

  try {
    const chat = geminiModel.startChat({
      systemInstruction: systemPrompt,
      history,
    });

    const result = await chat.sendMessage(lastMessage);
    const reply = result.response.text();
    const usage = result.response.usageMetadata;

    void supabaseAdmin
      .from("ai_coach_logs")
      .insert({
        student_id: user.id,
        input_tokens: usage?.promptTokenCount ?? 0,
        output_tokens: usage?.candidatesTokenCount ?? 0,
        model: "gemini-2.0-flash",
      });

    return ctx.json({
      reply,
      usage: {
        input_tokens: usage?.promptTokenCount ?? 0,
        output_tokens: usage?.candidatesTokenCount ?? 0,
      },
    });
  } catch (err) {
    console.error("Gemini API error:", err);
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
  const studentContext: Record<string, string | number> = body.context ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return ctx.json({ error: "messages array is required" }, 400);
  }

  const systemPrompt = buildSystemPrompt(GEMINI_SYSTEM_PROMPT, studentContext);
  const history = toGeminiHistory(messages);
  const lastMessage = messages[messages.length - 1].content;

  const chat = geminiModel.startChat({
    systemInstruction: systemPrompt,
    history,
  });

  return new Response(
    new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        try {
          const result = await chat.sendMessageStream(lastMessage);

          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }

          // Log usage after stream completes
          const finalResponse = await result.response;
          const usage = finalResponse.usageMetadata;
          void supabaseAdmin.from("ai_coach_logs").insert({
            student_id: user.id,
            input_tokens: usage?.promptTokenCount ?? 0,
            output_tokens: usage?.candidatesTokenCount ?? 0,
            model: "gemini-2.0-flash",
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          console.error("Gemini stream error:", err);
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

export default ai;
