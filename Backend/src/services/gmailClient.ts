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

/**
 * Returns the current inbox historyId.
 * Store this on first connection so subsequent scans only process new messages.
 */
export async function getProfileHistoryId(accessToken: string): Promise<string> {
  const res = await fetch(`${GMAIL_BASE}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error("Could not fetch Gmail profile for historyId");

  const data = await res.json();
  if (!data.historyId) throw new Error("Gmail profile missing historyId");
  return String(data.historyId);
}

/**
 * Fetches message IDs added to the inbox since `startHistoryId`.
 * Returns the message IDs and the latest historyId to store for the next scan.
 *
 * Throws an error with `code: 404` if the historyId has expired (>30 days old)
 * — the caller should fall back to a subject/domain search in that case.
 */
export async function getMessagesSinceHistory(
  accessToken: string,
  startHistoryId: string
): Promise<{ messageIds: string[]; newHistoryId: string }> {
  const messageIds: string[] = [];
  let pageToken: string | undefined;
  let newHistoryId = startHistoryId;

  do {
    const params = new URLSearchParams({
      startHistoryId,
      historyTypes: "messageAdded",
      labelId: "INBOX",
      maxResults: "500",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${GMAIL_BASE}/history?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 404) {
      const err: Error & { code?: number } = new Error("historyId expired — fall back to search");
      err.code = 404;
      throw err;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gmail history fetch failed: ${text}`);
    }

    const data = await res.json();

    // Always capture the latest historyId, even if history array is empty
    if (data.historyId) newHistoryId = String(data.historyId);

    for (const entry of data.history ?? []) {
      for (const added of entry.messagesAdded ?? []) {
        if (added.message?.id) messageIds.push(added.message.id);
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return { messageIds, newHistoryId };
}

/**
 * Fetches only the From, Subject, and Date headers for a message.
 * ~10x lighter than a full getMessage call — use this to filter before fetching bodies.
 */
export async function getMessageMetadata(
  accessToken: string,
  messageId: string
): Promise<{ from: string; subject: string; internalDate: string | null }> {
  // Gmail API accepts repeated metadataHeaders params — build the query string manually
  const qs = `format=metadata&metadataHeaders=From&metadataHeaders=Subject`;

  const res = await fetch(`${GMAIL_BASE}/messages/${messageId}?${qs}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail getMessageMetadata failed: ${text}`);
  }

  const data = await res.json();
  const headers: { name: string; value: string }[] = data.payload?.headers ?? [];
  const get = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  return {
    from: get("From"),
    subject: get("Subject"),
    internalDate: data.internalDate ?? null,
  };
}
