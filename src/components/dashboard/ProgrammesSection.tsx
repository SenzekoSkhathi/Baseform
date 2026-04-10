"use client";

import { useEffect, useState } from "react";
import UniversitySelector from "./UniversitySelector";
import ProgrammeCard from "./ProgrammeCard";
import { QualificationCheckResult, Programme, StudentSubject } from "@/lib/dashboard/types";
import { checkQualifications, sortProgrammesByQualification } from "@/lib/dashboard/qualifications";

interface ProgrammesSectionProps {
  studentAps: number;
  studentSubjects: StudentSubject[];
  fieldOfInterest?: string | null;
}

type FilterTab = "all" | "qualified" | "marginal" | "not-qualified";

export default function ProgrammesSection({
  studentAps,
  studentSubjects,
  fieldOfInterest,
}: ProgrammesSectionProps) {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [qualifications, setQualifications] = useState<QualificationCheckResult[]>([]);
  const [selectedUniversity, setSelectedUniversity] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load programmes
  useEffect(() => {
    const loadProgrammes = async () => {
      try {
        setLoading(true);
        setError(null);

        let url = "/api/programmes";
        const params = new URLSearchParams();

        if (selectedUniversity) {
          params.append("universityId", selectedUniversity);
        }
        if (searchQuery) {
          params.append("q", searchQuery);
        }

        if (params.toString()) {
          url += "?" + params.toString();
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load programmes");

        const data: Programme[] = await res.json();
        setProgrammes(data);

        // Check qualifications
        const results = checkQualifications(data, studentAps, studentSubjects);
        const sorted = sortProgrammesByQualification(results);
        setQualifications(sorted);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setQualifications([]);
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timer = setTimeout(loadProgrammes, 300);
    return () => clearTimeout(timer);
  }, [selectedUniversity, searchQuery, studentAps, studentSubjects]);

  // Filter results by tab
  const filtered = qualifications.filter((result) => {
    if (activeTab === "all") return true;
    return result.status === activeTab;
  });

  // Count stats
  const stats = {
    total: qualifications.length,
    qualified: qualifications.filter((r) => r.status === "qualified").length,
    marginal: qualifications.filter((r) => r.status === "marginal").length,
    notQualified: qualifications.filter((r) => r.status === "not-qualified").length,
  };

  return (
    <div className="space-y-6">
      {/* University Filter */}
      <UniversitySelector
        selectedId={selectedUniversity}
        onSelect={setSelectedUniversity}
      />

      {/* Search */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">
          Search Programmes
        </label>
        <input
          type="text"
          placeholder="Search by programme name, field, or degree..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>

      {/* Stats and Tabs */}
      {!loading && qualifications.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
              <p className="text-xs text-emerald-600 font-semibold">Qualified</p>
              <p className="text-xl font-bold text-emerald-900">{stats.qualified}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <p className="text-xs text-amber-600 font-semibold">Marginal</p>
              <p className="text-xl font-bold text-amber-900">{stats.marginal}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 border border-red-200">
              <p className="text-xs text-red-600 font-semibold">Not Qualified</p>
              <p className="text-xl font-bold text-red-900">{stats.notQualified}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-600 font-semibold">Total</p>
              <p className="text-xl font-bold text-blue-900">{stats.total}</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(["all", "qualified", "marginal", "not-qualified"] as FilterTab[]).map((tab) => {
              const tabStats: Record<FilterTab, number> = {
                all: stats.total,
                qualified: stats.qualified,
                marginal: stats.marginal,
                "not-qualified": stats.notQualified,
              };

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={[
                    "px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all shrink-0 capitalize",
                    activeTab === tab
                      ? "bg-orange-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  ].join(" ")}
                >
                  {tab === "not-qualified" ? "Not Qualified" : tab} ({tabStats[tab]})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div>
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse h-40 bg-gray-200 rounded-xl"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-semibold">Error loading programmes</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!loading && filtered.length === 0 && qualifications.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600 font-semibold">
              No {activeTab !== "all" ? activeTab : "programmes"} to display
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Try adjusting your filters or search
            </p>
          </div>
        )}

        {!loading && programmes.length === 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <p className="text-gray-600 font-semibold">
              No programmes found
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Try a different search or university
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((result) => (
              <ProgrammeCard key={result.programme.id} result={result} />
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      {!loading && qualifications.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-blue-900 mb-2">💡 How to read this:</p>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>
              <strong>✓ Qualified:</strong> You meet all APS and subject requirements
            </li>
            <li>
              <strong>⚠ Marginal:</strong> You meet APS but missing some subject requirements
            </li>
            <li>
              <strong>✗ Not Qualified:</strong> You don't currently meet the requirements
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
