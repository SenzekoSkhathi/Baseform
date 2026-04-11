"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hono_1 = require("hono");
const auth_js_1 = require("../middleware/auth.js");
const supabase_js_1 = require("../lib/supabase.js");
const ai_js_1 = require("../lib/ai.js");
const ai = new hono_1.Hono();
ai.use("*", auth_js_1.requireAuth);
function toClaudeMessages(messages) {
    return messages.map((m) => ({
        role: m.role,
        content: m.content,
    }));
}
function buildSystemPrompt(base, ctx) {
    if (Object.keys(ctx).length === 0)
        return base;
    const lines = [];
    if (ctx.name)
        lines.push(`Student name: ${ctx.name}`);
    if (ctx.aps)
        lines.push(`APS score: ${ctx.aps}/42`);
    if (ctx.field)
        lines.push(`Field of interest: ${ctx.field}`);
    if (ctx.province)
        lines.push(`Province: ${ctx.province}`);
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
    const messages = body.messages;
    const studentContext = body.context ?? {};
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
    const systemPrompt = buildSystemPrompt(ai_js_1.SYSTEM_PROMPT, studentContext);
    const claudeMessages = toClaudeMessages(messages);
    try {
        const result = await ai_js_1.anthropic.messages.create({
            model: ai_js_1.AI_MODEL,
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
        void supabase_js_1.supabaseAdmin
            .from("ai_coach_logs")
            .insert({
            student_id: user.id,
            input_tokens: usage?.input_tokens ?? 0,
            output_tokens: usage?.output_tokens ?? 0,
            model: ai_js_1.AI_MODEL,
        });
        return ctx.json({
            reply,
            usage: {
                input_tokens: usage?.input_tokens ?? 0,
                output_tokens: usage?.output_tokens ?? 0,
            },
        });
    }
    catch (err) {
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
    const messages = body.messages;
    const studentContext = body.context ?? {};
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
    const systemPrompt = buildSystemPrompt(ai_js_1.SYSTEM_PROMPT, studentContext);
    const claudeMessages = toClaudeMessages(messages);
    return new Response(new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            let inputTokens = 0;
            let outputTokens = 0;
            try {
                const stream = await ai_js_1.anthropic.messages.create({
                    model: ai_js_1.AI_MODEL,
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
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                    }
                }
                void supabase_js_1.supabaseAdmin.from("ai_coach_logs").insert({
                    student_id: user.id,
                    input_tokens: inputTokens,
                    output_tokens: outputTokens,
                    model: ai_js_1.AI_MODEL,
                });
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            }
            catch (err) {
                console.error("Claude stream error:", err);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`));
            }
            finally {
                controller.close();
            }
        },
    }), {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
});
exports.default = ai;
