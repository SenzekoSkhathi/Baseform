import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SettingsSidebar from "./SettingsSidebar";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#fff9f2]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_10%_10%,rgba(251,146,60,0.14),transparent_62%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-16 pt-20 md:px-6">
        {/* Back to dashboard */}
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <ArrowLeft size={13} />
          Dashboard
        </Link>

        <div className="md:grid md:grid-cols-[200px_1fr] md:gap-8">
          <SettingsSidebar />
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
