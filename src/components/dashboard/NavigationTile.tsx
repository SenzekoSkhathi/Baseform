"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

interface NavigationTileProps {
  title: string;
  icon: string;
  href: string;
  iconBg?: string;
  accentColor?: string;
  isImage?: boolean;
  dataTour?: string;
}

export default function NavigationTile({
  title,
  icon,
  href,
  iconBg = "bg-orange-50",
  accentColor = "border-orange-200",
  isImage = false,
  dataTour,
}: NavigationTileProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Link
      href={href}
      data-tour={dataTour}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      className={[
        "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border h-56.25 transition-all duration-150",
        pressed
          ? `bg-orange-50 ${accentColor} scale-95`
          : "bg-white border-gray-100 hover:border-orange-200 hover:bg-orange-50/40",
      ].join(" ")}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        {isImage ? (
          <Image src={icon} alt={title} width={32} height={32} />
        ) : (
          <span className="text-2xl leading-none">{icon}</span>
        )}
      </div>
      <span className="text-xs font-semibold text-gray-900 text-center leading-tight px-1">
        {title}
      </span>
      <span
        className={[
          "w-1.5 h-1.5 rounded-full transition-opacity",
          pressed ? "bg-orange-400 opacity-100" : "bg-orange-300 opacity-0",
        ].join(" ")}
      />
    </Link>
  );
}
