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
