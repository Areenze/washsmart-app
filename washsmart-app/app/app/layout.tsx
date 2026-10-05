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
import { getProfile, getWashSummary, signOut } from "@/lib/db/store";
import { getSupabase } from "@/lib/db/supabase";

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
  const [showAdmin, setShowAdmin] = useState(false);
  // Wash balance pill in the header: null = unknown (hidden, never flashes a
  // wrong number); kept on transient failure like the rest of auth state.
  const [washBalance, setWashBalance] = useState<number | null>(null);
  // Clean chrome on auth/callback pages: no Home/Partners/Subscription tabs.
  const hideTabs = HIDE_TABS_PATHS.includes(pathname);

  // Auth state is tri-state per check: true (authed), false (definitely
  // logged out), null (check failed — keep previous state). A transient
  // network failure must never flip a logged-in user to logged-out, hide the
  // admin pill, or bounce /app to /. The redirect decision always uses the
  // FRESH profile, so a just-completed sign-in navigating to /app is never
  // bounced by stale state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let authed: boolean | null;
      try {
        authed = !!(await getProfile());
      } catch {
        authed = null;
      }
      if (cancelled || authed === null) return;
      setLoggedIn(authed);
      if (authed) {
        try {
          const { data, error } = await getSupabase().rpc("is_admin");
          if (!cancelled && !error) setShowAdmin(data === true);
        } catch {
          /* keep previous showAdmin on network failure */
        }
        try {
          const s = await getWashSummary();
          if (!cancelled) setWashBalance(s?.totalRemaining ?? 0);
        } catch {
          /* keep previous washBalance on network failure */
        }
      } else {
        setShowAdmin(false);
        setWashBalance(null);
      }
      if (cancelled) return;
      // The subscriber home (/app) is for logged-in subscribers only.
      // Logged-out visitors go to the landing page — so the browser back
      // button from the login page returns to / instead of a logged-out
      // subscriber home.
      if (!authed && pathname === "/app") router.replace("/");
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

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
    <div className="subscriber-light flex min-h-screen flex-col bg-[#0a0f0c] text-[#e9f2ec]">
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
              {washBalance !== null && (
                <Link
                  href="/app#subscription"
                  title={`${washBalance} ${washBalance === 1 ? "wash" : "washes"} remaining`}
                  aria-label={`${washBalance} ${washBalance === 1 ? "wash" : "washes"} remaining`}
                  className="rounded-full bg-[#20a957]/15 px-3 py-2 text-xs font-bold text-[#48d87c] transition-colors hover:bg-[#20a957]/25"
                >
                  🧽 {washBalance}
                  <span className="hidden sm:inline">
                    {" "}
                    {washBalance === 1 ? "wash" : "washes"}
                  </span>
                </Link>
              )}
              {showAdmin && (
                <Link
                  href="/admin"
                  className="rounded-full bg-[#f5b942]/15 px-4 py-2 text-xs font-bold text-[#f5b942] transition-colors hover:bg-[#f5b942]/25"
                >
                  Admin
                </Link>
              )}
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
