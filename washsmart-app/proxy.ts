import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/* Public-domain holding page.
 * washsmart.ng (and www) show "coming soon" while the app is still in
 * testing. All *.vercel.app hosts keep serving the full app.
 * Emailed auth-link landing pages stay exempt so those links keep working. */

const PUBLIC_HOSTS = new Set(["washsmart.ng", "www.washsmart.ng"]);

// Full pages that must keep working on the public domain (auth links).
const EXEMPT_PAGES = [
  "/coming-soon",
  "/app/auth/callback",
  "/app/reset-password",
  "/agent/reset-password",
  "/partner/reset-password",
];

// Static asset prefixes the holding page (or auth pages) may need.
const EXEMPT_PREFIXES = ["/_next/", "/icons/"];

const EXEMPT_EXACT = new Set([
  "/favicon.ico",
  "/manifest.webmanifest",
  "/sw.js",
  "/robots.txt",
]);

export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  if (!PUBLIC_HOSTS.has(host)) return NextResponse.next();

  const { pathname, searchParams } = req.nextUrl;
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
