import { Hono } from "hono";
import { anthropic, AI_MODEL } from "../lib/ai.js";
import { withRetry } from "../lib/retry.js";
import { redactPII } from "../lib/redact.js";
import { createLogger } from "../lib/logger.js";

const log = createLogger("ai-public");
const aiPublic = new Hono();

const PUBLIC_SYSTEM_PROMPT = `You are BaseBot, the public demo of Baseform's AI Coach — an expert university admissions advisor for South African students.

This is a free, anonymous demo on the Baseform marketing site. The visitor is not signed in. You have no access to their marks, profile, or documents — only the single message they just typed.

Your job in this demo:
- Give a short, useful answer (max ~180 words) that proves Baseform is helpful.
- Be specific to South African matric / university / NSFAS / bursary context.
- If the question needs more info (e.g. their actual marks, subjects, financial situation), answer with a useful general response and then invite them to sign up free for a personalised plan.
- Never invent specific bursary names, amounts, deadlines, or APS cut-offs you aren't sure of. It's better to describe the *kind* of programme/bursary that fits than to fabricate a name.
- Use plain prose with at most one short bullet list. No markdown tables. No emojis.
- Friendly, encouraging, practical. Speak directly with "you".
- Do not greet by name — you don't know it.
- Never ask for personal data like ID number, contact details, or passwords.

Key facts:
- APS uses a 7-point scale: 80%+=7, 70-79=6, 60-69=5, 50-59=4, 40-49=3, 30-39=2, 0-29=1.
- Life Orientation is excluded from APS. Best 6 other subjects count.
- South Africa has 26 public universities. NSFAS funds learners from households earning under R350k.

If the message is unrelated to careers / studies / applications / bursaries / matric, politely redirect to your area.`;

const DAILY_LIMIT = 8;
const dailyBuckets = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of dailyBuckets) {
    if (now > bucket.resetAt) dailyBuckets.delete(key);
  }
}, 10 * 60_000).unref();

function getIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkDailyLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = dailyBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    dailyBuckets.set(ip, { count: 1, resetAt: now + 24 * 60 * 60_000 });
    return true;
  }
  if (bucket.count >= DAILY_LIMIT) return false;
  bucket.count++;
  return true;
}

aiPublic.post("/coach", async (ctx) => {
  const ip = getIp(ctx.req.raw.headers);

  if (!checkDailyLimit(ip)) {
    return ctx.json(
      { error: "You've used the free demo for today. Sign up to keep going — it's free." },
      429,
    );
  }

  const body = await ctx.req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message) return ctx.json({ error: "Message required" }, 400);
  if (message.length > 500) {
    return ctx.json({ error: "Demo messages are capped at 500 characters." }, 400);
  }

  try {
    const result = await withRetry(
      () =>
        anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 380,
          system: PUBLIC_SYSTEM_PROMPT,
          messages: [{ role: "user", content: redactPII(message) }],
        }),
      { label: "anthropic.public-coach" },
    );

    const reply = result.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n")
      .trim();

    return ctx.json({ reply });
  } catch (err) {
    log.error("public coach failed", { err: err instanceof Error ? err.message : String(err) });
    return ctx.json({ error: "AI is busy right now. Try again in a moment." }, 502);
  }
});

export default aiPublic;
