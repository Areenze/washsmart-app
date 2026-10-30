import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* Public-domain holding page + role doors.
 * washsmart.ng (and www) show "coming soon" while the app is still in
 * testing. All *.vercel.app hosts keep serving the full app.
 * Emailed auth-link landing pages stay exempt so those links keep working.
 * /partner and /agent stay reachable on the public domain (login-gated) so
 * partners and agents are never stuck behind the holding page, and
 * partner.washsmart.ng / agent.washsmart.ng are their own doors: each
 * serves its experience directly (short paths map into the segment) and
 * is never gated. */

const PUBLIC_HOSTS = new Set(["washsmart.ng", "www.washsmart.ng"]);

// Role doors: each subdomain serves its segment directly (short paths map
// into the segment) and is never gated.
const ROLE_DOORS: Record<string, string> = {
  "partner.washsmart.ng": "/partner",
  "agent.washsmart.ng": "/agent",
};

// Full pages that must keep working on the public domain (auth links,
// plus the login-gated partner and agent experiences).
const EXEMPT_PAGES = [
  "/coming-soon",
  "/app/auth/callback",
  "/app/reset-password",
  "/agent/reset-password",
  "/partner/reset-password",
  "/partner",
  "/agent",
];

// Static asset prefixes the holding page (or auth pages) may need.
const EXEMPT_PREFIXES = ["/_next/", "/icons/"];

const EXEMPT_EXACT = new Set([
  "/favicon.ico",
  "/manifest.webmanifest",
  "/manifest.json",
  "/manifest-partner.json",
  "/manifest-agent.json",
  "/sw.js",
  "/robots.txt",
]);

export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  const { pathname, searchParams } = req.nextUrl;

  // Role doors: partner.washsmart.ng serves /partner/* directly,
  // agent.washsmart.ng serves /agent/* directly.
  const doorBase = ROLE_DOORS[host];
  if (doorBase) {
    if (
      EXEMPT_EXACT.has(pathname) ||
      EXEMPT_PREFIXES.some((p) => pathname.startsWith(p)) ||
      pathname.startsWith("/api/") ||
      pathname === doorBase ||
      pathname.startsWith(doorBase + "/")
    )
      return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? doorBase : `${doorBase}${pathname}`;
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
