import { createLogger } from "./logger.js";

const log = createLogger("retry");

type RetryOpts = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
};

const DEFAULT_RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504, 529]);

function isRetryable(err: unknown): boolean {
  if (err && typeof err === "object") {
    const e = err as { status?: number; statusCode?: number; code?: string };
    const status = e.status ?? e.statusCode;
    if (typeof status === "number" && DEFAULT_RETRYABLE_STATUS.has(status)) return true;
    if (e.code === "ECONNRESET" || e.code === "ETIMEDOUT" || e.code === "EAI_AGAIN") return true;
  }
  return false;
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOpts = {}): Promise<T> {
  const retries = opts.retries ?? 3;
  const base = opts.baseDelayMs ?? 400;
  const max = opts.maxDelayMs ?? 4000;
  const label = opts.label ?? "anthropic";

  let attempt = 0;
  let lastErr: unknown;

  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRetryable(err)) throw err;

      const expo = Math.min(max, base * 2 ** attempt);
      const jitter = Math.random() * expo * 0.25;
      const delay = Math.floor(expo + jitter);
      log.warn(`${label} attempt ${attempt + 1} failed; retrying in ${delay}ms`, {
        error: err instanceof Error ? err.message : String(err),
      });
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    }
  }

  throw lastErr;
}
