/* Admin data layer — the WashSMART network control system.
 * Every function here requires an admin session (enforced by RLS via
 * public.is_admin()). Sensitive mutations write to admin_audit_log. */

import { getSupabase } from "./supabase";

export const ngn = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

async function adminId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser();
  return data.user?.id ?? null;
}

export async function logAdminAction(
  action: string,
  entity: string,
  entity_id: string,
  detail: string
): Promise<void> {
  const { error } = await getSupabase().from("admin_audit_log").insert({
    admin_id: await adminId(),
    action,
    entity,
    entity_id,
    detail,
  });
  if (error) throw error;
}

/* ---------------- dashboard ---------------- */

export interface DashboardStats {
  totalSubscribers: number;
  activeSubscriptions: number;
  creditsIssued: number;
  creditsRedeemed: number;
  creditsRemaining: number;
  totalWashes: number;
  totalRevenue: number;
  pendingPayouts: number;
  activePartners: number;
  pendingApplications: number;
  newSubscribers7d: number;
}

export async function adminDashboardStats(): Promise<DashboardStats> {
  const db = getSupabase();
  const [
    profiles,
    subs,
    washes,
    payments,
    ledger,
    approvedPartners,
    apps,
  ] = await Promise.all([
    db.from("profiles").select("id,created_at", { count: "exact" }),
    db.from("subscriptions").select("status,washes_total,washes_remaining"),
    db.from("wash_transactions").select("id", { count: "exact", head: true }),
    db.from("payments").select("amount"),
    db
      .from("ledger_entries")
      .select("amount,status")
      .eq("kind", "wash_earning"),
    db
      .from("partners")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved"),
    db
      .from("partner_applications")
      .select("ref", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const subRows = subs.data ?? [];
  const active = subRows.filter((s) => s.status === "active");
  const weekAgo = Date.now() - 7 * 864e5;
  const new7d = (profiles.data ?? []).filter(
    (p) => new Date(p.created_at).getTime() > weekAgo
  ).length;

  return {
    totalSubscribers: profiles.count ?? 0,
    activeSubscriptions: active.length,
    creditsIssued: subRows.reduce((s, r) => s + (r.washes_total ?? 0), 0),
    creditsRedeemed:
      subRows.reduce((s, r) => s + (r.washes_total ?? 0), 0) -
      subRows.reduce((s, r) => s + (r.washes_remaining ?? 0), 0),
    creditsRemaining: active.reduce(
      (s, r) => s + (r.washes_remaining ?? 0),
      0
    ),
    totalWashes: washes.count ?? 0,
    totalRevenue: (payments.data ?? []).reduce(
      (s, p) => s + (p.amount ?? 0),
      0
    ),
    pendingPayouts: (ledger.data ?? [])
      .filter((l) => l.status === "pending_settlement")
      .reduce((s, l) => s + (l.amount ?? 0), 0),
    activePartners: approvedPartners.count ?? 0,
    pendingApplications: apps.count ?? 0,
    newSubscribers7d: new7d,
  };
}

export interface ActivityItem {
  kind: "payment" | "wash" | "application" | "subscription" | "settlement";
  text: string;
  at: string;
  href: string;
}

export async function adminActivity(limit = 12): Promise<ActivityItem[]> {
  const db = getSupabase();
  const [pays, wash, apps, subs] = await Promise.all([
    db
      .from("payments")
      .select("amount,plan_name,paid_at,owner:profiles(name)")
      .order("paid_at", { ascending: false })
      .limit(5),
    db
      .from("wash_transactions")
      .select("redeemed_at,subscriber:profiles(name),partner:partners(name)")
      .order("redeemed_at", { ascending: false })
      .limit(5),
    db
      .from("partner_applications")
      .select("ref,created_at,payload")
      .order("created_at", { ascending: false })
      .limit(4),
    db
      .from("subscriptions")
      .select("plan_name,amount,created_at,owner:profiles(name)")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const items: ActivityItem[] = [];
  for (const p of pays.data ?? []) {
    const name = (p.owner as any)?.name ?? "Someone";
    items.push({
      kind: "payment",
      text: `${name} paid ${ngn(p.amount)} — ${p.plan_name}`,
      at: p.paid_at,
      href: "/admin/payments",
    });
  }
  for (const w of wash.data ?? []) {
    const s = (w.subscriber as any)?.name ?? "A subscriber";
    const pt = (w.partner as any)?.name ?? "a partner";
    items.push({
      kind: "wash",
      text: `${s} redeemed 1 credit at ${pt}`,
      at: w.redeemed_at,
      href: "/admin/washes",
    });
  }
  for (const a of apps.data ?? []) {
    const biz =
      (a.payload as any)?.business?.carWashName ??
      (a.payload as any)?.carWashName ??
      "A partner";
    items.push({
      kind: "application",
      text: `New partner application — ${biz}`,
      at: a.created_at,
      href: `/admin/applications/${a.ref}`,
    });
  }
  for (const s of subs.data ?? []) {
    const name = (s.owner as any)?.name ?? "Someone";
    items.push({
      kind: "subscription",
      text: `${name} subscribed — ${s.plan_name} (${ngn(s.amount)})`,
      at: s.created_at,
      href: "/admin/subscriptions",
    });
  }
  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit);
}

/* ---------------- subscribers ---------------- */

export interface AdminSubscriberRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  area: string | null;
  createdAt: string;
  isAdmin: boolean;
  planName: string | null;
  planStatus: string | null;
  washesRemaining: number;
  washesTotal: number;
  renewsAt: string | null;
  totalWashes: number;
  totalPaid: number;
  vehicleCount: number;
}

export async function adminListSubscribers(
  q: string
): Promise<AdminSubscriberRow[]> {
  const db = getSupabase();
  const query = q.trim().toLowerCase();
  let req = db
    .from("profiles")
    .select("id,name,email,phone,area,created_at,is_admin")
    .order("created_at", { ascending: false })
    .limit(200);
  if (query) {
    req = req.or(
      `name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`
    );
  }
  const { data: profiles, error } = await req;
  if (error) throw error;
  const ids = (profiles ?? []).map((p) => p.id);
  if (ids.length === 0) return [];

  const [subs, wash, pays, vehs] = await Promise.all([
    db
      .from("subscriptions")
      .select("owner_id,plan_name,status,washes_remaining,washes_total,renews_at")
      .in("owner_id", ids),
    db.from("wash_transactions").select("subscriber_id").in("subscriber_id", ids),
    db.from("payments").select("owner_id,amount").in("owner_id", ids),
    db.from("vehicles").select("owner_id").in("owner_id", ids),
  ]);

  const byOwner = <T,>(rows: T[] | null, key: (r: T) => string) => {
    const m = new Map<string, T[]>();
    for (const r of rows ?? []) {
      const k = key(r);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return m;
  };
  const subMap = byOwner(subs.data, (s: any) => s.owner_id);
  const washMap = byOwner(wash.data, (w: any) => w.subscriber_id);
  const payMap = byOwner(pays.data, (p: any) => p.owner_id);
  const vehMap = byOwner(vehs.data, (v: any) => v.owner_id);

  return (profiles ?? []).map((p) => {
    const ss = (subMap.get(p.id) ?? []).sort(
      (a: any, b: any) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    );
    const cur = ss.find((s: any) => s.status === "active") ?? ss[0];
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      area: p.area ?? null,
      createdAt: p.created_at,
      isAdmin: !!p.is_admin,
      planName: cur?.plan_name ?? null,
      planStatus: cur?.status ?? null,
      washesRemaining: cur?.washes_remaining ?? 0,
      washesTotal: cur?.washes_total ?? 0,
      renewsAt: cur?.renews_at ?? null,
      totalWashes: (washMap.get(p.id) ?? []).length,
      totalPaid: (payMap.get(p.id) ?? []).reduce(
        (s: number, x: any) => s + (x.amount ?? 0),
        0
      ),
      vehicleCount: (vehMap.get(p.id) ?? []).length,
    };
  });
}

export interface AdminSubscriberDetail {
  profile: {
    id: string;
    name: string;
    email: string;
    phone: string;
    area: string | null;
    createdAt: string;
    isAdmin: boolean;
  };
  vehicles: { id: string; label: string; plate: string | null; color: string | null }[];
  subscriptions: {
    id: string;
    planName: string;
    amount: number;
    status: string;
    washesTotal: number;
    washesRemaining: number;
    startedAt: string;
    renewsAt: string;
  }[];
  washes: {
    id: string;
    at: string;
    partnerName: string;
    partnerId: string;
    type: string;
    payout: number;
  }[];
  payments: {
    id: string;
    amount: number;
    planName: string;
    method: string;
    reference: string;
    paidAt: string;
  }[];
  reviews: { id: string; partnerName: string; rating: number; body: string; at: string }[];
}

export async function adminSubscriberDetail(
  id: string
): Promise<AdminSubscriberDetail | null> {
  const db = getSupabase();
  const { data: p, error } = await db
    .from("profiles")
    .select("id,name,email,phone,area,created_at,is_admin")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!p) return null;

  const [vehs, subs, wash, pays, revs] = await Promise.all([
    db.from("vehicles").select("id,label,plate,color").eq("owner_id", id),
    db
      .from("subscriptions")
      .select("id,plan_name,amount,status,washes_total,washes_remaining,started_at,renews_at")
      .eq("owner_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("wash_transactions")
      .select("id,redeemed_at,type,payout,partner_id,partner:partners(name)")
      .eq("subscriber_id", id)
      .order("redeemed_at", { ascending: false })
      .limit(50),
    db
      .from("payments")
      .select("id,amount,plan_name,method,reference,paid_at")
      .eq("owner_id", id)
      .order("paid_at", { ascending: false }),
    db
      .from("reviews")
      .select("id,rating,body,created_at,partner:partners(name)")
      .eq("subscriber_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    profile: {
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      area: p.area ?? null,
      createdAt: p.created_at,
      isAdmin: !!p.is_admin,
    },
    vehicles: (vehs.data ?? []).map((v: any) => ({
      id: v.id,
      label: v.label,
      plate: v.plate,
      color: v.color,
    })),
    subscriptions: (subs.data ?? []).map((s: any) => ({
      id: s.id,
      planName: s.plan_name,
      amount: s.amount,
      status: s.status,
      washesTotal: s.washes_total,
      washesRemaining: s.washes_remaining,
      startedAt: s.started_at,
      renewsAt: s.renews_at,
    })),
    washes: (wash.data ?? []).map((w: any) => ({
      id: w.id,
      at: w.redeemed_at,
      partnerName: w.partner?.name ?? w.partner_id,
      partnerId: w.partner_id,
      type: w.type,
      payout: w.payout,
    })),
    payments: (pays.data ?? []).map((x: any) => ({
      id: x.id,
      amount: x.amount,
      planName: x.plan_name,
      method: x.method,
      reference: x.reference,
      paidAt: x.paid_at,
    })),
    reviews: (revs.data ?? []).map((r: any) => ({
      id: r.id,
      partnerName: r.partner?.name ?? "—",
      rating: r.rating,
      body: r.body,
      at: r.created_at,
    })),
  };
}

export async function adminCancelSubscription(
  subscriptionId: string,
  reason: string
): Promise<void> {
  const db = getSupabase();
  const { data: sub } = await db
    .from("subscriptions")
    .select("id,plan_name,owner_id")
    .eq("id", subscriptionId)
    .maybeSingle();
  const { error } = await db
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("id", subscriptionId);
  if (error) throw error;
  await logAdminAction(
    "subscription.cancel",
    "subscription",
    subscriptionId,
    `Cancelled ${sub?.plan_name ?? "subscription"} (${subscriptionId}). Reason: ${reason}`
  );
}

/* ---------------- partners ---------------- */

export interface AdminPartnerRow {
  id: string;
  name: string;
  area: string;
  status: string;
  phone: string;
  rating: number;
  reviewCount: number;
  washes: number;
  earnings: number;
  settlementRate: number;
}

export async function adminListPartners(
  q: string,
  status: string
): Promise<AdminPartnerRow[]> {
  const db = getSupabase();
  const query = q.trim().toLowerCase();
  let req = db
    .from("partners")
    .select("id,name,area,status,phone,rating,reviews,settlement_rate")
    .order("name")
    .limit(200);
  if (status !== "all") req = req.eq("status", status);
  if (query) req = req.or(`name.ilike.%${query}%,area.ilike.%${query}%`);
  const { data, error } = await req;
  if (error) throw error;
  const ids = (data ?? []).map((p: any) => p.id);
  const wash =
    ids.length > 0
      ? await db.from("wash_transactions").select("partner_id,payout").in("partner_id", ids)
      : { data: [] as any[] };

  const agg = new Map<string, { n: number; earn: number }>();
  for (const w of (wash as any).data ?? []) {
    const a = agg.get(w.partner_id) ?? { n: 0, earn: 0 };
    a.n += 1;
    a.earn += w.payout ?? 0;
    agg.set(w.partner_id, a);
  }
  return (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    area: p.area ?? "—",
    status: p.status,
    phone: p.phone ?? "—",
    rating: Number(p.rating ?? 5),
    reviewCount: p.reviews ?? 0,
    washes: agg.get(p.id)?.n ?? 0,
    earnings: agg.get(p.id)?.earn ?? 0,
    settlementRate: p.settlement_rate ?? 0,
  }));
}

export interface AdminPartnerDetail {
  partner: any;
  washes: { id: string; at: string; subscriberName: string; type: string; payout: number }[];
  reviews: { id: string; subscriberName: string; rating: number; body: string; at: string }[];
  settlements: any[];
  stats: { totalWashes: number; totalEarnings: number; thisMonthWashes: number; avgRating: number };
}

export async function adminPartnerDetail(
  id: string
): Promise<AdminPartnerDetail | null> {
  const db = getSupabase();
  const { data: p, error } = await db
    .from("partners")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!p) return null;

  const [wash, revs, settles] = await Promise.all([
    db
      .from("wash_transactions")
      .select("id,redeemed_at,type,payout,subscriber:profiles(name)")
      .eq("partner_id", id)
      .order("redeemed_at", { ascending: false })
      .limit(100),
    db
      .from("reviews")
      .select("id,rating,body,created_at,subscriber:profiles(name)")
      .eq("partner_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    db
      .from("settlements")
      .select("*")
      .eq("partner_id", id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const wRows = (wash.data ?? []) as any[];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return {
    partner: p,
    washes: wRows.map((w) => ({
      id: w.id,
      at: w.redeemed_at,
      subscriberName: w.subscriber?.name ?? "—",
      type: w.type,
      payout: w.payout,
    })),
    reviews: ((revs.data ?? []) as any[]).map((r) => ({
      id: r.id,
      subscriberName: r.subscriber?.name ?? "—",
      rating: r.rating,
      body: r.body,
      at: r.created_at,
    })),
    settlements: settles.data ?? [],
    stats: {
      totalWashes: wRows.length,
      totalEarnings: wRows.reduce((s, w) => s + (w.payout ?? 0), 0),
      thisMonthWashes: wRows.filter(
        (w) => new Date(w.redeemed_at) >= monthStart
      ).length,
      avgRating: Number(p.rating ?? 5),
    },
  };
}

/* ---------------- washes / payments / credits ---------------- */

export interface AdminWashRow {
  id: string;
  at: string;
  subscriberName: string;
  subscriberId: string;
  partnerName: string;
  partnerId: string;
  type: string;
  payout: number;
}

export async function adminListWashes(
  q: string,
  limit = 100
): Promise<AdminWashRow[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from("wash_transactions")
    .select(
      "id,redeemed_at,type,payout,partner_id,subscriber_id,subscriber:profiles(name),partner:partners(name)"
    )
    .order("redeemed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const query = q.trim().toLowerCase();
  const rows = ((data ?? []) as any[]).map((w) => ({
    id: w.id,
    at: w.redeemed_at,
    subscriberName: w.subscriber?.name ?? "—",
    subscriberId: w.subscriber_id,
    partnerName: w.partner?.name ?? w.partner_id,
    partnerId: w.partner_id,
    type: w.type,
    payout: w.payout,
  }));
  if (!query) return rows;
  return rows.filter(
    (r) =>
      r.subscriberName.toLowerCase().includes(query) ||
      r.partnerName.toLowerCase().includes(query) ||
      r.id.toLowerCase().includes(query)
  );
}

export interface AdminPaymentRow {
  id: string;
  amount: number;
  planName: string;
  method: string;
  reference: string;
  paidAt: string;
  subscriberName: string;
  subscriberId: string;
}

export async function adminListPayments(
  q: string,
  limit = 100
): Promise<AdminPaymentRow[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from("payments")
    .select("id,amount,plan_name,method,reference,paid_at,owner_id,owner:profiles(name)")
    .order("paid_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const query = q.trim().toLowerCase();
  const rows = ((data ?? []) as any[]).map((x) => ({
    id: x.id,
    amount: x.amount,
    planName: x.plan_name,
    method: x.method,
    reference: x.reference,
    paidAt: x.paid_at,
    subscriberName: x.owner?.name ?? "—",
    subscriberId: x.owner_id,
  }));
  if (!query) return rows;
  return rows.filter(
    (r) =>
      r.subscriberName.toLowerCase().includes(query) ||
      r.reference.toLowerCase().includes(query) ||
      r.planName.toLowerCase().includes(query)
  );
}

export interface CreditOverview {
  issued: number;
  redeemed: number;
  remaining: number;
  expired: number;
  rows: {
    subscriberName: string;
    subscriberId: string;
    planName: string;
    status: string;
    issued: number;
    redeemed: number;
    remaining: number;
    renewsAt: string;
  }[];
}

export async function adminCreditOverview(): Promise<CreditOverview> {
  const db = getSupabase();
  const { data: subs, error } = await db
    .from("subscriptions")
    .select("owner_id,plan_name,status,washes_total,washes_remaining,renews_at,owner:profiles(name)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  const rows = ((subs ?? []) as any[]).map((s) => ({
    subscriberName: s.owner?.name ?? "—",
    subscriberId: s.owner_id,
    planName: s.plan_name,
    status: s.status,
    issued: s.washes_total ?? 0,
    redeemed: (s.washes_total ?? 0) - (s.washes_remaining ?? 0),
    remaining: s.status === "active" ? (s.washes_remaining ?? 0) : 0,
    renewsAt: s.renews_at,
  }));
  return {
    issued: rows.reduce((s, r) => s + r.issued, 0),
    redeemed: rows.reduce((s, r) => s + r.redeemed, 0),
    remaining: rows.reduce((s, r) => s + r.remaining, 0),
    expired: rows
      .filter((r) => r.status === "expired")
      .reduce((s, r) => s + (r.issued - r.redeemed), 0),
    rows,
  };
}

/* ---------------- subscriptions ---------------- */

export interface AdminSubscriptionRow {
  id: string;
  subscriberName: string;
  subscriberId: string;
  planName: string;
  amount: number;
  status: string;
  washesTotal: number;
  washesRemaining: number;
  startedAt: string;
  renewsAt: string;
}

export async function adminListSubscriptions(
  status: string
): Promise<AdminSubscriptionRow[]> {
  const db = getSupabase();
  let req = db
    .from("subscriptions")
    .select(
      "id,plan_name,amount,status,washes_total,washes_remaining,started_at,renews_at,owner_id,owner:profiles(name)"
    )
    .order("created_at", { ascending: false })
    .limit(300);
  if (status !== "all") req = req.eq("status", status);
  const { data, error } = await req;
  if (error) throw error;
  return ((data ?? []) as any[]).map((s) => ({
    id: s.id,
    subscriberName: s.owner?.name ?? "—",
    subscriberId: s.owner_id,
    planName: s.plan_name,
    amount: s.amount,
    status: s.status,
    washesTotal: s.washes_total,
    washesRemaining: s.washes_remaining,
    startedAt: s.started_at,
    renewsAt: s.renews_at,
  }));
}

/* ---------------- settlements ---------------- */

export interface AdminSettlementRow {
  id: string;
  partnerId: string;
  partnerName: string;
  period: string;
  washes: number;
  payable: number;
  status: string;
  settlementDate: string;
  paidAt: string | null;
}

export interface PendingAccrual {
  partnerId: string;
  partnerName: string;
  washes: number;
  gross: number;
  fee: number;
  payable: number;
}

/** Partners with wash earnings accrued but not yet in any settlement. */
export async function adminPendingAccruals(): Promise<PendingAccrual[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from("ledger_entries")
    .select("partner_id,amount,partner:partners(name)")
    .eq("kind", "wash_earning")
    .eq("status", "pending_settlement");
  if (error) throw error;
  const m = new Map<string, PendingAccrual>();
  for (const l of (data ?? []) as any[]) {
    const a = m.get(l.partner_id) ?? {
      partnerId: l.partner_id,
      partnerName: l.partner?.name ?? l.partner_id,
      washes: 0,
      gross: 0,
      fee: 0,
      payable: 0,
    };
    a.washes += 1;
    a.gross += l.amount ?? 0;
    m.set(l.partner_id, a);
  }
  return [...m.values()].map((a) => {
    const fee = Math.round(a.gross * 0.1); // 10% WashSMART fee (configurable in Settings, phase 2)
    return { ...a, fee, payable: a.gross - fee };
  });
}

/**
 * Close the current accrual window for a partner: create a pending
 * settlement from their pending_settlement ledger entries and move those
 * entries to 'settled' (tied to this settlement's period window).
 */
export async function adminGenerateSettlement(
  partnerId: string
): Promise<string> {
  const db = getSupabase();
  const accruals = await adminPendingAccruals();
  const a = accruals.find((x) => x.partnerId === partnerId);
  if (!a || a.washes === 0)
    throw new Error("No pending wash earnings for this partner.");

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = now;
  const period = now.toLocaleString("en-NG", {
    month: "long",
    year: "numeric",
  });
  const settleDate = new Date(now.getFullYear(), now.getMonth() + 1, 5);

  const { count } = await db
    .from("settlements")
    .select("id", { count: "exact", head: true });
  const id = `WS-SET-${String((count ?? 0) + 1).padStart(6, "0")}`;

  const { error } = await db.from("settlements").insert({
    id,
    partner_id: partnerId,
    period,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    washes: a.washes,
    gross: a.gross,
    washsmart_fee: a.fee,
    adjustments: 0,
    payable: a.payable,
    status: "pending",
    settlement_date: settleDate.toISOString(),
  });
  if (error) throw error;

  // Move the accrued entries into this settlement (no double-counting).
  const { error: ledgerError } = await db
    .from("ledger_entries")
    .update({ status: "settled" })
    .eq("partner_id", partnerId)
    .eq("kind", "wash_earning")
    .eq("status", "pending_settlement")
    .lte("created_at", periodEnd.toISOString());
  if (ledgerError) throw ledgerError;

  await logAdminAction(
    "settlement.generate",
    "settlement",
    id,
    `Generated ${a.partnerName} ${period} — ${a.washes} washes, ${ngn(a.gross)} gross, ${ngn(a.fee)} fee, ${ngn(a.payable)} payable`
  );
  return id;
}

export async function adminListSettlements(
  status: string
): Promise<AdminSettlementRow[]> {
  const db = getSupabase();
  let req = db
    .from("settlements")
    .select("id,partner_id,period,washes,payable,status,settlement_date,paid_at,partner:partners(name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") req = req.eq("status", status);
  const { data, error } = await req;
  if (error) throw error;
  return ((data ?? []) as any[]).map((s) => ({
    id: s.id,
    partnerId: s.partner_id,
    partnerName: s.partner?.name ?? s.partner_id,
    period: s.period,
    washes: s.washes,
    payable: s.payable,
    status: s.status,
    settlementDate: s.settlement_date,
    paidAt: s.paid_at,
  }));
}

export async function adminApproveSettlement(id: string): Promise<void> {
  const db = getSupabase();
  const { data: s } = await db
    .from("settlements")
    .select("id,partner_id,payable,period,status,partner:partners(name)")
    .eq("id", id)
    .maybeSingle();
  if (!s) throw new Error("Settlement not found");
  if ((s as any).status !== "pending") throw new Error("Only pending settlements can be approved");
  const { error } = await db
    .from("settlements")
    .update({ status: "approved" })
    .eq("id", id);
  if (error) throw error;
  // Ledger entries were moved pending_settlement → settled at generation time.
  await logAdminAction(
    "settlement.approve",
    "settlement",
    id,
    `Approved ${(s as any).partner?.name ?? s.partner_id} ${s.period} — ${ngn(s.payable)} payable`
  );
}

export async function adminMarkSettlementPaid(
  id: string,
  reference: string
): Promise<void> {
  const db = getSupabase();
  const { data: s } = await db
    .from("settlements")
    .select("id,partner_id,payable,period,status,period_start,period_end,partner:partners(name)")
    .eq("id", id)
    .maybeSingle();
  if (!s) throw new Error("Settlement not found");
  if ((s as any).status !== "approved")
    throw new Error("Only approved settlements can be marked paid");
  const { error } = await db
    .from("settlements")
    .update({ status: "paid", paid_at: new Date().toISOString(), note: reference })
    .eq("id", id);
  if (error) throw error;
  // Close out this settlement's ledger entries via its period window.
  await db
    .from("ledger_entries")
    .update({ status: "paid" })
    .eq("partner_id", (s as any).partner_id)
    .eq("kind", "wash_earning")
    .eq("status", "settled")
    .gte("created_at", (s as any).period_start)
    .lte("created_at", (s as any).period_end);
  await logAdminAction(
    "settlement.paid",
    "settlement",
    id,
    `Paid ${(s as any).partner?.name ?? s.partner_id} ${s.period} — ${ngn(s.payable)}. Ref: ${reference}`
  );
}

/* ---------------- inspections ---------------- */

export const INSPECTION_ITEMS: { key: string; label: string }[] = [
  { key: "washing_area", label: "Washing area" },
  { key: "water", label: "Water availability" },
  { key: "drainage", label: "Drainage" },
  { key: "waiting_area", label: "Customer waiting area" },
  { key: "safety", label: "Safety" },
  { key: "cleanliness", label: "Cleanliness" },
  { key: "equipment", label: "Equipment" },
  { key: "service_quality", label: "Service quality" },
  { key: "hours", label: "Operating hours" },
  { key: "location", label: "Location verified" },
];

export interface ChecklistEntry {
  pass: boolean | null;
  note: string;
}

export interface Inspection {
  id: string;
  applicationRef: string;
  partnerId: string | null;
  checklist: Record<string, ChecklistEntry>;
  score: number;
  inspectorName: string;
  notes: string;
  status: "in_progress" | "passed" | "failed";
  inspectedAt: string | null;
  updatedAt: string;
}

export function emptyChecklist(): Record<string, ChecklistEntry> {
  const c: Record<string, ChecklistEntry> = {};
  for (const item of INSPECTION_ITEMS) c[item.key] = { pass: null, note: "" };
  return c;
}

export function inspectionScore(
  checklist: Record<string, ChecklistEntry>
): number {
  const answered = INSPECTION_ITEMS.filter(
    (i) => checklist[i.key]?.pass !== null && checklist[i.key]?.pass !== undefined
  );
  if (answered.length === 0) return 0;
  const passed = answered.filter((i) => checklist[i.key]?.pass === true).length;
  return Math.round((passed / INSPECTION_ITEMS.length) * 100);
}

function mapInspection(r: any): Inspection {
  return {
    id: r.id,
    applicationRef: r.application_ref,
    partnerId: r.partner_id,
    checklist: { ...emptyChecklist(), ...(r.checklist ?? {}) },
    score: r.score ?? 0,
    inspectorName: r.inspector_name ?? "",
    notes: r.notes ?? "",
    status: r.status,
    inspectedAt: r.inspected_at,
    updatedAt: r.updated_at,
  };
}

export async function getInspection(
  applicationRef: string
): Promise<Inspection | null> {
  const { data, error } = await getSupabase()
    .from("inspections")
    .select("*")
    .eq("application_ref", applicationRef)
    .maybeSingle();
  if (error) throw error;
  return data ? mapInspection(data) : null;
}

export async function saveInspection(input: {
  applicationRef: string;
  checklist: Record<string, ChecklistEntry>;
  inspectorName: string;
  notes: string;
  status: "in_progress" | "passed" | "failed";
}): Promise<Inspection> {
  const db = getSupabase();
  const score = inspectionScore(input.checklist);
  const payload = {
    application_ref: input.applicationRef,
    checklist: input.checklist,
    score,
    inspector_name: input.inspectorName.trim(),
    notes: input.notes.trim(),
    status: input.status,
    inspected_at:
      input.status === "in_progress" ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db
    .from("inspections")
    .upsert(payload, { onConflict: "application_ref" })
    .select()
    .single();
  if (error) throw error;
  await logAdminAction(
    "inspection.save",
    "inspection",
    input.applicationRef,
    `Inspection ${input.status} — score ${score}% — by ${input.inspectorName.trim() || "staff"}`
  );
  return mapInspection(data);
}

export interface InspectionListRow {
  id: string;
  applicationRef: string;
  businessName: string;
  area: string;
  status: "in_progress" | "passed" | "failed";
  score: number;
  inspectorName: string;
  updatedAt: string;
}

export async function listInspections(): Promise<InspectionListRow[]> {
  const { data, error } = await getSupabase()
    .from("inspections")
    .select("id,application_ref,status,score,inspector_name,updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []) as any[];
  if (rows.length === 0) return [];
  const refs = rows.map((r) => r.application_ref);
  const { data: apps } = await getSupabase()
    .from("partner_applications")
    .select("ref,payload")
    .in("ref", refs);
  const nameByRef = new Map<string, { name: string; area: string }>();
  for (const a of (apps ?? []) as any[]) {
    const p = a.payload ?? {};
    nameByRef.set(a.ref, {
      name: p.business?.carWashName ?? p.carWashName ?? a.ref,
      area: p.location?.area ?? "",
    });
  }
  return rows.map((r) => ({
    id: r.id,
    applicationRef: r.application_ref,
    businessName: nameByRef.get(r.application_ref)?.name ?? r.application_ref,
    area: nameByRef.get(r.application_ref)?.area ?? "",
    status: r.status,
    score: r.score ?? 0,
    inspectorName: r.inspector_name ?? "",
    updatedAt: r.updated_at,
  }));
}

/* ---------------- reviews / locations ---------------- */

export interface AdminReviewRow {
  id: string;
  partnerId: string;
  partnerName: string;
  subscriberName: string;
  rating: number;
  body: string;
  at: string;
}

export async function adminListReviews(limit = 100): Promise<AdminReviewRow[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from("reviews")
    .select(
      "id,rating,body,created_at,partner_id,partner:partners(name),subscriber:profiles(name)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    partnerId: r.partner_id,
    partnerName: r.partner?.name ?? r.partner_id,
    subscriberName: r.subscriber?.name ?? "—",
    rating: r.rating,
    body: r.body,
    at: r.created_at,
  }));
}

export interface AreaStat {
  area: string;
  subscribers: number;
  partners: number;
  washes: number;
}

export async function adminLocationStats(): Promise<AreaStat[]> {
  const db = getSupabase();
  const [subs, parts, wash] = await Promise.all([
    db.from("profiles").select("area").limit(2000),
    db.from("partners").select("area,status").limit(500),
    db
      .from("wash_transactions")
      .select("partner:partners(area)")
      .limit(2000),
  ]);
  const m = new Map<string, AreaStat>();
  const bump = (area: string | null, key: "subscribers" | "partners" | "washes") => {
    const a = (area ?? "").trim() || "Unknown";
    if (!m.has(a)) m.set(a, { area: a, subscribers: 0, partners: 0, washes: 0 });
    m.get(a)![key] += 1;
  };
  for (const s of (subs.data ?? []) as any[]) bump(s.area, "subscribers");
  for (const p of (parts.data ?? []) as any[]) {
    if (p.status === "approved") bump(p.area, "partners");
  }
  for (const w of (wash.data ?? []) as any[]) bump(w.partner?.area, "washes");
  return [...m.values()].sort((a, b) => b.washes - a.washes || b.subscribers - a.subscribers);
}
