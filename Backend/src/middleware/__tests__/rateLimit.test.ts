import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { rateLimitAi } from "../rateLimit.js";

// Without UPSTASH_* env vars the limiter uses the in-memory fallback,
// which is what these tests exercise (15 req/min per IP for the AI tier).

function buildApp() {
  const app = new Hono();
  app.use("*", rateLimitAi);
  app.get("/ai/test", (ctx) => ctx.json({ ok: true }));
  return app;
}

function request(app: Hono, ip: string) {
  return app.request("/ai/test", {
    headers: { "x-forwarded-for": ip },
  });
}

describe("rateLimitAi (in-memory fallback)", () => {
  it("allows up to 15 requests per minute per IP, then returns 429", async () => {
    const app = buildApp();
    const ip = "203.0.113.10";

    for (let i = 0; i < 15; i++) {
      const res = await request(app, ip);
      expect(res.status).toBe(200);
    }

    const blocked = await request(app, ip);
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toMatch(/rate limit/i);
  });

  it("tracks IPs independently", async () => {
    const app = buildApp();

    for (let i = 0; i < 16; i++) {
      await request(app, "203.0.113.20");
    }
    expect((await request(app, "203.0.113.20")).status).toBe(429);
    expect((await request(app, "203.0.113.21")).status).toBe(200);
  });
});
