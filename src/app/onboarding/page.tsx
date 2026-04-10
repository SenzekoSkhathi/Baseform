"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StepName from "@/components/onboarding/StepName";
import StepSubjects from "@/components/onboarding/StepSubjects";
import StepProfile from "@/components/onboarding/StepProfile";
import { calculateAPS, type Subject } from "@/lib/aps/calculator";

export type OnboardingData = {
  firstName: string;
  lastName: string;
  phone: string;
  whatsapp: string;
  whatsappSameAsPhone: boolean;
  schoolName: string;
  gradeYear: "Grade 11" | "Grade 12" | "";
  province: string;
  financialNeed: "yes" | "no" | "unsure";
  fieldOfInterest: string;
  subjects: Subject[];
};

const EMPTY: OnboardingData = {
  firstName: "",
  lastName: "",
  phone: "",
  whatsapp: "",
  whatsappSameAsPhone: false,
  schoolName: "",
  gradeYear: "",
  province: "",
  financialNeed: "unsure",
  fieldOfInterest: "",
  subjects: [],
};

const STEPS = ["name", "subjects", "profile"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(EMPTY);

  function next(patch: Partial<OnboardingData>) {
    const updated = { ...data, ...patch };
    setData(updated);
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      // All steps done — persist to localStorage then go to reveal
      const aps = calculateAPS(updated.subjects);
      localStorage.setItem("bf_onboarding", JSON.stringify(updated));
      router.push(`/reveal?aps=${aps}&name=${encodeURIComponent(`${updated.firstName} ${updated.lastName}`.trim())}`);
    }
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-orange-500 transition-all duration-300"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col px-6 pt-8 pb-6 max-w-md mx-auto w-full">
        {step === 0 && (
          <StepName data={data} onNext={(patch) => next(patch)} />
        )}
        {step === 1 && (
          <StepSubjects
            data={data}
            onNext={(patch) => next(patch)}
            onBack={back}
          />
        )}
        {step === 2 && (
          <StepProfile
            data={data}
            onNext={(patch) => next(patch)}
            onBack={back}
          />
        )}
      </div>
    </main>
  );
}
