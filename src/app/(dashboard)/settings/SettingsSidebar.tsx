"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Bell, CreditCard, Shield } from "lucide-react";

const NAV = [
  { href: "/settings/usage", label: "Usage", icon: BarChart2 },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/security", label: "Security", icon: Shield },
  { href: "/settings/billing", label: "Billing", icon: CreditCard },
];

export default function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:block">
        <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
          Settings
        </p>
        <ul className="space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                    active
                      ? "bg-orange-50 text-orange-600"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  ].join(" ")}
                >
                  <Icon size={16} className={active ? "text-orange-500" : "text-gray-400"} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile tab bar */}
      <nav className="mb-4 md:hidden">
        <ul className="flex gap-1 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1 scrollbar-none shadow-sm">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href} className="flex-1 shrink-0">
                <Link
                  href={href}
                  className={[
                    "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-bold transition-colors",
                    active
                      ? "bg-orange-50 text-orange-600"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700",
                  ].join(" ")}
                >
                  <Icon size={15} className={active ? "text-orange-500" : "text-gray-400"} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
