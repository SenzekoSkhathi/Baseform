import { describe, it, expect } from "vitest";
import { withRetry } from "../retry.js";

describe("withRetry", () => {
  it("returns the value on first success", async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      return 42;
    });
    expect(result).toBe(42);
    expect(calls).toBe(1);
  });

  it("retries on retryable status (529) and eventually succeeds", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) {
          const err: { status: number; message: string } = { status: 529, message: "overloaded" };
          throw err;
        }
        return "ok";
      },
      { retries: 3, baseDelayMs: 1, maxDelayMs: 5 }
    );
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("does not retry on a non-retryable error (400)", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw { status: 400, message: "bad request" };
        },
        { retries: 5, baseDelayMs: 1 }
      )
    ).rejects.toMatchObject({ status: 400 });
    expect(calls).toBe(1);
  });

  it("gives up after the configured number of retries", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw { status: 503, message: "down" };
        },
        { retries: 2, baseDelayMs: 1, maxDelayMs: 5 }
      )
    ).rejects.toMatchObject({ status: 503 });
    expect(calls).toBe(3); // initial + 2 retries
  });
});
