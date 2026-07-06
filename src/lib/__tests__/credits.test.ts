import { describe, it, expect } from "vitest";
import { summarizeWeeklyUsage, WEEKLY_TOP_UP, CREDIT_CAP } from "../credits";

describe("summarizeWeeklyUsage", () => {
  it("reports zero usage at the start of a week", () => {
    expect(summarizeWeeklyUsage(60, 60)).toEqual({
      weeklyUsed: 0,
      highestThresholdCrossed: null,
    });
  });

  it("crosses thresholds as credits are spent (Essential: 60/week)", () => {
    // 15/60 = 25%
    expect(summarizeWeeklyUsage(45, 60).highestThresholdCrossed).toBe(25);
    // 30/60 = 50%
    expect(summarizeWeeklyUsage(30, 60).highestThresholdCrossed).toBe(50);
    // 48/60 = 80%
    expect(summarizeWeeklyUsage(12, 60).highestThresholdCrossed).toBe(80);
    // 57/60 = 95% — skips straight to the highest crossed threshold
    expect(summarizeWeeklyUsage(3, 60).highestThresholdCrossed).toBe(95);
  });

  it("works for the Pro allowance (90/week)", () => {
    // 45/90 = 50%
    expect(summarizeWeeklyUsage(45, 90)).toEqual({
      weeklyUsed: 45,
      highestThresholdCrossed: 50,
    });
  });

  it("never reports negative usage when balance exceeds week start (top-up mid-week)", () => {
    expect(summarizeWeeklyUsage(CREDIT_CAP, 60).weeklyUsed).toBe(0);
  });

  it("falls back to the default allowance when week_start_balance is 0", () => {
    // 0 balance, 0 start — 0 used out of WEEKLY_TOP_UP, no threshold
    expect(summarizeWeeklyUsage(0, 0)).toEqual({
      weeklyUsed: 0,
      highestThresholdCrossed: null,
    });
    expect(WEEKLY_TOP_UP).toBeGreaterThan(0);
  });
});
