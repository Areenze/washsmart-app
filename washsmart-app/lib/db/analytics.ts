/* First-party analytics & client error monitoring.
 * No third-party tracker, no cookies, no IP storage — a random per-browser
 * session id is the only identifier. Admins read aggregates on /admin/reports.
 */

import { getSupabase } from "./supabase";

const SESSION_KEY = "washsmart_sid";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = window.localStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "";
  }
}

/** Fire-and-forget: record a page view. Never throws. */
export function trackPageView(path: string): void {
  try {
    const ref =
      typeof document !== "undefined" ? document.referrer || null : null;
    // Skip our own admin pages from public funnel stats? No — keep everything,
    // the admin view can filter. Keep the insert tiny.
    getSupabase()
      .from("page_views")
      .insert({
        session_id: getSessionId(),
        path: path.slice(0, 200),
        referrer: ref?.slice(0, 300) ?? null,
      })
      .then(() => {});
  } catch {
    /* never break the app for telemetry */
  }
}

/** Fire-and-forget: record a client-side error. Never throws. */
export function trackClientError(
  message: string,
  stack?: string,
  path?: string
): void {
  try {
    getSupabase()
      .from("client_errors")
      .insert({
        session_id: getSessionId() || null,
        path: (path ?? window.location.pathname).slice(0, 200),
        message: String(message).slice(0, 500),
        stack: stack?.slice(0, 2000) ?? null,
      })
      .then(() => {});
  } catch {
    /* never break the app for telemetry */
  }
}

export interface TrafficDay {
  day: string; // YYYY-MM-DD
  views: number;
  sessions: number;
}

/** Daily views + unique sessions for the last N days (admin). */
export async function getTraffic(days = 30): Promise<TrafficDay[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);
  const { data, error } = await getSupabase()
    .from("page_views")
    .select("session_id,created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true })
    .limit(20000);
  if (error) throw error;
  const byDay = new Map<string, { views: number; sessions: Set<string> }>();
  for (const r of (data ?? []) as any[]) {
    const day = new Date(r.created_at).toISOString().slice(0, 10);
    let d = byDay.get(day);
    if (!d) {
      d = { views: 0, sessions: new Set() };
      byDay.set(day, d);
    }
    d.views += 1;
    if (r.session_id) d.sessions.add(r.session_id);
  }
  const out: TrafficDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const agg = byDay.get(key);
    out.push({
      day: key,
      views: agg?.views ?? 0,
      sessions: agg?.sessions.size ?? 0,
    });
  }
  return out;
}

export interface TopPage {
  path: string;
  views: number;
}

/** Most-viewed paths in the last N days (admin). */
export async function getTopPages(days = 30, limit = 8): Promise<TopPage[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  const { data, error } = await getSupabase()
    .from("page_views")
    .select("path")
    .gte("created_at", since.toISOString())
    .limit(20000);
  if (error) throw error;
  const counts = new Map<string, number>();
  for (const r of (data ?? []) as any[]) {
    const p = r.path || "(unknown)";
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

export interface ClientError {
  id: string;
  path: string | null;
  message: string;
  createdAt: string;
}

/** Recent client errors, newest first (admin). */
export async function getClientErrors(limit = 20): Promise<ClientError[]> {
  const { data, error } = await getSupabase()
    .from("client_errors")
    .select("id,path,message,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    path: r.path,
    message: r.message,
    createdAt: r.created_at,
  }));
}
