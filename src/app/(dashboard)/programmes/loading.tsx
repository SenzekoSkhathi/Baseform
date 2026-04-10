export default function ProgrammesLoading() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      {/* Header */}
      <div className="border-b border-gray-100 px-5 pt-12 pb-5">
        <div className="h-7 w-36 rounded-xl bg-gray-100" />
        <div className="mt-2 h-4 w-56 rounded-lg bg-gray-100" />
      </div>

      <div className="px-5 pt-4 pb-6 space-y-4">
        {/* Filter bar skeleton */}
        <div className="flex gap-2">
          <div className="h-9 w-full rounded-xl bg-gray-100" />
          <div className="h-9 w-28 shrink-0 rounded-xl bg-gray-100" />
        </div>

        {/* University filter chips */}
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-20 shrink-0 rounded-full bg-gray-100" />
          ))}
        </div>

        {/* Programme cards */}
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded-lg bg-gray-100" />
                  <div className="h-3 w-1/2 rounded-lg bg-gray-100" />
                  <div className="flex gap-2">
                    <div className="h-5 w-16 rounded-full bg-gray-100" />
                    <div className="h-5 w-20 rounded-full bg-gray-100" />
                  </div>
                </div>
                <div className="h-9 w-9 shrink-0 rounded-xl bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
