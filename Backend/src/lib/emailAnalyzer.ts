/**
 * Claude-powered email status analyzer.
 * Reads a university email and returns a structured application status.
 */

import { createHash } from "node:crypto";
import { anthropic } from "./ai.js";
import { withRetry } from "./retry.js";
import { cache } from "./cache.js";
import { createLogger } from "./logger.js";

const log = createLogger("email-analyzer");

// Haiku is ~50x cheaper than Sonnet and sufficient for structured email classification.
// Never use the shared AI_MODEL constant here — email analysis must stay on Haiku.
const EMAIL_MODEL = "claude-haiku-4-5-20251001";
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days — emails are immutable once received.

export type DetectedStatus =
  | "in_progress"
  | "submitted"
  | "accepted"
  | "rejected"
  | "waitlisted"
  | "unknown";

export interface EmailAnalysisResult {
  status: DetectedStatus;
  confidence: "high" | "medium" | "low";
  reason: string;
}

const SYSTEM = `You are an expert at reading university application emails for South African students.
Given an email, you determine the current status of the student's application.
You MUST respond with valid JSON only — no markdown, no explanation outside the JSON.`;

const STATUS_GUIDE = `
Status definitions:
- "in_progress"  : Application received/opened/being reviewed/documents requested
- "submitted"    : Application fully submitted/complete/finalised
- "accepted"     : Offer of admission/acceptance letter
- "rejected"     : Unsuccessful/not accepted/application declined
- "waitlisted"   : Reserve list/waitlist/alternative offer pending space
- "unknown"      : Email is not clearly about an application status (e.g. newsletter, generic info)
`.trim();

const VALID_STATUSES: DetectedStatus[] = [
  "in_progress", "submitted", "accepted", "rejected", "waitlisted", "unknown",
];

function cacheKeyFor(from: string, subject: string, body: string, universityName: string): string {
  // sha256 of the canonical content — same email always → same key.
  const h = createHash("sha256");
  h.update(universityName + "\n" + from + "\n" + subject + "\n" + body.slice(0, 2000));
  return `email-analysis:v1:${h.digest("hex")}`;
}

export async function analyzeEmail(
  from: string,
  subject: string,
  body: string,
  universityName: string
): Promise<EmailAnalysisResult> {
  const truncatedBody = body.slice(0, 2000);
  const cacheKey = cacheKeyFor(from, subject, truncatedBody, universityName);

  const cached = await cache.get<EmailAnalysisResult>(cacheKey);
  if (cached && VALID_STATUSES.includes(cached.status)) {
    return cached;
  }

  const userMessage = `
University: ${universityName}
From: ${from}
Subject: ${subject}

Email body:
${truncatedBody}

${STATUS_GUIDE}

Return JSON in exactly this shape:
{
  "status": "<one of: in_progress | submitted | accepted | rejected | waitlisted | unknown>",
  "confidence": "<high | medium | low>",
  "reason": "<one sentence explaining your decision>"
}`.trim();

  let result: EmailAnalysisResult;
  try {
    const message = await withRetry(
      () =>
        anthropic.messages.create({
          model: EMAIL_MODEL,
          max_tokens: 200,
          system: SYSTEM,
          messages: [{ role: "user", content: userMessage }],
        }),
      { label: "anthropic.analyzeEmail" }
    );

    const raw = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    const parsed = JSON.parse(raw) as EmailAnalysisResult;
    if (!VALID_STATUSES.includes(parsed.status)) parsed.status = "unknown";
    result = parsed;
  } catch (err) {
    log.warn("Falling back to unknown status", {
      error: err instanceof Error ? err.message : String(err),
    });
    result = { status: "unknown", confidence: "low", reason: "Could not parse AI response." };
  }

  // Cache the result (even "unknown" — saves a re-analysis on retries of
  // genuinely ambiguous emails).
  await cache.set(cacheKey, result, CACHE_TTL_SECONDS);

  return result;
}
