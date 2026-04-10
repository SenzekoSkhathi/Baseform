"use client";

import { useEffect, useState } from "react";

interface University {
  id: string;
  name: string;
  abbreviation: string;
  province: string;
  city: string;
}

interface UniversitySelectorProps {
  onSelect: (universityId: string | null) => void;
  selectedId: string | null;
}

export default function UniversitySelector({ onSelect, selectedId }: UniversitySelectorProps) {
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUniversities = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/programmes/universities");
        if (!res.ok) throw new Error("Failed to load universities");
        const data = await res.json();
        setUniversities(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadUniversities();
  }, []);

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse h-10 w-24 bg-gray-200 rounded-lg shrink-0"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700">Filter by University</label>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {/* All option */}
        <button
          onClick={() => onSelect(null)}
          className={[
            "px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all shrink-0",
            selectedId === null
              ? "bg-orange-500 text-white shadow-md"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200",
          ].join(" ")}
        >
          All
        </button>

        {/* University buttons */}
        {universities.map((uni) => (
          <button
            key={uni.id}
            onClick={() => onSelect(uni.id)}
            className={[
              "px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all shrink-0",
              selectedId === uni.id
                ? "bg-orange-500 text-white shadow-md"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            ].join(" ")}
            title={uni.name}
          >
            {uni.abbreviation}
          </button>
        ))}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
