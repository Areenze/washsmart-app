"use client";

/* /app shell — header + mobile bottom nav for the subscriber experience.
 * /app is one continuous page (home → partners → subscription); the tabs
 * smooth-scroll to each section, with scroll-spy highlighting. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Brand, Logo } from "@/components/ui";
import NotificationBell from "@/components/notification-bell";
import { getProfile, signOut } from "@/lib/db/store";

const tabs = [
  { id: "home", label: "Home" },
  { id: "partners", label: "Partners" },
  { id: "subscription", label: "Subscription" },
];

// Auth/callback pages render without the Home/Partners/Subscription tabs.
const HIDE_TABS_PATHS = [
  "/app/login",
  "/app/signup",
  "/app/forgot-password",
  "/app/reset-password",
  "/app/auth/callback",
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [activeId, setActiveId] = useState("home");
  // Clean chrome on auth/callback pages: no Home/Partners/Subscription tabs.
  const hideTabs = HIDE_TABS_PATHS.includes(pathname);

  useEffect(() => {
    (async () => {
      try {
        setLoggedIn(!!(await getProfile()));
      } catch {
        setLoggedIn(false);
      }
    })();
  }, [pathname]);

  // Scroll-spy: highlight the tab for the section nearest the top of the
  // viewport (just below the sticky header). Position-based, so it can't
  // get stuck the way an IntersectionObserver on a full-page wrapper can.
  useEffect(() => {
    if (pathname !== "/app") return;
    const sectionTop = (id: string) => {
      const el = document.getElementById(id);
      return el
        ? el.getBoundingClientRect().top + window.scrollY
        : Number.POSITIVE_INFINITY;
    };
    const onScroll = () => {
      const probe = window.scrollY + 140; // below the sticky header
      let id = "home";
      if (sectionTop("partners") <= probe) id = "partners";
      if (sectionTop("subscription") <= probe) id = "subscription";
      setActiveId((prev) => (prev === id ? prev : id));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  const goSection = (id: string) => {
    setActiveId(id);
    if (pathname !== "/app") {
      router.push(`/app#${id}`);
      return;
    }
    if (id === "home") {
      // Unambiguous: the top of the document (id="home" is a marker span).
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const isActive = (id: string) => pathname === "/app" && activeId === id;

  const logout = async () => {
    await signOut();
    router.replace("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0f0c] text-[#e9f2ec]">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#111a14]/90 px-5 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/app" className="flex items-center gap-2" aria-label="WashSMART home">
            <Logo />
            <Brand />
          </Link>
          {!hideTabs && (
          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => goSection(t.id)}
                className={`group relative transition-colors ${
                  isActive(t.id)
                    ? "text-[#48d87c]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t.label}
                <span
                  aria-hidden
                  className={`absolute -bottom-1.5 left-0 h-[3px] w-full origin-left rounded-full bg-[#20a957] transition-transform duration-300 ${
                    isActive(t.id) ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </button>
            ))}
          </nav>
          )}
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
              <NotificationBell />
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

      {!hideTabs && (
      <nav className="sticky bottom-0 border-t border-white/5 bg-[#111a14]/95 px-4 py-3 backdrop-blur-md md:hidden">
        <div className="flex justify-around text-xs">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goSection(t.id)}
              className={
                isActive(t.id)
                  ? "rounded-full bg-[#20a957]/15 px-4 py-1.5 font-bold text-[#48d87c]"
                  : "px-4 py-1.5 text-gray-400"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
      )}
    </div>
  );
}
