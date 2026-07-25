import { Redis } from "@upstash/redis";
import { createLogger } from "./logger.js";

const log = createLogger("fixedWindowLimiter");

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

export const hasRedis = redis !== null;

if (!redis) {
  log.warn("Upstash env vars missing — fixed-window limits fall back to per-instance in-memory only");
}

/**
 * Redis-backed fixed window via INCR+EXPIRE: one round trip per call, atomic
 * on the Redis side, holds across Cloud Run instances and deploys. Returns
 * null (not "false") when Redis is unavailable so callers can fall back to
 * an in-memory check instead of failing closed or open by accident.
 */
export async function checkRedisWindow(
  key: string,
  windowMs: number,
  max: number
): Promise<boolean | null> {
  if (!redis) return null;

  const windowId = Math.floor(Date.now() / windowMs);
  const redisKey = `bf_rl:${key}:${windowId}`;

  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      // +1s of slack so the key never outlives its window by much but also
      // never expires mid-window due to clock skew.
      await redis.expire(redisKey, Math.ceil(windowMs / 1000) + 1);
    }
    return count <= max;
  } catch (err) {
    log.warn("redis check failed — falling back to in-memory", {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
