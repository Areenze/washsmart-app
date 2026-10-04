"use client";

/* /partner shell — guards the session, shows partner header + nav. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Brand, Logo } from "@/components/ui";
import NotificationBell from "@/components/notification-bell";
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
  { href: "/partner/ledger", label: "Ledger" },
  { href: "/partner/reviews", label: "Reviews" },
  { href: "/partner/support", label: "Support" },
  { href: "/partner/profile", label: "Profile" },
];

// Pages that render outside the partner shell (own header, no session needed).
const PUBLIC_PARTNER_PATHS = [
  "/partner",
  "/partner/forgot-password",
  "/partner/reset-password",
];

export default function PartnerShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [partner, setPartner] = useState<Partner | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const p = await currentPartnerSession();
      setPartner(p ?? null);
      if (!p && !PUBLIC_PARTNER_PATHS.includes(pathname))
        router.replace("/partner");
    })();
  }, [pathname, router]);

  if (PUBLIC_PARTNER_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  if (partner === undefined) {
    return (
      <main className="min-h-screen bg-[#0a0f0c]">
        <p className="p-8 text-gray-400">Loading…</p>
      </main>
    );
  }

  const logout = async () => {
    await partnerLogout();
    router.replace("/partner");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0f0c] text-[#e9f2ec]">
      <header className="border-b bg-[#111a14] px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/partner/dashboard" className="flex items-center gap-2">
            <Logo />
            <Brand />
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold">{partner?.name ?? "Partner"}</p>
              <p className="text-xs text-gray-400">Partner App</p>
            </div>
            <NotificationBell audience="partner" href="/partner/notifications" />
            <button
              onClick={logout}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-gray-400"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <nav className="sticky top-0 z-10 border-b border-white/5 bg-[#111a14]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 sm:gap-2 sm:px-5">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={
                pathname === t.href
                  ? "border-b-2 border-[#48d87c] px-3 py-3 text-sm font-bold text-[#48d87c]"
                  : "border-b-2 border-transparent px-3 py-3 text-sm font-semibold text-gray-400 hover:text-[#e9f2ec]"
              }
            >
              {t.label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="mx-auto w-full max-w-7xl flex-1 px-5">{children}</div>
    </div>
  );
}
