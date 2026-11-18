"use client";

/* Pull-to-refresh + a header refresh button for the installed (standalone)
 * apps. Standalone PWAs have no browser chrome, so there is no reload
 * button and no native pull-to-refresh — this fills both gaps:
 *
 * - PullToRefresh: touch-only. A pull down starting at the very top of
 *   the page drags in a pill ("Pull to refresh" → "Release to refresh");
 *   releasing past the threshold reloads the page. Navigations are
 *   network-first in the service worker, so a reload is genuinely fresh.
 *   Elements can opt out with data-no-ptr.
 * - RefreshButton: the same reload as a tappable button. Used in the
 *   subscriber header (which wraps, so it always fits); the partner and
 *   agent headers are exactly full at 320px, so those apps rely on the
 *   gesture alone rather than pushing Log out off-screen.
 */

import { useEffect, useState } from "react";

const THRESHOLD = 56; // resisted px of pull that arms the refresh
const MAX_PULL = 84;

function RefreshIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

export function RefreshButton() {
  return (
    <button
      type="button"
      aria-label="Refresh"
      title="Refresh"
      onClick={() => window.location.reload()}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#20a957]/10 text-[#48d87c] transition hover:bg-[#20a957]/20"
    >
      <RefreshIcon />
    </button>
  );
}

export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (refreshing) return;
    let startY: number | null = null;
    let current = 0;

    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 0) {
        startY = null;
        return;
      }
      if ((e.target as HTMLElement | null)?.closest?.("[data-no-ptr]")) {
        startY = null;
        return;
      }
      startY = e.touches[0].clientY;
      current = 0;
    };
    const onMove = (e: TouchEvent) => {
      if (startY === null) return;
      if (window.scrollY > 0) {
        current = 0;
        setPull(0);
        return;
      }
      const dy = e.touches[0].clientY - startY;
      current = dy > 0 ? Math.min(dy * 0.45, MAX_PULL) : 0;
      setPull(current);
    };
    const onEnd = () => {
      if (startY !== null && current >= THRESHOLD) {
        setRefreshing(true);
        setPull(THRESHOLD);
        window.setTimeout(() => window.location.reload(), 200);
      } else {
        setPull(0);
      }
      startY = null;
      current = 0;
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [refreshing]);

  if (pull <= 0 && !refreshing) return null;
  const progress = Math.min(pull / THRESHOLD, 1);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      style={{
        transform: `translateY(${pull - 46}px)`,
        opacity: pull > 4 || refreshing ? 1 : 0,
        transition: pull === 0 ? "transform 0.25s ease" : undefined,
      }}
    >
      <div className="mt-2 flex items-center gap-2 rounded-full border border-white/10 bg-[#111a14] px-3.5 py-2 shadow-lg">
        <span
          className={refreshing ? "animate-spin text-[#48d87c]" : "text-[#48d87c]"}
          style={
            refreshing
              ? undefined
              : { transform: `rotate(${progress * 270}deg)`, display: "inline-flex" }
          }
        >
          <RefreshIcon />
        </span>
        <span className="text-xs font-bold text-[#e9f2ec]">
          {refreshing
            ? "Refreshing…"
            : progress >= 1
              ? "Release to refresh"
              : "Pull to refresh"}
        </span>
      </div>
    </div>
  );
}
