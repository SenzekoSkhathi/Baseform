import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen w-full bg-[#fff9f2] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="space-y-2">
          <p className="text-7xl font-black text-orange-500">404</p>
          <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
          <p className="text-sm text-slate-500">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            <Home size={16} />
            Go home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={16} />
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
