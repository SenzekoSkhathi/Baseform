export const KZN_CAO_MAX_CHOICES = 6;

export const KZN_CAO_UNIVERSITY_ABBRS = new Set([
  "UKZN",
  "DUT",
  "MUT",
  "UNIZULU",
  "UZ",
]);

export const UNIVERSITY_CHOICE_LIMITS: Record<string, number> = {
  CPUT: 3,
  CUT: 3,
  NMU: 2,
  NWU: 2,
  RU: 2,
  SMU: 2,
  SPU: 3,
  SU: 3,
  TUT: 3,
  UCT: 2,
  UFH: 2,
  UJ: 2,
  UL: 2,
  UMP: 2,
  UP: 2,
  UNISA: 3,
  UFS: 3,
  UWC: 2,
  WITS: 3,
  UNIVEN: 2,
  VUT: 2,
  WSU: 2,
};

export function normalizeUniversityAbbr(abbreviation: string | null | undefined): string {
  return String(abbreviation ?? "")
    .trim()
    .toUpperCase();
}

export function isKznCaoUniversity(abbreviation: string | null | undefined): boolean {
  return KZN_CAO_UNIVERSITY_ABBRS.has(normalizeUniversityAbbr(abbreviation));
}

export function getUniversityChoiceLimit(abbreviation: string | null | undefined): number | null {
  const normalized = normalizeUniversityAbbr(abbreviation);
  if (!normalized) return null;
  if (normalized === "CAO") return KZN_CAO_MAX_CHOICES;
  if (isKznCaoUniversity(normalized)) return KZN_CAO_MAX_CHOICES;
  return UNIVERSITY_CHOICE_LIMITS[normalized] ?? null;
}
