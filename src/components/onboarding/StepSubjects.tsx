"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { OnboardingData } from "@/app/onboarding/page";
import type { Subject } from "@/lib/aps/calculator";
import { markToApsPoint } from "@/lib/aps/calculator";

const SUBJECT_GROUPS = [
  {
    label: "Compulsory subjects",
    options: [
      "Mathematics",
      "Mathematical Literacy",
      "Life Orientation",
    ],
  },
  {
    label: "Languages - Home Language or FAL",
    options: [
      "Afrikaans - Home Language",
      "Afrikaans - First Additional Language",
      "English - Home Language",
      "English - First Additional Language",
      "isiNdebele - Home Language",
      "isiNdebele - First Additional Language",
      "isiXhosa - Home Language",
      "isiXhosa - First Additional Language",
      "isiZulu - Home Language",
      "isiZulu - First Additional Language",
      "Sepedi - Home Language",
      "Sepedi - First Additional Language",
      "Sesotho - Home Language",
      "Sesotho - First Additional Language",
      "Setswana - Home Language",
      "Setswana - First Additional Language",
      "siSwati - Home Language",
      "siSwati - First Additional Language",
      "Tshivenda - Home Language",
      "Tshivenda - First Additional Language",
      "Xitsonga - Home Language",
      "Xitsonga - First Additional Language",
    ],
  },
  {
    label: "Elective subjects",
    options: [
      "Agricultural Management Practices",
      "Agricultural Sciences",
      "Agricultural Technology",
      "Accounting",
      "Business Studies",
      "Economics",
      "Consumer Studies",
      "Hospitality Studies",
      "Tourism",
      "Computer Applications Technology",
      "Information Technology",
      "Life Sciences",
      "Physical Sciences",
      "Geography",
      "History",
      "Religion Studies",
      "Dance Studies",
      "Dramatic Arts",
      "Music",
      "Visual Arts",
      "Design",
      "Civil Technology",
      "Electrical Technology",
      "Mechanical Technology",
      "Engineering Graphics and Design (EGD)",
    ],
  },
];

type Props = {
  data: OnboardingData;
  onNext: (patch: Partial<OnboardingData>) => void;
  onBack: () => void;
};

function isLifeOrientation(name: string) {
  return name.trim().toLowerCase() === "life orientation";
}

export default function StepSubjects({ data, onNext, onBack }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>(
    data.subjects.length > 0
      ? data.subjects
      : [{ name: "", mark: 0 }]
  );
  const [attemptedContinue, setAttemptedContinue] = useState(false);

  function updateSubject(i: number, patch: Partial<Subject>) {
    setSubjects((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  function addSubject() {
    setSubjects((prev) => [...prev, { name: "", mark: 0 }]);
  }

  function removeSubject(i: number) {
    setSubjects((prev) => prev.filter((_, idx) => idx !== i));
  }

  // Subjects excluding Life Orientation
  const nonLOSubjects = subjects.filter((s) => !isLifeOrientation(s.name));

  // Every added subject needs a name selected and a mark explicitly entered (>0)
  const allFilled = subjects.every((s) => s.name.trim() !== "" && s.mark >= 1 && s.mark <= 100);
  const hasEnoughSubjects = nonLOSubjects.length >= 6;
  const valid = allFilled && hasEnoughSubjects;

  // Derive a specific error message to show after a failed attempt
  const errorMessage = (() => {
    if (!allFilled) {
      const missingMark = subjects.find((s) => s.name.trim() !== "" && (s.mark < 1 || s.mark > 100));
      if (missingMark) return `Enter a mark (1–100) for "${missingMark.name}".`;
      const missingName = subjects.find((s) => s.name.trim() === "");
      if (missingName) return "Select a subject for every row, or remove empty rows.";
    }
    if (!hasEnoughSubjects) {
      const shortBy = 6 - nonLOSubjects.length;
      return `Add ${shortBy} more subject${shortBy > 1 ? "s" : ""} (Life Orientation doesn't count toward the 6).`;
    }
    return null;
  })();

  function handleContinue() {
    setAttemptedContinue(true);
    if (valid) onNext({ subjects });
  }

  return (
    <div className="flex flex-col flex-1 gap-4">
      <div className="space-y-1">
        <button onClick={onBack} className="text-sm text-gray-400 mb-1">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Your subjects</h1>
        <p className="text-gray-500 text-sm">
          {data.gradeYear === "Grade 11"
            ? "Enter your current interim marks. We'll use these to project your APS and show which programmes you're on track for. You can update them anytime."
            : "Enter your Grade 12 subjects and marks. You need at least 6 subjects excluding Life Orientation, and every subject must have a mark filled in."}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {subjects.map((subject, i) => (
          <div key={i} className="flex gap-2 items-center">
            <div className="flex-1">
              <select
                value={subject.name}
                onChange={(e) => updateSubject(i, { name: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="">Select subject</option>
                {SUBJECT_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="w-20">
              <input
                type="number"
                min={0}
                max={100}
                value={subject.mark || ""}
                onChange={(e) =>
                  updateSubject(i, { mark: Number(e.target.value) })
                }
                placeholder="%"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {subject.mark > 0 && (
              <span className="text-xs font-bold text-orange-500 w-4">
                {markToApsPoint(subject.mark)}
              </span>
            )}

            {subjects.length > 1 && (
              <button
                onClick={() => removeSubject(i)}
                className="text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}

        <button
          onClick={addSubject}
          className="flex items-center gap-2 text-orange-500 text-sm font-medium py-2"
        >
          <Plus size={16} />
          Add subject
        </button>
      </div>

      {attemptedContinue && errorMessage && (
        <p className="text-sm text-red-500 font-medium text-center -mb-1">
          {errorMessage}
        </p>
      )}

      <button
        onClick={handleContinue}
        className="w-full bg-orange-500 text-white py-4 rounded-2xl font-semibold text-base hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}
