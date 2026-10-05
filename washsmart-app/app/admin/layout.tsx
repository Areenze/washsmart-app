"use client";

/* /admin shell — sidebar nav + topbar + admin gate for the WashSMART
 * network control system. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Brand, Logo } from "@/components/ui";
import { getProfile, isAdmin, signOut } from "@/lib/db/store";
import { getSupabase } from "@/lib/db/supabase";
import { adminDashboardStats } from "@/lib/db/admin";

const NAV: { href: string; label: string; icon: string; badge?: string }[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/subscribers", label: "Subscribers", icon: "👥" },
  { href: "/admin/partners", label: "Partners", icon: "🏪" },
  { href: "/admin/applications", label: "Applications", icon: "📝", badge: "apps" },
  { href: "/admin/inspections", label: "Inspections", icon: "🔍" },
  { href: "/admin/washes", label: "Washes", icon: "🚗" },
  { href: "/admin/credits", label: "Credits", icon: "🎟️" },
  { href: "/admin/payments", label: "Payments", icon: "💳" },
  { href: "/admin/promotions", label: "Promotions", icon: "🏷️" },
  { href: "/admin/settlements", label: "Settlements", icon: "🏦", badge: "settlements" },
  { href: "/admin/reviews", label: "Reviews", icon: "⭐" },
  { href: "/admin/locations", label: "Locations", icon: "📍" },
  { href: "/admin/requests", label: "Requests", icon: "📬", badge: "requests" },
  { href: "/admin/support", label: "Support", icon: "🎧", badge: "tickets" },
  { href: "/admin/fraud", label: "Fraud", icon: "🚨" },
  { href: "/admin/reports", label: "Reports", icon: "📈" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

const SOON: { label: string; icon: string }[] = [];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const [admin, profile] = await Promise.all([
        // Fail closed on network error: a failed check must show the lock
        // screen (reloadable), never hang on "Loading…" forever.
        isAdmin().catch(() => false),
        getProfile().catch(() => null),
      ]);
      setAuthorized(admin);
      setEmail(profile?.email ?? null);
      if (admin) {
        try {
          const stats = await adminDashboardStats();
          const { count: reqCount } = await getSupabase()
            .from("location_requests")
            .select("id", { count: "exact", head: true });
          const { count: settleCount } = await getSupabase()
            .from("settlements")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending");
          const { count: ticketCount } = await getSupabase()
            .from("tickets")
            .select("id", { count: "exact", head: true })
            .in("status", ["open", "investigating"]);
          setBadges({
            apps: stats.pendingApplications,
            requests: reqCount ?? 0,
            settlements: settleCount ?? 0,
            tickets: ticketCount ?? 0,
          });
        } catch {
          /* badges are best-effort */
        }
      }
    })();
  }, []);

  const switchAccount = async () => {
    await signOut();
    router.push("/app/login?next=/admin");
  };

  const logout = async () => {
    await signOut();
    router.replace("/");
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  if (authorized === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0f0c] text-[#e9f2ec]">
        <p className="text-gray-400">Loading…</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#0a0f0c] text-[#e9f2ec]">
        <header className="border-b border-white/5 bg-[#111a14] px-5 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Logo />
              <Brand />
            </Link>
            <span className="text-sm font-semibold text-gray-400">Admin</span>
          </div>
        </header>
        <section className="mx-auto max-w-xl px-5 py-16">
          <div className="rounded-3xl bg-[#111a14] p-10 text-center shadow-sm">
            <p className="text-4xl">🔒</p>
            <h1 className="mt-3 text-2xl font-bold">Admin access required</h1>
            {email ? (
              <>
                <p className="mt-2 text-sm text-gray-400">
                  You&rsquo;re signed in as{" "}
                  <span className="font-bold text-[#e9f2ec]">{email}</span>,
                  which isn&rsquo;t a WashSMART staff account.
                </p>
                <button
                  onClick={switchAccount}
                  className="mt-6 inline-block rounded-full bg-[#34d186] px-8 py-3 font-bold text-white transition-all duration-200 hover:bg-[#27ab6c]"
                >
                  Switch account →
                </button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-gray-400">
                  Sign in with a WashSMART staff account to view this page.
                </p>
                <Link
                  href="/app/login?next=/admin"
                  className="mt-6 inline-block rounded-full bg-[#34d186] px-8 py-3 font-bold text-white transition-all duration-200 hover:bg-[#27ab6c]"
                >
                  Log in →
                </Link>
              </>
            )}
          </div>
        </section>
      </main>
    );
  }

  const navLink = (item: (typeof NAV)[number]) => {
    const active = isActive(item.href);
    const badge = item.badge ? badges[item.badge] : 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
          active
            ? "bg-[#34d186]/15 text-[#66dca4]"
            : "text-gray-400 hover:bg-white/5 hover:text-white"
        }`}
      >
        <span className="w-5 text-center">{item.icon}</span>
        {item.label}
        {badge ? (
          <span className="ml-auto rounded-full bg-[#f5b301]/20 px-2 py-0.5 text-xs font-bold text-[#f5b301]">
            {badge}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#0a0f0c] text-[#e9f2ec]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/5 bg-[#0d130f] p-4 md:flex">
        <Link href="/admin/dashboard" className="flex items-center gap-2 px-2 py-3">
          <Logo />
          <Brand />
        </Link>
        <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-widest text-gray-500">
          Network Control
        </p>
        <nav className="flex-1 space-y-1 overflow-y-auto">{NAV.map(navLink)}</nav>
        <div className="space-y-1 border-t border-white/5 pt-3">
          {SOON.map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600"
            >
              <span className="w-5 text-center">{s.icon}</span>
              {s.label}
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-gray-600">
                soon
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-white/5 pt-3">
          <p className="truncate px-4 text-xs text-gray-500">{email}</p>
          <button
            onClick={logout}
            className="mt-1 w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            ⎋ Log out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile topbar */}
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0d130f]/95 backdrop-blur-md md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/admin/dashboard" className="flex items-center gap-2">
              <Logo />
              <Brand />
            </Link>
            <button
              onClick={logout}
              className="text-xs font-bold text-gray-400"
            >
              Log out
            </button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
            {NAV.map((item) => {
              const active = isActive(item.href);
              const badge = item.badge ? badges[item.badge] : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                    active
                      ? "bg-[#34d186]/15 text-[#66dca4]"
                      : "text-gray-400"
                  }`}
                >
                  {item.icon} {item.label}
                  {badge ? (
                    <span className="rounded-full bg-[#f5b301]/20 px-1.5 text-[10px] text-[#f5b301]">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
