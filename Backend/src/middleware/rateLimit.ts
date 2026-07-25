import type { Context, Next } from "hono";
import { checkRedisWindow } from "../lib/fixedWindowLimiter.js";

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

  const redisResult = await checkRedisWindow(`ai:${ip}`, AI.windowMs, AI.max);
  const allowed = redisResult ?? checkMemory(`ai:${ip}`, AI);

  if (!allowed) {
    return ctx.json({ error: "AI rate limit reached. Please wait a moment." }, 429);
  }
  return next();
}
