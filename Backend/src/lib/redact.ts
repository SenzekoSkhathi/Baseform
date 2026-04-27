/**
 * Lightweight PII redaction for chat text before it is sent to Anthropic.
 * Attachments (transcripts, IDs) are intentionally NOT redacted — they are
 * part of the product surface (the AI must read them to advise the student).
 * This only redacts free-form text the student types into the chat box.
 */

// `\b` doesn't anchor against `+`, so SA phone uses (?<![\w+]) / (?![\w]) lookarounds.
const SA_ID_RE = /\b\d{13}\b/g;
const SA_PHONE_RE = /(?<![\w+])(?:\+27|0)(?:\d[\s-]?){8,9}\d(?!\w)/g;
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
// 13–19 digits, separators allowed BETWEEN digits only (not trailing).
const CARD_RE = /\b\d(?:[ -]?\d){12,18}\b/g;

export function redactPII(text: string): string {
  if (!text) return text;
  // Order matters: SA ID (13 digits, no separators) is a strict subset of the
  // card regex (13–19 digits with optional separators), so redact IDs first.
  return text
    .replace(SA_ID_RE, "[sa-id-redacted]")
    .replace(CARD_RE, "[card-number-redacted]")
    .replace(SA_PHONE_RE, "[phone-redacted]")
    .replace(EMAIL_RE, "[email-redacted]");
}
