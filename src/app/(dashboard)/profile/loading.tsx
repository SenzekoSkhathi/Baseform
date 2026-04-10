export default function ProfileLoading() {
  return (
    <div className="relative min-h-screen bg-[#fff9f2] px-4 pb-10 pt-6 animate-pulse md:px-6 md:pt-10">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header card */}
        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="h-4 w-16 rounded-lg bg-gray-100" />
          <div className="mt-3 flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-orange-100" />
            <div className="space-y-2">
              <div className="h-6 w-40 rounded-xl bg-gray-100" />
              <div className="h-4 w-28 rounded-lg bg-gray-100" />
            </div>
          </div>
        </div>

        {/* APS card */}
        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="h-4 w-24 rounded-lg bg-gray-100" />
          <div className="mt-2 h-10 w-16 rounded-xl bg-orange-100" />
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100" />
        </div>

        {/* Subjects card */}
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="h-5 w-32 rounded-lg bg-gray-100 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-40 rounded-lg bg-gray-100" />
                <div className="h-6 w-14 rounded-lg bg-gray-100" />
              </div>
            ))}
          </div>
        </div>

        {/* Profile details card */}
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="h-5 w-32 rounded-lg bg-gray-100 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-20 rounded bg-gray-100" />
                <div className="h-5 w-48 rounded-lg bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
