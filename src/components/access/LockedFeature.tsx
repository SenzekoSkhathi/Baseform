import Link from "next/link";
import { Lock } from "lucide-react";

type Props = {
  title: string;
  description: string;
  features: string[];
  /** href for the upgrade CTA — defaults to /plans?plan=pro */
  upgradeTo?: string;
};

export default function LockedFeature({
  title,
  description,
  features,
  upgradeTo = "/plans?plan=pro",
}: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fff9f2]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_10%_8%,rgba(251,146,60,0.14),transparent_62%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-md px-4 pb-12 pt-10">
        <div className="rounded-3xl border border-orange-100 bg-white/90 p-8 shadow-[0_16px_45px_rgba(249,115,22,0.10)] text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50">
            <Lock size={26} className="text-orange-400" />
          </div>

          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-600">
            Pro feature
          </div>

          <h1 className="text-xl font-black tracking-tight text-gray-900">{title}</h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">{description}</p>

          <ul className="mt-5 space-y-2 text-left">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
                <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-orange-100 flex items-center justify-center text-[10px] font-bold text-orange-600">✓</span>
                {f}
              </li>
            ))}
          </ul>

          <Link
            href={upgradeTo}
            className="mt-7 block w-full rounded-2xl bg-orange-500 py-3.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors text-center"
          >
            Upgrade to Pro — R39.99/month
          </Link>

          <Link
            href="/dashboard"
            className="mt-3 block text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
