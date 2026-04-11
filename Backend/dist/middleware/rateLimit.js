"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitDefault = rateLimitDefault;
exports.rateLimitAi = rateLimitAi;
const DEFAULT = { windowMs: 60_000, max: 120 };
const AI = { windowMs: 60_000, max: 15 };
// ip:route_prefix → { count, resetAt }
const buckets = new Map();
// Prune stale entries every 5 minutes so the map doesn't grow indefinitely.
setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
        if (now > bucket.resetAt)
            buckets.delete(key);
    }
}, 5 * 60_000).unref();
function getIp(ctx) {
    return (ctx.req.header("x-forwarded-for")?.split(",")[0].trim() ??
        ctx.req.header("x-real-ip") ??
        "unknown");
}
function check(ip, key, config) {
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + config.windowMs });
        return true;
    }
    if (bucket.count >= config.max)
        return false;
    bucket.count++;
    return true;
}
/** Applies to all routes: 120 req/min per IP. */
async function rateLimitDefault(ctx, next) {
    const ip = getIp(ctx);
    if (!check(ip, `default:${ip}`, DEFAULT)) {
        return ctx.json({ error: "Too many requests. Please slow down." }, 429);
    }
    return next();
}
/** Stricter limit for AI routes: 15 req/min per IP. */
async function rateLimitAi(ctx, next) {
    const ip = getIp(ctx);
    if (!check(ip, `ai:${ip}`, AI)) {
        return ctx.json({ error: "AI rate limit reached. Please wait a moment." }, 429);
    }
    return next();
}
