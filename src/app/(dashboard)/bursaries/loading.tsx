export default function BursariesLoading() {
  return (
    <div className="relative min-h-screen bg-[#fff9f2] px-4 pb-8 pt-6 animate-pulse md:px-6 md:pt-8">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Header card skeleton */}
        <div className="rounded-3xl border border-orange-100 bg-white p-5 md:p-6">
          <div className="h-4 w-16 rounded-lg bg-gray-100" />
          <div className="mt-3 h-8 w-40 rounded-xl bg-gray-100" />
          <div className="mt-2 h-4 w-64 rounded-lg bg-gray-100" />
          <div className="mt-4 flex gap-2">
            <div className="h-7 w-20 rounded-full bg-orange-100" />
            <div className="h-7 w-24 rounded-full bg-gray-100" />
          </div>
          {/* Stats row */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
                <div className="h-3 w-16 rounded bg-gray-100" />
                <div className="mt-1 h-7 w-10 rounded-xl bg-gray-100" />
              </div>
            ))}
          </div>
        </div>

        {/* List skeleton */}
        <div className="rounded-3xl border border-gray-100 bg-white/95 p-4 shadow-sm md:p-5">
          <div className="flex gap-2 mb-4">
            <div className="h-9 w-36 rounded-xl bg-gray-100" />
            <div className="h-9 w-32 rounded-xl bg-gray-100" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4">
                <div className="h-5 w-3/4 rounded-lg bg-gray-100" />
                <div className="mt-1 h-3 w-1/3 rounded bg-orange-100" />
                <div className="mt-3 flex gap-2">
                  <div className="h-6 w-20 rounded-lg bg-gray-100" />
                  <div className="h-6 w-28 rounded-lg bg-gray-100" />
                  <div className="h-6 w-24 rounded-lg bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
