/**
 * Dashboard types for university programmes and qualifications
 */

export type Programme = {
  id: string;
  name: string;
  universityId: string;
  universityName: string;
  universityAbbreviation: string;
  apsMinimum: number;
  nativeScoreMinimum: number | null;
  scoringSystem: string;
  fieldOfStudy: string;
  durationYears: number;
  qualificationType: string;
  nqfLevel: number;
  placesAvailable: number | null;
  additionalRequirements: string | null;
};

export type QualificationStatus = "qualified" | "not-qualified" | "marginal";

export type QualificationCheckResult = {
  programme: Programme;
  status: QualificationStatus;
  meetsAps: boolean;
  apsShortfall?: number;
  hasRequiredSubjects: boolean;
  missingSubjects: string[];
  additionalNotes: string[];
  overallMessage: string;
};

export type StudentProfile = {
  id: string;
  fullName: string;
  province: string | null;
  fieldOfInterest: string | null;
  gradeYear: string | null;
  schoolName: string | null;
  tier: string;
};

export type StudentSubject = {
  subjectName: string;
  mark: number;
  apsPoints: number;
};

export type SubjectRequirement = {
  subject: string;
  minimumMark: number;
  isRequired: boolean;
};
