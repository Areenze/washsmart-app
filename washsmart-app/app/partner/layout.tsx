"use client";

/* /partner shell — guards the session, shows partner header + nav. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Brand, Logo } from "@/components/ui";
import {
  currentPartnerSession,
  partnerLogout,
} from "@/lib/db/store";
import type { Partner } from "@/lib/db/types";

const tabs = [
  { href: "/partner/dashboard", label: "Dashboard" },
  { href: "/partner/scan", label: "Scan" },
  { href: "/partner/history", label: "History" },
  { href: "/partner/earnings", label: "Earnings" },
  { href: "/partner/profile", label: "Profile" },
];

export default function PartnerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [partner, setPartner] = useState<Partner | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const p = await currentPartnerSession();
      setPartner(p ?? null);
      if (!p && pathname !== "/partner") router.replace("/partner");
    })();
  }, [pathname, router]);

  if (pathname === "/partner") {
    return <>{children}</>;
  }

  if (partner === undefined) {
    return (
      <main className="min-h-screen bg-[#f4f7f5]">
        <p className="p-8 text-gray-500">Loading…</p>
      </main>
    );
  }

  const logout = async () => {
    await partnerLogout();
    router.replace("/partner");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f7f5] text-[#10251c]">
      <header className="border-b bg-white px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/partner/dashboard" className="flex items-center gap-2">
            <Logo />
            <Brand />
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold">{partner?.name ?? "Partner"}</p>
              <p className="text-xs text-gray-500">Partner App</p>
            </div>
            <button
              onClick={logout}
              className="rounded-full border border-gray-200 px-4 py-2 text-xs font-bold text-gray-500"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl flex-1 px-5">{children}</div>

      <nav className="sticky bottom-0 border-t bg-white px-2 py-3 md:hidden">
        <div className="flex justify-around text-[11px]">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={
                pathname === t.href
                  ? "font-bold text-[#168846]"
                  : "text-gray-500"
              }
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>

      <nav className="hidden border-t bg-white md:block">
        <div className="mx-auto flex max-w-7xl gap-8 px-5 py-3 text-sm font-semibold">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={
                pathname === t.href ? "text-[#168846]" : "text-gray-500"
              }
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
