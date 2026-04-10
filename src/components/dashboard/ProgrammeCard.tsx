"use client";

import { QualificationCheckResult, QualificationStatus } from "@/lib/dashboard/types";

interface ProgrammeCardProps {
  result: QualificationCheckResult;
}

const STATUS_CONFIG: Record<QualificationStatus, { bg: string; border: string; icon: string; color: string }> = {
  qualified: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: "✓",
    color: "text-emerald-600",
  },
  marginal: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "⚠",
    color: "text-amber-600",
  },
  "not-qualified": {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "✗",
    color: "text-red-600",
  },
};

export default function ProgrammeCard({ result }: ProgrammeCardProps) {
  const config = STATUS_CONFIG[result.status];
  const { programme, status, meetsAps, apsShortfall, hasRequiredSubjects, missingSubjects, additionalNotes, overallMessage } = result;

  return (
    <div className={`${config.bg} ${config.border} border rounded-xl p-4 transition-all hover:shadow-md`}>
      {/* Header: University + Status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            {programme.universityAbbreviation}
          </p>
          <h3 className="text-sm font-bold text-gray-900 leading-tight text-wrap">
            {programme.name}
          </h3>
        </div>

        {/* Status Badge */}
        <div className={`${config.color} flex items-center justify-center w-8 h-8 rounded-full font-bold text-lg shrink-0`}>
          {config.icon}
        </div>
      </div>

      {/* Programme Info */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div>
          <p className="text-gray-500">Duration</p>
          <p className="font-semibold text-gray-800">{programme.durationYears} years</p>
        </div>
        <div>
          <p className="text-gray-500">Type</p>
          <p className="font-semibold text-gray-800 capitalize">{programme.qualificationType}</p>
        </div>
        <div>
          <p className="text-gray-500">Field</p>
          <p className="font-semibold text-gray-800 text-xs">{programme.fieldOfStudy}</p>
        </div>
        <div>
          <p className="text-gray-500">Required APS</p>
          <p className="font-semibold text-gray-800">{programme.apsMinimum}</p>
        </div>
      </div>

      {/* Qualifications Status */}
      <div className="space-y-2 mb-3 pb-3 border-t border-gray-200 pt-3">
        {/* Overall message */}
        <p className={`text-sm font-semibold ${config.color}`}>
          {overallMessage}
        </p>

        {/* APS status */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">APS Match:</span>
          {meetsAps ? (
            <span className="font-semibold text-emerald-600">✓ Meets requirement</span>
          ) : (
            <span className="font-semibold text-red-600">
              ✗ -{apsShortfall} points needed ({apsShortfall} more)
            </span>
          )}
        </div>

        {/* Subjects status */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">Subjects:</span>
          {hasRequiredSubjects ? (
            <span className="font-semibold text-emerald-600">✓ All required</span>
          ) : (
            <span className="font-semibold text-red-600">
              ✗ Missing: {missingSubjects.join(", ")}
            </span>
          )}
        </div>
      </div>

      {/* Additional Notes */}
      {additionalNotes.length > 0 && (
        <div className="bg-white/50 rounded-lg p-2.5 space-y-1">
          {additionalNotes.map((note, idx) => (
            <p key={idx} className="text-xs text-gray-600 leading-relaxed">
              • {note}
            </p>
          ))}
        </div>
      )}

      {/* Additional Requirements */}
      {programme.additionalRequirements && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            <span className="font-semibold">Requirements: </span>
            <span className="line-clamp-2">{programme.additionalRequirements}</span>
          </p>
        </div>
      )}

      {/* CTA Button */}
      <button className="w-full mt-3 py-2 px-3 bg-white rounded-lg font-semibold text-sm text-gray-900 hover:bg-gray-50 transition-colors border border-gray-200">
        View Details
      </button>
    </div>
  );
}
