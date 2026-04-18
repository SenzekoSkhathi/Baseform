export type Subject = {
  name: string;
  mark: number; // percentage 0–100
};

/**
 * Converts a percentage mark to an APS point (1–7 scale).
 * Used by most South African public universities.
 */
export function markToApsPoint(mark: number): number {
  if (mark >= 80) return 7;
  if (mark >= 70) return 6;
  if (mark >= 60) return 5;
  if (mark >= 50) return 4;
  if (mark >= 40) return 3;
  if (mark >= 30) return 2;
  return 1;
}

/**
 * Calculates total APS from a list of subjects.
 * Life Orientation is fully excluded — all SA public universities
 * (UCT, SU, CPUT, UWC) state "excluding Life Orientation" in their
 * admission requirements. Best 6 remaining subjects are scored.
 */
export function calculateAPS(subjects: Subject[]): number {
  const withoutLO = subjects.filter(
    (s) => !s.name.toLowerCase().includes("life orientation")
  );

  const scored = withoutLO
    .map((s) => ({ ...s, points: markToApsPoint(s.mark) }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 6);

  return scored.reduce((sum, s) => sum + s.points, 0);
}

/**
 * Returns a human-readable rating for an APS score.
 */
export function apsRating(aps: number): string {
  if (aps >= 35) return "Excellent";
  if (aps >= 28) return "Strong";
  if (aps >= 21) return "Average";
  if (aps >= 15) return "Below average";
  return "Needs improvement";
}

// ── Wits-specific APS ────────────────────────────────────────────────────────
// Wits uses an 8-point scale with bonus points for English & Core Maths
// (≥60%) and a reduced Life Orientation scale. All 7 NSC subjects count.

function witsNormalPoints(mark: number): number {
  if (mark >= 90) return 8;
  if (mark >= 80) return 7;
  if (mark >= 70) return 6;
  if (mark >= 60) return 5;
  if (mark >= 50) return 4;
  if (mark >= 40) return 3;
  return 0;
}

function witsEnglishMathPoints(mark: number): number {
  if (mark >= 90) return 10;
  if (mark >= 80) return 9;
  if (mark >= 70) return 8;
  if (mark >= 60) return 7;
  if (mark >= 50) return 4;
  if (mark >= 40) return 3;
  return 0;
}

function witsLifeOrientationPoints(mark: number): number {
  if (mark >= 90) return 4;
  if (mark >= 80) return 3;
  if (mark >= 70) return 2;
  if (mark >= 60) return 1;
  return 0;
}

function isLifeOrientation(name: string): boolean {
  return name.toLowerCase().includes("life orientation");
}

function isEnglishSubject(name: string): boolean {
  return name.toLowerCase().includes("english");
}

// Core Maths earns the bonus; Maths Literacy does not.
function isCoreMathematics(name: string): boolean {
  const n = name.toLowerCase();
  if (n.includes("literacy") || n.includes("maths lit") || n.includes("math lit")) return false;
  return n.includes("math");
}

export function calculateWitsAPS(subjects: Subject[]): number {
  return subjects.reduce((total, subject) => {
    if (isLifeOrientation(subject.name)) {
      return total + witsLifeOrientationPoints(subject.mark);
    }
    if (isEnglishSubject(subject.name) || isCoreMathematics(subject.name)) {
      return total + witsEnglishMathPoints(subject.mark);
    }
    return total + witsNormalPoints(subject.mark);
  }, 0);
}

export function isWitsAbbreviation(abbreviation: string | null | undefined): boolean {
  return typeof abbreviation === "string" && abbreviation.trim().toUpperCase() === "WITS";
}
