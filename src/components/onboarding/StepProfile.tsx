"use client";

import { useState } from "react";
import type { OnboardingData } from "@/app/onboarding/page";

const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

const FIELDS = [
  "Engineering & Technology",
  "Health Sciences & Medicine",
  "Business & Commerce",
  "Law",
  "Education & Teaching",
  "Arts, Design & Humanities",
  "Natural Sciences",
  "Social Sciences",
  "Agriculture & Environmental",
  "IT & Computer Science",
  "Not sure yet",
];

type Props = {
  data: OnboardingData;
  onNext: (patch: Partial<OnboardingData>) => void;
  onBack: () => void;
};

export default function StepProfile({ data, onNext, onBack }: Props) {
  const [schoolName, setSchoolName] = useState(data.schoolName);
  const [gradeYear, setGradeYear] = useState(data.gradeYear);
  const [province, setProvince] = useState(data.province);
  const [financialNeed, setFinancialNeed] = useState(data.financialNeed);
  const [fieldOfInterest, setFieldOfInterest] = useState(data.fieldOfInterest);

  const valid = schoolName.trim().length >= 2 && gradeYear && province && fieldOfInterest;

  return (
    <div className="flex flex-col flex-1 gap-5">
      <div className="space-y-1">
        <button onClick={onBack} className="text-sm text-gray-400 mb-1">
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">A bit more about you</h1>
        <p className="text-gray-500 text-sm">
          This helps us match you to bursaries and institutions.
        </p>
      </div>

      <div className="flex-1 space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">School name</label>
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="e.g. Rondebosch Boys' High School"
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Current grade</label>
          <div className="grid grid-cols-2 gap-2">
            {(["Grade 11", "Grade 12"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGradeYear(g)}
                className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                  gradeYear === g
                    ? "bg-orange-500 text-white border-orange-500"
                    : "border-gray-200 text-gray-600 hover:border-orange-300"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Province</label>
          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            <option value="">Select your province</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">
            Field of interest
          </label>
          <select
            value={fieldOfInterest}
            onChange={(e) => setFieldOfInterest(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            <option value="">What do you want to study?</option>
            {FIELDS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Do you need financial assistance for university?
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["yes", "no", "unsure"] as const).map((option) => (
              <button
                key={option}
                onClick={() => setFinancialNeed(option)}
                className={`py-3 rounded-xl text-sm font-medium border transition-colors ${
                  financialNeed === option
                    ? "bg-orange-500 text-white border-orange-500"
                    : "border-gray-200 text-gray-600 hover:border-orange-300"
                }`}
              >
                {option === "yes" ? "Yes" : option === "no" ? "No" : "Not sure"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => onNext({ schoolName: schoolName.trim(), gradeYear, province, financialNeed, fieldOfInterest })}
        disabled={!valid}
        className="w-full bg-orange-500 text-white py-4 rounded-2xl font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
      >
        Show me my opportunities
      </button>
    </div>
  );
}
