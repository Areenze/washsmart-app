/* In-app notifications. Email dispatch plugs into notify() later
 * (Resend) without changing call sites. */

import { getSupabase } from "./supabase";

export interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

function mapN(r: any): Notification {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body ?? "",
    link: r.link,
    read: !!r.read,
    createdAt: r.created_at,
  };
}

/** Queue a notification for any user (uses the SECURITY DEFINER RPC).
 * audience routes it: 'subscriber' (default) or 'partner'. */
export async function notify(
  userId: string,
  kind: string,
  title: string,
  body = "",
  link: string | null = null,
  audience: "subscriber" | "partner" = "subscriber"
): Promise<void> {
  const { error } = await getSupabase().rpc("notify_user", {
    p_user_id: userId,
    p_kind: kind,
    p_title: title,
    p_body: body,
    p_link: link,
    p_audience: audience,
  });
  if (error) throw error;
}

/** Fire-and-forget notify — never throws, safe from any context. */
export function notifySoon(
  userId: string,
  kind: string,
  title: string,
  body = "",
  link: string | null = null,
  audience: "subscriber" | "partner" = "subscriber"
): void {
  notify(userId, kind, title, body, link, audience).catch(() => {});
}

export async function listNotifications(
  userId: string,
  limit = 30,
  audience: "subscriber" | "partner" = "subscriber"
): Promise<Notification[]> {
  const { data, error } = await getSupabase()
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("audience", audience)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as any[]).map(mapN);
}

export async function unreadCount(
  userId: string,
  audience: "subscriber" | "partner" = "subscriber"
): Promise<number> {
  const { count, error } = await getSupabase()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("audience", audience)
    .eq("read", false);
  if (error) return 0;
  return count ?? 0;
}

export async function markAllRead(
  userId: string,
  audience: "subscriber" | "partner" = "subscriber"
): Promise<void> {
  await getSupabase()
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("audience", audience)
    .eq("read", false);
}

export async function markRead(id: string): Promise<void> {
  await getSupabase().from("notifications").update({ read: true }).eq("id", id);
}
