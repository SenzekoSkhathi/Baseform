"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2, Bell, CreditCard, Shield,
  User, Palette, Lock, HelpCircle, Info,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Account",
    items: [
      { href: "/settings/account",       label: "Account",       icon: User },
      { href: "/settings/notifications",  label: "Notifications", icon: Bell },
      { href: "/settings/security",       label: "Security",      icon: Shield },
      { href: "/settings/appearance",     label: "Appearance",    icon: Palette },
    ],
  },
  {
    label: "Plan",
    items: [
      { href: "/settings/usage",   label: "Usage",   icon: BarChart2 },
      { href: "/settings/billing", label: "Billing", icon: CreditCard },
    ],
  },
  {
    label: "More",
    items: [
      { href: "/settings/privacy", label: "Privacy",       icon: Lock },
      { href: "/settings/help",    label: "Help & Support", icon: HelpCircle },
      { href: "/settings/about",   label: "About",          icon: Info },
    ],
  },
];

// Flat list for mobile scroll
const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export default function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Desktop grouped sidebar ── */}
      <nav className="hidden md:block space-y-5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => {
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
                      <Icon size={15} className={active ? "text-orange-500" : "text-gray-400"} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* ── Mobile horizontal scroll ── */}
      <nav className="mb-4 md:hidden">
        <ul className="flex gap-1 overflow-x-auto rounded-2xl border border-gray-100 bg-white p-1 scrollbar-none shadow-sm">
          {ALL_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href} className="shrink-0">
                <Link
                  href={href}
                  className={[
                    "flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-bold transition-colors whitespace-nowrap",
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
