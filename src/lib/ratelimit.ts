import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---------------------------------------------------------------------------
// Rate limiters — one Redis client shared across all limiters.
//
// Required env vars (add to Vercel + .env.local):
//   UPSTASH_REDIS_REST_URL   — from Upstash console → Redis → REST API
//   UPSTASH_REDIS_REST_TOKEN — from Upstash console → Redis → REST API
//
// Tiers:
//   strict   — public write endpoints (waitlist, signup)     10 req / 1 min
//   standard — authenticated API routes                      60 req / 1 min
//   ai       — AI/expensive endpoints (basebot)              10 req / 1 min
// ---------------------------------------------------------------------------

function makeRedis() {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  return new Redis({ url, token });
}

const redis = makeRedis();

function makeLimiter(requests: number, window: `${number} ${"s" | "m" | "h" | "d"}`) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: false,
    prefix: "bf_rl",
  });
}

export const strictLimiter   = makeLimiter(10,  "1 m"); // 10  req / min
export const standardLimiter = makeLimiter(60,  "1 m"); // 60  req / min
export const aiLimiter       = makeLimiter(10,  "1 m"); // 10  req / min

/**
 * Returns { limited: true } when the identifier has exceeded its quota,
 * { limited: false } when the request is allowed.
 *
 * If the Redis client is unavailable (env vars missing) the check is skipped —
 * the request is always allowed. This prevents rate-limiting from becoming a
 * hard deployment dependency.
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<{ limited: boolean; remaining?: number }> {
  if (!limiter) return { limited: false };

  const { success, remaining } = await limiter.limit(identifier);
  return { limited: !success, remaining };
}
