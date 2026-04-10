import { cn } from "@/lib/utils";

type Props = {
  variant?: "icon" | "lockup"; // icon = mark only, lockup = mark + wordmark
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: { icon: 32, text: 18 },
  md: { icon: 40, text: 22 },
  lg: { icon: 52, text: 28 },
};

export default function Logo({ variant = "lockup", size = "md", className }: Props) {
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Icon mark */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="100" height="100" rx="22" fill="#f97316" />
        <rect x="28" y="30" width="28" height="5" rx="2.5" fill="white" />
        <rect x="28" y="43" width="20" height="5" rx="2.5" fill="white" />
        <path
          d="M58 72 L58 44 L52 50 M58 44 L64 50"
          stroke="white"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Wordmark */}
      {variant === "lockup" && (
        <span
          className="font-black tracking-tight leading-none"
          style={{ fontSize: s.text }}
        >
          <span className="text-gray-900">base</span>
          <span className="text-orange-500">form</span>
        </span>
      )}
    </div>
  );
}
