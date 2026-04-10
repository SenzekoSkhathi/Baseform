import Image from "next/image";

export default function RootLoading() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_46%,#fff1e6_100%)] px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_16%,rgba(251,146,60,0.24),transparent_54%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_22%,rgba(56,189,248,0.15),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_92%,rgba(251,113,133,0.12),transparent_62%)]" />
      </div>

      <div className="relative flex flex-col items-center gap-4 text-center">
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="h-36 w-36 rounded-full bg-orange-300/35 blur-2xl animate-pulse" />
        </div>

        <div className="relative flex h-22 w-22 items-center justify-center rounded-[1.75rem] border border-white/60 bg-white/90 shadow-[0_18px_42px_rgba(249,115,22,0.26)] backdrop-blur-sm">
          <div className="absolute inset-0 rounded-[1.75rem] border border-orange-200/60 animate-[pulse_2.4s_ease-in-out_infinite]" />
          <Image src="/icon.svg" alt="Baseform" width={42} height={42} priority />
        </div>

        <div>
          <p className="text-base font-extrabold tracking-wide text-orange-700">Baseform</p>
        </div>
      </div>
    </div>
  );
}
