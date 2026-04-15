import { describe, it, expect } from "vitest";
import {
  parseProgrammeRequirements,
  checkQualification,
  sortProgrammesByQualification,
} from "../qualifications";
import type { Programme, StudentSubject } from "../types";

// ─── helpers ────────────────────────────────────────────────────────────────

function makeProgramme(overrides: Partial<Programme> = {}): Programme {
  return {
    id: "prog-1",
    name: "BSc Computer Science",
    universityId: "uni-1",
    universityName: "UCT",
    universityAbbreviation: "UCT",
    apsMinimum: 30,
    nativeScoreMinimum: null,
    scoringSystem: "APS",
    fieldOfStudy: "Science",
    durationYears: 3,
    qualificationType: "Bachelor",
    nqfLevel: 7,
    placesAvailable: null,
    additionalRequirements: null,
    ...overrides,
  };
}

function makeSubject(name: string, mark: number): StudentSubject {
  return { subjectName: name, mark, apsPoints: 0 };
}

// ─── parseProgrammeRequirements ─────────────────────────────────────────────

describe("parseProgrammeRequirements", () => {
  it("returns empty arrays for null input", () => {
    const result = parseProgrammeRequirements(null);
    expect(result.subjectRequirements).toHaveLength(0);
    expect(result.notes).toHaveLength(0);
  });

  it("detects Mathematics with minimum mark", () => {
    const result = parseProgrammeRequirements("Mathematics >= 60%");
    expect(result.subjectRequirements).toContainEqual({
      subject: "Mathematics",
      minimumMark: 60,
    });
  });

  it("detects maths alias", () => {
    const result = parseProgrammeRequirements("Maths at least 50%");
    expect(result.subjectRequirements).toContainEqual({
      subject: "Mathematics",
      minimumMark: 50,
    });
  });

  it("detects Physical Sciences with various aliases", () => {
    const result = parseProgrammeRequirements("Physics minimum 60%");
    expect(result.subjectRequirements).toContainEqual({
      subject: "Physical Sciences",
      minimumMark: 60,
    });
  });

  it("detects subject without minimum mark", () => {
    const result = parseProgrammeRequirements("English required");
    const english = result.subjectRequirements.find((r) => r.subject === "English");
    expect(english).toBeDefined();
    expect(english?.minimumMark).toBeNull();
  });

  it("does not duplicate subjects", () => {
    const result = parseProgrammeRequirements("Mathematics >= 50%, maths 60%");
    const mathReqs = result.subjectRequirements.filter((r) => r.subject === "Mathematics");
    expect(mathReqs).toHaveLength(1);
  });
});

// ─── checkQualification ──────────────────────────────────────────────────────

describe("checkQualification", () => {
  it("returns qualified when APS meets minimum and no subject requirements", () => {
    const programme = makeProgramme({ apsMinimum: 28 });
    const result = checkQualification(programme, 30, []);
    expect(result.status).toBe("qualified");
    expect(result.meetsAps).toBe(true);
    expect(result.hasRequiredSubjects).toBe(true);
  });

  it("returns not-qualified when APS is below minimum", () => {
    const programme = makeProgramme({ apsMinimum: 35 });
    const result = checkQualification(programme, 30, []);
    expect(result.status).toBe("not-qualified");
    expect(result.meetsAps).toBe(false);
    expect(result.apsShortfall).toBe(5);
  });

  it("returns marginal when APS qualifies but subject requirement is missing", () => {
    const programme = makeProgramme({
      apsMinimum: 28,
      additionalRequirements: "Mathematics >= 60%",
    });
    const subjects = [makeSubject("English", 75)]; // No maths
    const result = checkQualification(programme, 30, subjects);
    expect(result.status).toBe("marginal");
    expect(result.meetsAps).toBe(true);
    expect(result.hasRequiredSubjects).toBe(false);
    expect(result.missingSubjects).toContain("Mathematics (60%)");
  });

  it("returns not-qualified when both APS and subject requirements fail", () => {
    const programme = makeProgramme({
      apsMinimum: 35,
      additionalRequirements: "Mathematics >= 60%",
    });
    const subjects = [makeSubject("English", 50)];
    const result = checkQualification(programme, 30, subjects);
    expect(result.status).toBe("not-qualified");
  });

  it("passes subject requirement when student mark meets minimum", () => {
    const programme = makeProgramme({
      apsMinimum: 28,
      additionalRequirements: "Mathematics >= 60%",
    });
    const subjects = [makeSubject("Mathematics", 65)];
    const result = checkQualification(programme, 30, subjects);
    expect(result.status).toBe("qualified");
    expect(result.hasRequiredSubjects).toBe(true);
  });

  it("fails subject requirement when student mark is below minimum", () => {
    const programme = makeProgramme({
      apsMinimum: 28,
      additionalRequirements: "Mathematics >= 60%",
    });
    const subjects = [makeSubject("Mathematics", 55)];
    const result = checkQualification(programme, 30, subjects);
    expect(result.hasRequiredSubjects).toBe(false);
    expect(result.missingSubjects).toContain("Mathematics (60%)");
  });

  it("includes portfolio note when requirements mention portfolio", () => {
    const programme = makeProgramme({
      apsMinimum: 28,
      additionalRequirements: "portfolio submission required",
    });
    const result = checkQualification(programme, 30, []);
    expect(result.additionalNotes.join(" ")).toContain("Portfolio");
  });
});

// ─── sortProgrammesByQualification ──────────────────────────────────────────

describe("sortProgrammesByQualification", () => {
  it("sorts qualified before marginal before not-qualified", () => {
    const programme = makeProgramme({ apsMinimum: 28 });
    const results = [
      { ...checkQualification(makeProgramme({ apsMinimum: 35 }), 30, []), status: "not-qualified" as const },
      { ...checkQualification(programme, 30, []), status: "marginal" as const },
      { ...checkQualification(programme, 30, []), status: "qualified" as const },
    ];
    const sorted = sortProgrammesByQualification(results);
    expect(sorted[0].status).toBe("qualified");
    expect(sorted[1].status).toBe("marginal");
    expect(sorted[2].status).toBe("not-qualified");
  });

  it("within same status, sorts by apsMinimum ascending", () => {
    const results = [
      { ...checkQualification(makeProgramme({ apsMinimum: 35 }), 40, []), status: "qualified" as const },
      { ...checkQualification(makeProgramme({ apsMinimum: 28 }), 40, []), status: "qualified" as const },
    ];
    const sorted = sortProgrammesByQualification(results);
    expect(sorted[0].programme.apsMinimum).toBe(28);
    expect(sorted[1].programme.apsMinimum).toBe(35);
  });
});
