"use strict";
/**
 * Claude-powered email status analyzer.
 * Reads a university email and returns a structured application status.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeEmail = analyzeEmail;
const ai_js_1 = require("./ai.js");
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
async function analyzeEmail(from, subject, body, universityName) {
    // Truncate body to avoid excessive token usage — first 2000 chars is enough
    const truncatedBody = body.slice(0, 2000);
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
    const message = await ai_js_1.anthropic.messages.create({
        model: ai_js_1.AI_MODEL,
        max_tokens: 200,
        system: SYSTEM,
        messages: [{ role: "user", content: userMessage }],
    });
    const raw = message.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
    try {
        const parsed = JSON.parse(raw);
        const validStatuses = [
            "in_progress", "submitted", "accepted", "rejected", "waitlisted", "unknown",
        ];
        if (!validStatuses.includes(parsed.status)) {
            parsed.status = "unknown";
        }
        return parsed;
    }
    catch {
        // Claude returned something unexpected — treat as unknown
        return { status: "unknown", confidence: "low", reason: "Could not parse AI response." };
    }
}
