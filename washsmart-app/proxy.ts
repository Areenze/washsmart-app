import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* Public-domain holding page + partner door.
 * washsmart.ng (and www) show "coming soon" while the app is still in
 * testing. All *.vercel.app hosts keep serving the full app.
 * Emailed auth-link landing pages stay exempt so those links keep working.
 * /partner stays reachable on the public domain (it is login-gated) so
 * approved partners are never stuck behind the holding page, and
 * partner.washsmart.ng is the partners' own door: it serves the partner
 * experience directly (short paths map into /partner/*) and is never
 * gated. */

const PUBLIC_HOSTS = new Set(["washsmart.ng", "www.washsmart.ng"]);
const PARTNER_HOST = "partner.washsmart.ng";

// Full pages that must keep working on the public domain (auth links,
// plus the login-gated partner experience).
const EXEMPT_PAGES = [
  "/coming-soon",
  "/app/auth/callback",
  "/app/reset-password",
  "/agent/reset-password",
  "/partner/reset-password",
  "/partner",
];

// Static asset prefixes the holding page (or auth pages) may need.
const EXEMPT_PREFIXES = ["/_next/", "/icons/"];

const EXEMPT_EXACT = new Set([
  "/favicon.ico",
  "/manifest.webmanifest",
  "/manifest.json",
  "/manifest-partner.json",
  "/sw.js",
  "/robots.txt",
]);

export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  const { pathname, searchParams } = req.nextUrl;

  // Partner door: partner.washsmart.ng serves /partner/* directly.
  if (host === PARTNER_HOST) {
    if (
      EXEMPT_EXACT.has(pathname) ||
      EXEMPT_PREFIXES.some((p) => pathname.startsWith(p)) ||
      pathname.startsWith("/api/") ||
      pathname === "/partner" ||
      pathname.startsWith("/partner/")
    )
      return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/partner" : `/partner${pathname}`;
    return NextResponse.rewrite(url);
  }

  if (!PUBLIC_HOSTS.has(host)) return NextResponse.next();

  if (EXEMPT_EXACT.has(pathname)) return NextResponse.next();
  if (EXEMPT_PREFIXES.some((p) => pathname.startsWith(p)))
    return NextResponse.next();
  if (EXEMPT_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/")))
    return NextResponse.next();
  if (searchParams.has("code")) return NextResponse.next(); // Supabase PKCE link

  const url = req.nextUrl.clone();
  url.pathname = "/coming-soon";
  url.search = "";
  return NextResponse.rewrite(url);
}

export const config = { matcher: ["/:path*"] };
