export default function TrackerLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-5 pt-12 pb-5">
        <div className="h-7 w-28 rounded-xl bg-gray-100" />
        <div className="mt-2 h-4 w-56 rounded-lg bg-gray-100" />
      </div>

      <div className="px-5 pt-4 pb-6 space-y-4">
        {/* Stat cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="mb-3 h-8 w-8 rounded-lg bg-gray-100" />
              <div className="h-3 w-16 rounded bg-gray-100" />
              <div className="mt-1 h-7 w-12 rounded-xl bg-gray-100" />
              <div className="mt-1 h-3 w-24 rounded bg-gray-100" />
            </div>
          ))}
        </div>

        {/* Goal builder skeleton */}
        <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-4">
          <div className="h-4 w-36 rounded-lg bg-orange-100" />
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div className="h-9 rounded-xl bg-orange-100" />
            <div className="h-9 rounded-xl bg-orange-100" />
            <div className="h-9 rounded-xl bg-orange-100" />
            <div className="h-9 rounded-xl bg-orange-100" />
          </div>
        </div>

        {/* Goal list */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
          <div className="h-4 w-40 rounded-lg bg-gray-100" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 p-3">
              <div className="h-4 w-2/3 rounded-lg bg-gray-100" />
              <div className="mt-2 flex gap-2">
                <div className="h-5 w-20 rounded-full bg-gray-100" />
                <div className="h-5 w-16 rounded-full bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
