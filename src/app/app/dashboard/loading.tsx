export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#fff9f2] px-4 pt-16 pb-10 animate-pulse">
      <div className="mx-auto max-w-lg space-y-5">
        {/* Greeting */}
        <div className="h-8 w-48 rounded-xl bg-orange-100" />
        <div className="h-4 w-32 rounded-lg bg-orange-50" />

        {/* APS card skeleton */}
        <div className="rounded-3xl border border-orange-100 bg-white p-5">
          <div className="mb-3 h-4 w-24 rounded-lg bg-gray-100" />
          <div className="h-8 w-16 rounded-xl bg-gray-100" />
          <div className="mt-3 h-2 w-full rounded-full bg-gray-100" />
        </div>

        {/* Quick-access tiles skeleton */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="mb-2 h-8 w-8 rounded-xl bg-gray-100" />
              <div className="h-3 w-16 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
