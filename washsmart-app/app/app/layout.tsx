"use client";

/* /app shell — header + mobile bottom nav for the subscriber experience. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Brand, Logo } from "@/components/ui";

const tabs = [
  { href: "/app", label: "Home" },
  { href: "/app/partners", label: "Partners" },
  { href: "/app/scan", label: "Scan" },
  { href: "/app/subscription", label: "Subscription" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f8f6] text-[#10251c]">
      <header className="border-b bg-white px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/app" className="flex items-center gap-2">
            <Logo />
            <Brand />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={isActive(t.href) ? "text-[#168846]" : "text-gray-500"}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/app/profile"
            aria-label="Profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf8f1] text-lg"
          >
            👤
          </Link>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <nav className="sticky bottom-0 border-t bg-white px-4 py-3 md:hidden">
        <div className="flex justify-around text-xs">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={isActive(t.href) ? "font-bold text-[#168846]" : "text-gray-500"}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
