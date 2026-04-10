import Image from "next/image";

export default function RootLoading() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-white via-gray-50 to-gray-100 px-6">
      {/* Subtle background elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-gradient-to-br from-blue-200/20 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-gradient-to-tr from-orange-100/20 to-transparent blur-3xl" />
      </div>

      {/* Frosted glass card */}
      <div className="relative">
        <div className="flex flex-col items-center gap-5 rounded-3xl border border-white/40 bg-white/30 px-8 py-10 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] backdrop-blur-xl">
          {/* Small icon */}
          <div className="flex h-16 w-16 items-center justify-center">
            <Image src="/icon.svg" alt="Baseform" width={32} height={32} priority />
          </div>

          {/* Brand text */}
          <p className="text-2xl font-bold tracking-tight text-gray-900">Baseform</p>

          {/* Loading indicator */}
          <div className="flex gap-1">
            <div className="h-2 w-2 rounded-full bg-gray-400 animate-[bounce_1.4s_infinite_0s]" />
            <div className="h-2 w-2 rounded-full bg-gray-400 animate-[bounce_1.4s_infinite_0.2s]" />
            <div className="h-2 w-2 rounded-full bg-gray-400 animate-[bounce_1.4s_infinite_0.4s]" />
          </div>
        </div>
      </div>
    </div>
  );
}
