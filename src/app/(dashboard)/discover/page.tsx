import { Lock, Compass, GraduationCap, Search } from "lucide-react";
import Link from "next/link";

export default function DiscoverPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fff9f2]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_10%_8%,rgba(251,146,60,0.18),transparent_62%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(45%_35%_at_92%_14%,rgba(56,189,248,0.10),transparent_70%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl px-4 pb-8 pt-6 md:px-6 md:pt-12">
        <div className="rounded-3xl border border-orange-100 bg-white/90 p-8 shadow-[0_16px_45px_rgba(249,115,22,0.12)] text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50">
            <Compass size={32} className="text-orange-400" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 mb-4">
            <Lock size={11} />
            Coming soon
          </div>

          <h1 className="text-2xl font-black tracking-tight text-gray-900 md:text-3xl">Discover</h1>
          <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
            Explore all South African universities, fields of study, and opportunities — all in one place.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 text-left">
            {[
              { icon: <Search size={16} />, title: "Browse all unis", desc: "Filter by province, APS, and field" },
              { icon: <GraduationCap size={16} />, title: "Compare programmes", desc: "Side-by-side requirements and fees" },
              { icon: <Compass size={16} />, title: "Find hidden gems", desc: "Programmes you may not have considered" },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <span className="text-orange-400">{item.icon}</span>
                <p className="mt-2 text-sm font-bold text-gray-800">{item.title}</p>
                <p className="mt-0.5 text-xs text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            <p className="text-xs text-gray-400">In the meantime, browse programmes directly</p>
            <Link
              href="/programmes"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600 transition-colors"
            >
              <GraduationCap size={16} />
              Browse Programmes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
