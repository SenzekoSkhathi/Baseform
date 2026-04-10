export default function VaultLoading() {
  return (
    <div className="relative min-h-screen bg-[#fff9f2] px-4 pb-8 pt-6 animate-pulse md:px-6 md:pt-10">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header */}
        <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="h-4 w-16 rounded-lg bg-gray-100" />
          <div className="mt-3 h-8 w-36 rounded-xl bg-gray-100" />
          <div className="mt-2 h-4 w-56 rounded-lg bg-gray-100" />
        </div>

        {/* Upload area */}
        <div className="rounded-3xl border-2 border-dashed border-orange-100 bg-white p-10 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-orange-50" />
          <div className="mx-auto mt-3 h-4 w-32 rounded-lg bg-gray-100" />
          <div className="mx-auto mt-2 h-3 w-48 rounded-lg bg-gray-100" />
        </div>

        {/* File list */}
        <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="h-5 w-28 rounded-lg bg-gray-100 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-2xl border border-gray-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gray-100" />
                  <div className="space-y-1">
                    <div className="h-4 w-40 rounded-lg bg-gray-100" />
                    <div className="h-3 w-24 rounded bg-gray-100" />
                  </div>
                </div>
                <div className="h-8 w-8 rounded-lg bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
