"use client";

/* /app shell — header + mobile bottom nav for the subscriber experience. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Brand, Logo } from "@/components/ui";
import { getProfile, signOut } from "@/lib/db/store";

const tabs = [
  { href: "/app", label: "Home" },
  { href: "/app/partners", label: "Partners" },
  { href: "/app/subscription", label: "Subscription" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoggedIn(!!(await getProfile()));
      } catch {
        setLoggedIn(false);
      }
    })();
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  const logout = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0f0c] text-[#e9f2ec]">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#111a14]/90 px-5 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="WashSMART home">
            <Logo />
            <Brand />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
            {tabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`group relative transition-colors ${
                  isActive(t.href)
                    ? "text-[#48d87c]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t.label}
                <span
                  aria-hidden
                  className={`absolute -bottom-1.5 left-0 h-[3px] w-full origin-left rounded-full bg-[#20a957] transition-transform duration-300 ${
                    isActive(t.href) ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            ))}
          </nav>
          {loggedIn === false ? (
            <div className="flex items-center gap-3">
              <Link
                href="/app/login"
                className="text-sm font-bold text-[#48d87c] transition-colors hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/app/signup"
                className="rounded-full bg-[#20a957] px-5 py-2 text-sm font-bold text-white transition-all duration-200 hover:bg-[#1a8a47]"
              >
                Sign up
              </Link>
            </div>
          ) : loggedIn === true ? (
            <div className="flex items-center gap-3">
              <button
                onClick={logout}
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-gray-400"
              >
                Log out
              </button>
              <Link
                href="/app/profile"
                aria-label="Profile"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#20a957]/10 text-lg"
              >
                👤
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <nav className="sticky bottom-0 border-t border-white/5 bg-[#111a14]/95 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="flex justify-around text-xs">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={
                isActive(t.href)
                  ? "rounded-full bg-[#20a957]/15 px-4 py-1.5 font-bold text-[#48d87c]"
                  : "px-4 py-1.5 text-gray-400"
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
