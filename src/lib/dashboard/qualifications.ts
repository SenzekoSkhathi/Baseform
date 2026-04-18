import {
  QualificationCheckResult,
  QualificationStatus,
  Programme,
  StudentSubject
} from "./types";
import { calculateWitsAPS, isWitsAbbreviation } from "@/lib/aps/calculator";

type ParsedSubjectRequirement = {
  subject: string;
  minimumMark: number | null;
};

type ParsedProgrammeRequirements = {
  subjectRequirements: ParsedSubjectRequirement[];
  notes: string[];
};

const SUBJECT_PATTERNS: Array<{
  subject: string;
  aliases: string[];
}> = [
  { subject: "Mathematics", aliases: ["mathematics", "maths", "math"] },
  { subject: "Physical Sciences", aliases: ["physical sciences", "physical science", "physics", "chemistry"] },
  { subject: "Life Sciences", aliases: ["life sciences", "life science", "biology"] },
  { subject: "English", aliases: ["english"] },
  { subject: "Accounting", aliases: ["accounting"] },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findSubjectMark(requirements: string, aliases: string[]) {
  const aliasPattern = aliases.map(escapeRegExp).join("|");
  const match = requirements.match(
    new RegExp(`(?:${aliasPattern})\\s*(?:≥|>=|at least|minimum(?: of)?|:)?\\s*(\\d{1,3})\\s*%?`, "i")
  );

  return match ? Number(match[1]) : null;
}

/**
 * Extract subject requirements and loose notes from additional requirements text.
 */
export function parseProgrammeRequirements(requirements: string | null): ParsedProgrammeRequirements {
  if (!requirements) {
    return { subjectRequirements: [], notes: [] };
  }

  const subjectRequirements: ParsedSubjectRequirement[] = [];
  const lower = requirements.toLowerCase();

  for (const pattern of SUBJECT_PATTERNS) {
    const hasSubject = pattern.aliases.some((alias) => lower.includes(alias));
    if (!hasSubject) continue;

    if (subjectRequirements.some((item) => item.subject === pattern.subject)) continue;

    subjectRequirements.push({
      subject: pattern.subject,
      minimumMark: findSubjectMark(requirements, pattern.aliases),
    });
  }

  const notes = Array.from(
    new Set(
      requirements
        .split(/(?:\r?\n|;|\.|\u2022)/)
        .map((part) => part.trim())
        .filter(Boolean)
        .filter((part) => !SUBJECT_PATTERNS.some(({ aliases }) => {
          const aliasPattern = aliases.map(escapeRegExp).join("|");
            return new RegExp(`(?:${aliasPattern}).*(?:≥|>=|\\d{1,3}\\s*%?)`, "i").test(part);
        }))
    )
  );

  return { subjectRequirements, notes };
}

function findStudentSubject(studentSubjects: StudentSubject[], aliases: string[]) {
  return studentSubjects.find((subject) =>
    aliases.some((alias) => subject.subjectName.toLowerCase().includes(alias))
  );
}

/**
 * Check if student has required subjects with minimum marks
 */
function checkRequiredSubjects(
  studentSubjects: StudentSubject[],
  requiredSubjects: ParsedSubjectRequirement[]
): { hasAll: boolean; missing: string[] } {
  if (requiredSubjects.length === 0) {
    return { hasAll: true, missing: [] };
  }
  
  const missing: string[] = [];
  
  for (const required of requiredSubjects) {
    const aliases = SUBJECT_PATTERNS.find((pattern) => pattern.subject === required.subject)?.aliases ?? [required.subject.toLowerCase()];
    const studentSubject = findStudentSubject(studentSubjects, aliases);

    if (!studentSubject) {
      missing.push(required.minimumMark !== null ? `${required.subject} (${required.minimumMark}%)` : required.subject);
      continue;
    }

    if (required.minimumMark !== null && studentSubject.mark < required.minimumMark) {
      missing.push(`${required.subject} (${required.minimumMark}%)`);
    }
  }
  
  return { 
    hasAll: missing.length === 0, 
    missing 
  };
}

/**
 * Check if student qualifies for a programme
 */
export function checkQualification(
  programme: Programme,
  studentAps: number,
  studentSubjects: StudentSubject[]
): QualificationCheckResult {
  const parsedRequirements = parseProgrammeRequirements(programme.additionalRequirements);
  const { hasAll: hasRequiredSubjects, missing: missingSubjects } = checkRequiredSubjects(
    studentSubjects,
    parsedRequirements.subjectRequirements
  );

  // Wits uses an 8-point APS scale with bonuses; recompute against that scale.
  const effectiveAps = isWitsAbbreviation(programme.universityAbbreviation)
    ? calculateWitsAPS(studentSubjects.map((s) => ({ name: s.subjectName, mark: s.mark })))
    : studentAps;

  const meetsAps = effectiveAps >= programme.apsMinimum;
  const apsShortfall = meetsAps ? 0 : programme.apsMinimum - effectiveAps;

  let status: QualificationStatus = "qualified";
  const notes: string[] = [];

  if (!meetsAps) {
    status = "not-qualified";
    notes.push(`Need ${apsShortfall} more APS points (current: ${effectiveAps}/${programme.apsMinimum})`);
  }
  
  if (!hasRequiredSubjects) {
    if (meetsAps) {
      status = "marginal";
    } else {
      status = "not-qualified";
    }
    notes.push(`Missing required subjects: ${missingSubjects.join(", ")}`);
  }
  
  let overallMessage = "";
  
  if (status === "qualified") {
    overallMessage = "✓ You qualify for this programme";
  } else if (status === "marginal") {
    overallMessage = "⚠ You meet APS but have missing requirements";
  } else {
    overallMessage = "✗ You don't currently qualify";
  }
  
  // Add any special notes from requirements
  if (programme.additionalRequirements) {
    if (programme.additionalRequirements.includes("competitive")) {
      notes.push("This is a competitive programme - high achievement preferred");
    }
    if (programme.additionalRequirements.includes("portfolio")) {
      notes.push("Portfolio submission required");
    }
    if (programme.additionalRequirements.includes("audition")) {
      notes.push("Audition or interview required");
    }
  }

  notes.push(...parsedRequirements.notes.filter((note) => !notes.includes(note)));
  
  return {
    programme,
    status,
    meetsAps,
    apsShortfall: meetsAps ? undefined : apsShortfall,
    hasRequiredSubjects,
    missingSubjects,
    additionalNotes: notes,
    overallMessage,
  };
}

/**
 * Batch check qualifications for multiple programmes
 */
export function checkQualifications(
  programmes: Programme[],
  studentAps: number,
  studentSubjects: StudentSubject[]
): QualificationCheckResult[] {
  return programmes.map((programme) => checkQualification(programme, studentAps, studentSubjects));
}

/**
 * Filter and sort programmes by qualification status
 */
export function sortProgrammesByQualification(
  results: QualificationCheckResult[]
): QualificationCheckResult[] {
  const statusOrder = { qualified: 0, marginal: 1, "not-qualified": 2 };
  
  return [...results].sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    
    // Within same status, sort by APS requirement (lower = more accessible)
    return a.programme.apsMinimum - b.programme.apsMinimum;
  });
}
