/* Support tickets — subscribers report problems; staff resolve them. */

import { getSupabase } from "./supabase";
import { logAdminAction } from "./admin";
import { notifySoon } from "./notifications";

export const TICKET_CATEGORIES: { key: string; label: string }[] = [
  { key: "wash_quality", label: "Poor wash quality" },
  { key: "refused_redemption", label: "Partner refused redemption" },
  { key: "qr_problem", label: "QR / scan problem" },
  { key: "wrong_deduction", label: "Wrong credit deduction" },
  { key: "payment_issue", label: "Payment issue" },
  { key: "partner_unavailable", label: "Partner unavailable" },
  { key: "refund_request", label: "Refund request" },
  { key: "account_problem", label: "Account problem" },
  { key: "other", label: "Other" },
];

export const TICKET_STATUSES = ["open", "investigating", "resolved", "closed"] as const;

export function categoryLabel(key: string) {
  return TICKET_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export interface Ticket {
  id: string;
  subscriberId: string;
  subscriberName: string;
  partnerId: string | null;
  partnerName: string | null;
  washId: string | null;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  internalNotes: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapTicket(r: any): Ticket {
  return {
    id: r.id,
    subscriberId: r.subscriber_id,
    subscriberName: r.subscriber?.name ?? "—",
    partnerId: r.partner_id,
    partnerName: r.partner?.name ?? null,
    washId: r.wash_id,
    category: r.category,
    subject: r.subject,
    description: r.description ?? "",
    status: r.status,
    priority: r.priority ?? "normal",
    internalNotes: r.internal_notes ?? "",
    resolvedAt: r.resolved_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const TICKET_SELECT = "*,subscriber:profiles(name),partner:partners(name)";

export async function createTicket(input: {
  subscriberId: string;
  partnerId?: string | null;
  washId?: string | null;
  category: string;
  subject: string;
  description: string;
}): Promise<Ticket> {
  const priority =
    input.category === "payment_issue" || input.category === "refund_request"
      ? "high"
      : "normal";
  const { data, error } = await getSupabase()
    .from("tickets")
    .insert({
      subscriber_id: input.subscriberId,
      partner_id: input.partnerId ?? null,
      wash_id: input.washId ?? null,
      category: input.category,
      subject: input.subject.trim(),
      description: input.description.trim(),
      priority,
    })
    .select(TICKET_SELECT)
    .single();
  if (error) throw error;
  return mapTicket(data);
}

export async function listMyTickets(subscriberId: string): Promise<Ticket[]> {
  const { data, error } = await getSupabase()
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("subscriber_id", subscriberId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map(mapTicket);
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const { data, error } = await getSupabase()
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapTicket(data) : null;
}

/* ---------------- admin ---------------- */

export async function adminListTickets(status: string): Promise<Ticket[]> {
  let req = getSupabase()
    .from("tickets")
    .select(TICKET_SELECT)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") req = req.eq("status", status);
  const { data, error } = await req;
  if (error) throw error;
  return ((data ?? []) as any[]).map(mapTicket);
}

export async function adminUpdateTicket(
  id: string,
  patch: { status?: string; priority?: string; internalNotes?: string }
): Promise<void> {
  const db = getSupabase();
  const { data: before } = await db
    .from("tickets")
    .select("id,subject,status,subscriber_id")
    .eq("id", id)
    .maybeSingle();
  const cols: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.status) {
    cols.status = patch.status;
    cols.resolved_at =
      patch.status === "resolved" || patch.status === "closed"
        ? new Date().toISOString()
        : null;
  }
  if (patch.priority) cols.priority = patch.priority;
  if (patch.internalNotes !== undefined) cols.internal_notes = patch.internalNotes;
  const { error } = await db.from("tickets").update(cols).eq("id", id);
  if (error) throw error;
  const changes = [
    patch.status ? `status → ${patch.status}` : null,
    patch.priority ? `priority → ${patch.priority}` : null,
    patch.internalNotes !== undefined ? "notes updated" : null,
  ]
    .filter(Boolean)
    .join(", ");
  await logAdminAction(
    "ticket.update",
    "ticket",
    id,
    `"${(before as any)?.subject ?? id}" — ${changes}`
  ).catch(() => {});

  // Tell the subscriber their report moved (status changes only).
  if (patch.status && (before as any)?.subscriber_id) {
    notifySoon(
      (before as any).subscriber_id,
      "ticket_update",
      `Your report was ${patch.status}`,
      `"${(before as any)?.subject ?? "Your report"}"`,
      `/app/support/${id}`
    );
  }
}
