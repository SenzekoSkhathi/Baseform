"use client";

import { useMemo } from "react";
import { CalendarClock } from "lucide-react";

// SA university application season typically opens March/April and closes around Sept–Nov
// We target 1 April of the next calendar year as the opening milestone for Grade 11 learners
function getApplicationSeasonInfo() {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Application season for Grade 12 typically opens April 1 of the matric year
  // A Grade 11 learner becomes Grade 12 next year
  const openingDate = new Date(currentYear + 1, 3, 1); // April 1, next year
  const closingDate = new Date(currentYear + 1, 8, 30); // Sept 30, next year (average closing)

  const msToOpen = openingDate.getTime() - now.getTime();
  const daysToOpen = Math.max(0, Math.ceil(msToOpen / (1000 * 60 * 60 * 24)));

  const months = Math.floor(daysToOpen / 30);
  const remainingDays = daysToOpen % 30;

  return { daysToOpen, months, remainingDays, openingYear: currentYear + 1, closingDate };
}

function formatClosingDate(date: Date) {
  return date.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
}

export default function CountdownCard() {
  const { daysToOpen, months, remainingDays, openingYear, closingDate } = useMemo(
    () => getApplicationSeasonInfo(),
    []
  );

  const urgency = daysToOpen < 90 ? "high" : daysToOpen < 180 ? "medium" : "low";

  const accentClass =
    urgency === "high"
      ? "border-orange-200 bg-orange-50"
      : urgency === "medium"
        ? "border-amber-200 bg-amber-50"
        : "border-blue-200 bg-blue-50";

  const textClass =
    urgency === "high"
      ? "text-orange-700"
      : urgency === "medium"
        ? "text-amber-700"
        : "text-blue-700";

  const iconClass =
    urgency === "high"
      ? "bg-orange-100 text-orange-600"
      : urgency === "medium"
        ? "bg-amber-100 text-amber-600"
        : "bg-blue-100 text-blue-600";

  const countdownLabel =
    months > 0
      ? `${months} month${months !== 1 ? "s" : ""}${remainingDays > 0 ? ` ${remainingDays} day${remainingDays !== 1 ? "s" : ""}` : ""}`
      : `${daysToOpen} day${daysToOpen !== 1 ? "s" : ""}`;

  return (
    <div className={`rounded-2xl border px-4 py-4 ${accentClass}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          <CalendarClock size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold uppercase tracking-widest ${textClass}`}>
            Application Season
          </p>
          <p className={`mt-1 text-sm font-bold ${textClass}`}>
            Opens in approximately {countdownLabel}
          </p>
          <p className={`mt-1 text-xs ${textClass} opacity-80`}>
            Grade 12 applications typically open April {openingYear} and close around {formatClosingDate(closingDate)}. Use this time to raise your marks.
          </p>
        </div>
      </div>
    </div>
  );
}
