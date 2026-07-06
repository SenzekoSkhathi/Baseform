import type { Context, Next } from "hono";
import { Redis } from "@upstash/redis";
import { createLogger } from "../lib/logger.js";

const log = createLogger("rateLimit");

type BucketConfig = {
  windowMs: number;
  max: number;
};

const DEFAULT: BucketConfig = { windowMs: 60_000, max: 120 };
const AI: BucketConfig = { windowMs: 60_000, max: 15 };

// ── In-memory buckets ────────────────────────────────────────────────────────
// Per-instance only: on Cloud Run the effective limit multiplies by instance
// count and resets on deploy. Good enough for the loose default tier (and as
// the fallback when Redis is down), since a Redis round trip on every request
// would add latency for all users.

// ip:route_prefix → { count, resetAt }
const buckets = new Map<string, { count: number; resetAt: number }>();

// Prune stale entries every 5 minutes so the map doesn't grow indefinitely.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 5 * 60_000).unref();

function checkMemory(key: string, config: BucketConfig): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return true;
  }

  if (bucket.count >= config.max) return false;

  bucket.count++;
  return true;
}

// ── Redis-backed fixed window ────────────────────────────────────────────────
// Used for the AI tier so the limit holds across instances and deploys —
// these routes spend real money per request. Fixed window via INCR+EXPIRE:
// one round trip per request, atomic on the Redis side.

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

if (!redis) {
  log.warn("Upstash env vars missing — AI rate limit is per-instance in-memory only");
}

/** Returns allowed/blocked, or null when Redis is unavailable (caller falls back). */
async function checkRedis(key: string, config: BucketConfig): Promise<boolean | null> {
  if (!redis) return null;

  const windowId = Math.floor(Date.now() / config.windowMs);
  const redisKey = `bf_rl:${key}:${windowId}`;

  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      // +1s of slack so the key never outlives its window by much but also
      // never expires mid-window due to clock skew.
      await redis.expire(redisKey, Math.ceil(config.windowMs / 1000) + 1);
    }
    return count <= config.max;
  } catch (err) {
    log.warn("redis check failed — falling back to in-memory", {
      key,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function getIp(ctx: Context): string {
  return (
    ctx.req.header("x-forwarded-for")?.split(",")[0].trim() ??
    ctx.req.header("x-real-ip") ??
    "unknown"
  );
}

/** Applies to all routes: 120 req/min per IP (per instance). */
export async function rateLimitDefault(ctx: Context, next: Next) {
  const ip = getIp(ctx);
  if (!checkMemory(`default:${ip}`, DEFAULT)) {
    return ctx.json({ error: "Too many requests. Please slow down." }, 429);
  }
  return next();
}

/** Stricter, cross-instance limit for AI routes: 15 req/min per IP. */
export async function rateLimitAi(ctx: Context, next: Next) {
  const ip = getIp(ctx);

  const redisResult = await checkRedis(`ai:${ip}`, AI);
  const allowed = redisResult ?? checkMemory(`ai:${ip}`, AI);

  if (!allowed) {
    return ctx.json({ error: "AI rate limit reached. Please wait a moment." }, 429);
  }
  return next();
}
