import { describe, it, expect } from "vitest";
import { markToApsPoint, calculateAPS, apsRating } from "../calculator";

describe("markToApsPoint", () => {
  it("returns 7 for marks >= 80", () => {
    expect(markToApsPoint(80)).toBe(7);
    expect(markToApsPoint(95)).toBe(7);
    expect(markToApsPoint(100)).toBe(7);
  });

  it("returns 6 for marks 70–79", () => {
    expect(markToApsPoint(70)).toBe(6);
    expect(markToApsPoint(75)).toBe(6);
    expect(markToApsPoint(79)).toBe(6);
  });

  it("returns 5 for marks 60–69", () => {
    expect(markToApsPoint(60)).toBe(5);
    expect(markToApsPoint(65)).toBe(5);
  });

  it("returns 4 for marks 50–59", () => {
    expect(markToApsPoint(50)).toBe(4);
    expect(markToApsPoint(55)).toBe(4);
  });

  it("returns 3 for marks 40–49", () => {
    expect(markToApsPoint(40)).toBe(3);
    expect(markToApsPoint(45)).toBe(3);
  });

  it("returns 2 for marks 30–39", () => {
    expect(markToApsPoint(30)).toBe(2);
    expect(markToApsPoint(35)).toBe(2);
  });

  it("returns 1 for marks below 30", () => {
    expect(markToApsPoint(0)).toBe(1);
    expect(markToApsPoint(29)).toBe(1);
  });
});

describe("calculateAPS", () => {
  it("excludes Life Orientation from calculation", () => {
    const subjects = [
      { name: "Mathematics", mark: 80 },       // 7
      { name: "English", mark: 70 },            // 6
      { name: "Physical Sciences", mark: 65 },  // 5
      { name: "Life Sciences", mark: 60 },      // 5
      { name: "Accounting", mark: 55 },         // 4
      { name: "History", mark: 50 },            // 4
      { name: "Life Orientation", mark: 90 },   // excluded
    ];
    // Best 6 non-LO: 7+6+5+5+4+4 = 31
    expect(calculateAPS(subjects)).toBe(31);
  });

  it("excludes Life Orientation regardless of casing", () => {
    const subjects = [
      { name: "Mathematics", mark: 80 },
      { name: "LIFE ORIENTATION", mark: 100 }, // should be excluded
      { name: "English", mark: 70 },
      { name: "Physical Sciences", mark: 60 },
      { name: "Life Sciences", mark: 50 },
      { name: "Accounting", mark: 40 },
      { name: "History", mark: 30 },
    ];
    // Best 6 non-LO: 7+6+5+4+3+2 = 27
    expect(calculateAPS(subjects)).toBe(27);
  });

  it("uses only best 6 subjects when more than 6 provided", () => {
    const subjects = [
      { name: "Maths", mark: 90 },    // 7
      { name: "English", mark: 85 },  // 7
      { name: "Science", mark: 75 },  // 6
      { name: "History", mark: 70 },  // 6
      { name: "Art", mark: 65 },      // 5
      { name: "Music", mark: 60 },    // 5
      { name: "Drama", mark: 30 },    // 2 — dropped (7th subject)
    ];
    // Best 6: 7+7+6+6+5+5 = 36
    expect(calculateAPS(subjects)).toBe(36);
  });

  it("handles fewer than 6 subjects", () => {
    const subjects = [
      { name: "Maths", mark: 80 }, // 7
      { name: "English", mark: 70 }, // 6
    ];
    expect(calculateAPS(subjects)).toBe(13);
  });

  it("returns 0 for empty subject list", () => {
    expect(calculateAPS([])).toBe(0);
  });

  it("returns 0 when only Life Orientation is provided", () => {
    expect(calculateAPS([{ name: "Life Orientation", mark: 95 }])).toBe(0);
  });
});

describe("apsRating", () => {
  it("returns Excellent for APS >= 35", () => {
    expect(apsRating(35)).toBe("Excellent");
    expect(apsRating(42)).toBe("Excellent");
  });

  it("returns Strong for APS 28–34", () => {
    expect(apsRating(28)).toBe("Strong");
    expect(apsRating(34)).toBe("Strong");
  });

  it("returns Average for APS 21–27", () => {
    expect(apsRating(21)).toBe("Average");
    expect(apsRating(27)).toBe("Average");
  });

  it("returns Below average for APS 15–20", () => {
    expect(apsRating(15)).toBe("Below average");
    expect(apsRating(20)).toBe("Below average");
  });

  it("returns Needs improvement for APS < 15", () => {
    expect(apsRating(0)).toBe("Needs improvement");
    expect(apsRating(14)).toBe("Needs improvement");
  });
});
