import { describe, it, expect } from "vitest";
import { checkRedisWindow, hasRedis } from "../fixedWindowLimiter";

describe("checkRedisWindow", () => {
  it("returns null (not false) when Redis is unconfigured, so callers can fall back", async () => {
    // In this test env, UPSTASH_REDIS_REST_URL/TOKEN are not set (see
    // vitest.setup.ts) — the module-level client is never created.
    expect(hasRedis).toBe(false);
    const result = await checkRedisWindow("test:key", 60_000, 10);
    expect(result).toBeNull();
  });
});
