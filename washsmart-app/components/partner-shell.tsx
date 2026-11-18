"use client";

/* /partner shell — guards the session, shows partner header + nav. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Brand, ResponsiveLogo } from "@/components/ui";
import NotificationBell from "@/components/notification-bell";
import PullToRefresh from "@/components/pull-to-refresh";
import FitDebug from "@/components/fit-debug";
import {
  currentPartnerSessionStrict,
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

/* Mobile nav (Mm, 2026-11-18): only the first three tabs fit a phone
 * screen (~320px) — the rest move into a "More" dropdown below the md
 * breakpoint. md+ screens show the full row inline, as before. */
const PRIMARY_TABS = tabs.slice(0, 3);
const MORE_TABS = tabs.slice(3);

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
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the mobile "More" dropdown whenever the route changes.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // Tri-state per check: Partner (authed), null (definitely no session),
  // undefined (transient failure — keep previous state). A network blip must
  // never bounce a logged-in partner to the login page mid-shift.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let p: Partner | null | undefined;
      try {
        p = (await currentPartnerSessionStrict()) ?? null;
      } catch {
        p = undefined;
      }
      if (cancelled || p === undefined) return;
      setPartner(p);
      if (p === null && !PUBLIC_PARTNER_PATHS.includes(pathname))
        router.replace("/partner");
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (PUBLIC_PARTNER_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  if (partner === undefined) {
    return (
      <main className="min-h-screen bg-[#0a0a0a]">
        <p className="p-8 text-gray-400">Loading…</p>
      </main>
    );
  }

  const logout = async () => {
    await partnerLogout();
    router.replace("/partner");
  };

  const moreActive = MORE_TABS.some((t) => t.href === pathname);
  const tabClass = (active: boolean) =>
    active
      ? "whitespace-nowrap border-b-2 border-[#ffffff] px-2 py-3 text-sm font-bold text-[#ffffff] sm:px-3"
      : "whitespace-nowrap border-b-2 border-transparent px-2 py-3 text-sm font-semibold text-gray-400 hover:text-[#f2f2f2] sm:px-3";

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col bg-[#0a0a0a] text-[#f2f2f2] [overflow-x:clip]">
      <PullToRefresh />
      <FitDebug />
      <header className="border-b bg-[#151515] px-3 py-4 sm:px-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <Link href="/partner/dashboard" className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <ResponsiveLogo />
            <Brand />
            <span className="ml-1 hidden rounded-md bg-[#ffffff]/15 px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-[#ffffff] sm:inline-block">
              PARTNER PORTAL
            </span>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold">{partner?.name ?? "Partner"}</p>
              <p className="text-xs text-gray-400">Partner App</p>
            </div>
            <NotificationBell audience="partner" href="/partner/notifications" />
            <button
              onClick={logout}
              className="whitespace-nowrap rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-gray-400 sm:px-4"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <nav className="sticky top-0 z-10 border-b border-white/5 bg-[#151515]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl gap-1 px-3 sm:gap-2 sm:px-5">
          {PRIMARY_TABS.map((t) => (
            <Link key={t.href} href={t.href} className={tabClass(pathname === t.href)}>
              {t.label}
            </Link>
          ))}
          {MORE_TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`hidden md:block ${tabClass(pathname === t.href)}`}
            >
              {t.label}
            </Link>
          ))}

          {/* Mobile only: the remaining sections live in this dropdown. */}
          <div className="relative ml-auto md:hidden">
            <button
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              className={`h-full ${tabClass(moreActive)}`}
            >
              More <span aria-hidden>{moreOpen ? "▴" : "▾"}</span>
            </button>
            {moreOpen && (
              <>
                <button
                  aria-hidden
                  tabIndex={-1}
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMoreOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1c] py-2 shadow-2xl">
                  {MORE_TABS.map((t) => (
                    <Link
                      key={t.href}
                      href={t.href}
                      onClick={() => setMoreOpen(false)}
                      className={
                        pathname === t.href
                          ? "block bg-white/10 px-4 py-3 text-sm font-bold text-white"
                          : "block px-4 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5"
                      }
                    >
                      {t.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-7xl flex-1 px-5">{children}</div>
    </div>
  );
}
