"use client";

/* <Analytics /> — first-party telemetry, mounted once in the root layout.
 * Logs a page view on every route change and captures uncaught client
 * errors. Fire-and-forget; never throws, never blocks rendering. */

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  getSessionId,
  trackClientError,
  trackPageView,
} from "@/lib/db/analytics";

export default function Analytics() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  // Page views on route change.
  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;
    // Small delay so the insert never contends with the page's own data fetch.
    const t = window.setTimeout(() => trackPageView(pathname), 800);
    return () => window.clearTimeout(t);
  }, [pathname]);

  // Global error capture (registered once).
  useEffect(() => {
    getSessionId();
    const onError = (e: ErrorEvent) => {
      trackClientError(e.message || "Unknown error", e.error?.stack);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      trackClientError(
        r instanceof Error ? r.message : String(r ?? "Unhandled rejection"),
        r instanceof Error ? r.stack : undefined
      );
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
