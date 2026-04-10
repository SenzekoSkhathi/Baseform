/**
 * Gmail REST API client — no extra dependencies, pure fetch.
 * Handles token refresh, message search, and body extraction.
 */

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const TOKEN_URL  = "https://oauth2.googleapis.com/token";

export interface GmailMessage {
  id: string;
  threadId: string;
}

export interface GmailMessageDetail {
  id: string;
  internalDate: string;
  payload: GmailPayload;
}

interface GmailPayload {
  headers: { name: string; value: string }[];
  body: { data?: string };
  parts?: GmailPayload[];
  mimeType: string;
}

// ── Token refresh ────────────────────────────────────────────────────────────

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
}> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: refreshToken,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }

  return res.json();
}

// ── Message search ───────────────────────────────────────────────────────────

/**
 * Search the inbox using a Gmail query string.
 * Returns up to maxResults message stubs.
 */
export async function searchMessages(
  accessToken: string,
  query: string,
  maxResults = 50
): Promise<GmailMessage[]> {
  const params = new URLSearchParams({
    q:          query,
    maxResults: String(maxResults),
  });

  const res = await fetch(`${GMAIL_BASE}/messages?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail search failed: ${err}`);
  }

  const data = await res.json();
  return data.messages ?? [];
}

// ── Message detail ───────────────────────────────────────────────────────────

export async function getMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessageDetail> {
  const res = await fetch(`${GMAIL_BASE}/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail getMessage failed: ${err}`);
  }

  return res.json();
}

// ── Body extraction ──────────────────────────────────────────────────────────

/** Recursively extract plain-text body from a Gmail message payload. */
export function extractEmailBody(payload: GmailPayload): string {
  if (payload.mimeType === "text/plain" && payload.body.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }

  if (payload.parts) {
    // Prefer text/plain, fall back to text/html
    const plain = payload.parts.find((p) => p.mimeType === "text/plain");
    if (plain) return extractEmailBody(plain);

    const html = payload.parts.find((p) => p.mimeType === "text/html");
    if (html) return extractEmailBody(html);

    // Recurse into multipart containers
    for (const part of payload.parts) {
      const text = extractEmailBody(part);
      if (text) return text;
    }
  }

  return "";
}

/** Extract a specific header value from a message. */
export function getHeader(message: GmailMessageDetail, name: string): string {
  return (
    message.payload.headers.find(
      (h) => h.name.toLowerCase() === name.toLowerCase()
    )?.value ?? ""
  );
}

// ── User profile ─────────────────────────────────────────────────────────────

export async function getGmailUserEmail(accessToken: string): Promise<string> {
  const res = await fetch(`${GMAIL_BASE}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error("Could not fetch Gmail profile");

  const data = await res.json();
  return data.emailAddress ?? "";
}
