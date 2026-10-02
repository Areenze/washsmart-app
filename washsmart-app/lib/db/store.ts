/* WashSMART data layer — Supabase (Postgres) backend.
 *
 * Every screen talks to the database through the functions in this file.
 * They keep the same names and return the same UI types as the old demo
 * store, but every call is async and hits Supabase instead of localStorage.
 *
 * Conventions:
 *  - DB rows are snake_case; mappers below convert to the camelCase UI types
 *    in lib/db/types.ts.
 *  - Subscribers authenticate with Supabase Auth (email magic link);
 *    profiles.id = auth.users.id (created by the handle_new_user trigger).
 *  - Partners authenticate with Supabase Auth (email+password). The login
 *    screen still takes the Partner ID as the username: partner_login_lookup()
 *    resolves it to the auth email, then signInWithPassword runs.
 *  - QR tokens are server-issued and single-use: the client generates the raw
 *    token, stores only its SHA-256 hash via issue_wash_token(), and the QR
 *    carries the raw token. Redemption is atomic in redeem_wash().
 */

import { getSupabase } from "./supabase";
import type {
  LedgerEntry,
  Partner,
  PartnerApplication,
  PartnerLoginResult,
  PartnerStatus,
  Payment,
  PendingSettlement,
  Plan,
  Profile,
  RedeemFailure,
  RedeemResult,
  Settlement,
  Subscription,
  Vehicle,
  WashTransaction,
} from "./types";

export const PARTNER_SESSION_KEY = "washsmart_partner_session";
export const LAST_TOKEN_KEY = "washsmart_last_token";

/** QR tokens are valid for 5 minutes (matches issue_wash_token default). */
export const TOKEN_TTL_MS = 300_000;
/** WashSMART commission taken on partner gross at settlement (10%). */
export const SETTLEMENT_FEE_RATE = 0.1;

const isBrowser = () => typeof window !== "undefined";

/* ---------------- small pure helpers (unchanged) ---------------- */

export function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function fmtNaira(n: number): string {
  return "₦" + n.toLocaleString("en-NG");
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken(chars = 32): string {
  const bytes = new Uint8Array(chars);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(36))
    .join("")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, chars)
    .padEnd(chars, "x");
}

/* ---------------- row mappers (DB snake_case -> UI types) ---------------- */

function mapPartner(r: any): Partner {
  return {
    id: r.id,
    name: r.name,
    ownerName: r.owner_name,
    phone: r.phone,
    whatsapp: r.whatsapp ?? undefined,
    email: r.email,
    partnerId: r.partner_id,
    settlementRate: r.settlement_rate ?? 2500,
    bankName: r.bank_name ?? "—",
    bankLast4: r.bank_account_last4 ?? "————",
    address: r.address,
    area: r.area,
    lga: r.lga,
    state: r.state,
    gps: r.gps ?? undefined,
    location: `${r.area}, ${r.state}`,
    distance: "—",
    rating: Number(r.rating ?? 5),
    reviews: r.reviews ?? 0,
    status: r.open_now ? "Open" : "Closed",
    hours: r.hours ?? "",
    services: r.services ?? [],
    bays: r.bays ?? 1,
    dailyCapacity: r.daily_capacity ?? 0,
    yearsOperating: r.years_operating ?? 0,
    staffCount: r.staff_count ?? 0,
    partnerStatus: r.status,
    appliedAt: r.created_at,
    approvedAt: r.approved_at ?? undefined,
  };
}

function mapApplication(r: any): PartnerApplication {
  return {
    ref: r.ref,
    status: r.status,
    submittedAt: r.submitted_at,
    business: {
      carWashName: r.car_wash_name,
      ownerName: r.owner_name,
      phone: r.phone,
      whatsapp: r.whatsapp ?? "",
      email: r.email,
    },
    location: {
      address: r.address,
      area: r.area,
      lga: r.lga,
      state: r.state,
      gps: r.gps ?? "",
    },
    operations: {
      openingHours: r.opening_hours ?? "",
      washBays: String(r.wash_bays ?? ""),
      dailyCapacity: String(r.daily_capacity ?? ""),
      yearsOperating: String(r.years_operating ?? ""),
      staffCount: String(r.staff_count ?? ""),
    },
    services: r.services ?? [],
    otherService: r.other_service ?? "",
    photos: {
      business: r.business_photos ?? [],
      location: r.location_photos ?? [],
    },
  };
}

function mapPlan(r: any): Plan {
  return {
    id: r.id,
    name: r.name,
    price: fmtNaira(r.amount),
    amount: r.amount,
    washes: r.washes,
    popular: r.popular ?? undefined,
  };
}

function mapSubscription(r: any, email: string): Subscription {
  return {
    id: r.id,
    planId: r.plan_id,
    planName: r.plan_name,
    price: fmtNaira(r.amount),
    amount: r.amount,
    washesTotal: r.washes_total,
    washesRemaining: r.washes_remaining,
    status: r.status,
    startedAt: r.started_at,
    expiresAt: r.renews_at, // DB column renews_at now stores the credit expiry
    email,
  };
}

function mapWashTx(r: any): WashTransaction {
  return {
    id: r.id,
    subscriptionId: r.subscription_id,
    subscriberName: r.subscriber?.name ?? "Subscriber",
    partnerId: r.partner_id,
    partnerName: r.partner?.name ?? "WashSMART Partner",
    location: r.partner?.area ?? "Lagos",
    type: r.type,
    at: r.redeemed_at,
    payout: r.payout,
  };
}

function mapPayment(r: any): Payment {
  return {
    id: r.id,
    subscriptionId: r.subscription_id,
    amount: r.amount,
    planName: r.plan_name,
    at: r.paid_at,
    method: r.method,
    reference: r.reference,
  };
}

function mapSettlement(r: any): Settlement {
  return {
    id: r.id,
    partnerId: r.partner_id,
    period: r.period,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    washes: r.washes,
    gross: r.gross,
    washsmartFee: r.washsmart_fee,
    adjustments: r.adjustments,
    payable: r.payable,
    status: r.status,
    settlementDate: r.settlement_date,
    paidAt: r.paid_at ?? undefined,
    bankName: r.bank_name ?? "",
    bankLast4: r.bank_last4 ?? "",
    note: r.note ?? undefined,
  };
}

function mapLedger(r: any): LedgerEntry {
  return {
    id: r.id,
    partnerId: r.partner_id,
    kind: r.kind,
    label: r.label,
    amount: r.amount,
    at: r.created_at,
    ref: r.ref,
    settlementId: r.settlement_id ?? undefined,
    status: r.status,
  };
}

/* ---------------- auth ---------------- */

async function currentUser() {
  const { data } = await getSupabase().auth.getUser();
  return data.user;
}

/** Send the subscriber a sign-in (magic link) email. Creates the auth user
 *  on first use; the handle_new_user trigger creates their profile row. */
export async function sendSignInLink(
  email: string,
  name: string,
  phone: string,
  redirectTo: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await getSupabase().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      data: { name: name.trim(), phone: phone.trim() },
      emailRedirectTo: redirectTo,
    },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Exchange the ?code= from the magic-link redirect for a session. */
export async function exchangeCodeForSession(code: string): Promise<void> {
  const { error } = await getSupabase().auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(PARTNER_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
}

export async function isAdmin(): Promise<boolean> {
  const { data } = await getSupabase().rpc("is_admin");
  return data === true;
}

/* ---------------- partners ---------------- */

const PARTNER_COLS =
  "id,name,owner_name,phone,whatsapp,email,partner_id,settlement_rate,bank_name,bank_account_last4,address,area,lga,state,gps,hours,services,bays,daily_capacity,years_operating,staff_count,rating,reviews,open_now,status,approved_at,created_at";

export async function listApprovedPartners(): Promise<Partner[]> {
  const { data, error } = await getSupabase()
    .from("partners")
    .select(PARTNER_COLS)
    .eq("status", "approved")
    .order("name");
  if (error) throw error;
  return (data ?? []).map(mapPartner);
}

export async function getPartner(id: string): Promise<Partner | undefined> {
  const { data, error } = await getSupabase()
    .from("partners")
    .select(PARTNER_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapPartner(data) : undefined;
}

const PARTNER_PATCH_COLS: Record<string, string> = {
  ownerName: "owner_name",
  phone: "phone",
  whatsapp: "whatsapp",
  email: "email",
  hours: "hours",
  services: "services",
  bays: "bays",
  dailyCapacity: "daily_capacity",
  yearsOperating: "years_operating",
  staffCount: "staff_count",
  address: "address",
  area: "area",
  lga: "lga",
  state: "state",
  gps: "gps",
  bankName: "bank_name",
  bankLast4: "bank_account_last4",
  settlementRate: "settlement_rate",
};

export async function updatePartner(
  id: string,
  patch: Partial<Partner>
): Promise<Partner | undefined> {
  const cols: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    const col = PARTNER_PATCH_COLS[k];
    if (col && v !== undefined) cols[col] = v;
  }
  // open/closed toggle
  if (patch.status === "Open") cols["open_now"] = true;
  if (patch.status === "Closed") cols["open_now"] = false;
  if (Object.keys(cols).length === 0) return getPartner(id);
  const { data, error } = await getSupabase()
    .from("partners")
    .update(cols)
    .eq("id", id)
    .select(PARTNER_COLS)
    .maybeSingle();
  if (error) throw error;
  return data ? mapPartner(data) : undefined;
}

/* ---------------- applications ---------------- */

export type ApplicationInput = Omit<
  PartnerApplication,
  "ref" | "status" | "submittedAt"
>;

function newAppRef(): string {
  return `WS-2026-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function submitApplication(
  input: ApplicationInput
): Promise<PartnerApplication> {
  const sb = getSupabase();
  for (let attempt = 0; attempt < 3; attempt++) {
    const ref = newAppRef();
    const { data, error } = await sb
      .from("partner_applications")
      .insert({
        ref,
        status: "pending",
        car_wash_name: input.business.carWashName,
        owner_name: input.business.ownerName,
        phone: input.business.phone,
        whatsapp: input.business.whatsapp || null,
        email: input.business.email,
        address: input.location.address,
        area: input.location.area,
        lga: input.location.lga,
        state: input.location.state,
        gps: input.location.gps || null,
        opening_hours: input.operations.openingHours || null,
        wash_bays: Number(input.operations.washBays) || null,
        daily_capacity: Number(input.operations.dailyCapacity) || null,
        years_operating: Number(input.operations.yearsOperating) || null,
        staff_count: Number(input.operations.staffCount) || null,
        services: input.services,
        other_service: input.otherService || null,
        business_photos: input.photos.business,
        location_photos: input.photos.location,
      })
      .select()
      .maybeSingle();
    if (!error && data) return mapApplication(data);
    if (error && !String(error.message).includes("duplicate")) throw error;
    // ref collision — retry with a fresh ref
  }
  throw new Error("Could not create application reference. Please try again.");
}

export async function listApplications(
  status?: PartnerStatus
): Promise<PartnerApplication[]> {
  let q = getSupabase()
    .from("partner_applications")
    .select("*")
    .order("submitted_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(mapApplication);
}

export async function getApplication(
  ref: string
): Promise<PartnerApplication | undefined> {
  // Public status lookup goes through the RPC (no table read policy).
  const { data, error } = await getSupabase().rpc("application_status_lookup", {
    p_ref: ref,
  });
  if (error || !data || data.length === 0) return undefined;
  // Admins get the full row.
  const { data: full } = await getSupabase()
    .from("partner_applications")
    .select("*")
    .eq("ref", ref)
    .maybeSingle();
  if (full) return mapApplication(full);
  const s = data[0];
  return {
    ref,
    status: s.status,
    submittedAt: s.submitted_at,
    business: { carWashName: s.car_wash_name, ownerName: "", phone: "", whatsapp: "", email: "" },
    location: { address: "", area: "", lga: "", state: "Lagos", gps: "" },
    operations: { openingHours: "", washBays: "", dailyCapacity: "", yearsOperating: "", staffCount: "" },
    services: [],
    otherService: "",
    photos: { business: [], location: [] },
  };
}

export async function approveApplication(ref: string): Promise<string> {
  const { data, error } = await getSupabase().rpc("approve_partner_application", {
    p_ref: ref,
  });
  if (error) throw error;
  return data as string; // the issued Partner ID
}

export async function rejectApplication(ref: string): Promise<void> {
  const { error } = await getSupabase()
    .from("partner_applications")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("ref", ref);
  if (error) throw error;
}

/* ---------------- plans / profile / vehicles ---------------- */

export async function getPlans(): Promise<Plan[]> {
  const { data, error } = await getSupabase()
    .from("plans")
    .select("*")
    .order("amount");
  if (error) throw error;
  return (data ?? []).map(mapPlan);
}

export async function getPlan(id: string): Promise<Plan | undefined> {
  const { data, error } = await getSupabase()
    .from("plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapPlan(data) : undefined;
}

export async function getProfile(): Promise<Profile | null> {
  const user = await currentUser();
  if (!user) return null;
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("name,email,phone")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    return {
      name: (user.user_metadata?.name as string) ?? "",
      email: user.email ?? "",
      phone: (user.user_metadata?.phone as string) ?? "",
    };
  }
  return data as Profile;
}

export async function saveProfile(p: Profile): Promise<void> {
  const user = await currentUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await getSupabase()
    .from("profiles")
    .upsert(
      { id: user.id, name: p.name, email: p.email, phone: p.phone },
      { onConflict: "id" }
    );
  if (error) throw error;
}

export async function getVehicles(): Promise<Vehicle[]> {
  const user = await currentUser();
  if (!user) return [];
  const { data, error } = await getSupabase()
    .from("vehicles")
    .select("id,label,plate,color")
    .eq("owner_id", user.id)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((v: any) => ({
    id: v.id,
    label: v.label,
    plate: v.plate ?? "",
    color: v.color ?? "",
  }));
}

export async function saveVehicles(v: Vehicle[]): Promise<void> {
  const user = await currentUser();
  if (!user) throw new Error("Not signed in.");
  const sb = getSupabase();
  const { error: delError } = await sb
    .from("vehicles")
    .delete()
    .eq("owner_id", user.id);
  if (delError) throw delError;
  if (v.length === 0) return;
  const { error } = await sb.from("vehicles").insert(
    v.map((x) => ({
      owner_id: user.id,
      label: x.label,
      plate: x.plate || null,
      color: x.color || null,
    }))
  );
  if (error) throw error;
}

/* ---------------- subscriptions ---------------- */

const SUB_COLS =
  "id,plan_id,plan_name,amount,washes_total,washes_remaining,status,started_at,renews_at,owner_id";

async function profileEmail(): Promise<string> {
  const p = await getProfile();
  return p?.email ?? "";
}

export async function getMySubscription(): Promise<Subscription | null> {
  const user = await currentUser();
  if (!user) return null;
  const { data, error } = await getSupabase()
    .from("subscriptions")
    .select(SUB_COLS)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const sub = mapSubscription(data, await profileEmail());
  // 30-day credits: a pack past its expiry is dead, even if the row still
  // says 'active' (the DB functions mark it expired when hit). No rollover.
  if (sub.status === "active" && new Date(sub.expiresAt).getTime() <= Date.now()) {
    return null;
  }
  return sub;
}

/** Days left before the current wash credits expire (0 when none/expired). */
export function creditDaysLeft(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86_400_000) : 0;
}

/**
 * Grant 30-day wash credits for the signed-in subscriber (post verification).
 * Uses the topup_subscription RPC: tops up the live pack if one exists
 * (added credits share the current expiry, which never extends), otherwise
 * starts a fresh 30-day pack. Records the payment in both cases.
 */
export async function createSubscription(input: {
  planId: string;
}): Promise<Subscription> {
  const user = await currentUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await getSupabase().rpc("topup_subscription", {
    p_plan_id: input.planId,
  });
  if (error) throw new Error(error.message);
  const sub = await getMySubscription();
  if (!sub) throw new Error("Could not load your wash credits.");
  return sub;
}

/* ---------------- registered emails (compat) ----------------
 * Duplicate-email blocking now reads the profiles table (email is unique).
 * registerEmail/seedDemoEmail are no-ops kept for compatibility. */

export async function isEmailRegistered(email: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export function registeredEmails(): string[] {
  return [];
}

export function registerEmail(_email: string): void {
  /* no-op: profiles are created by the auth trigger */
}

export function seedDemoEmail(): void {
  /* no-op */
}

/** Reset the demo database (no-op against the production backend). */
export function resetDb(): void {
  /* no-op */
}

/* ---------------- QR tokens ---------------- */

/** Mint a fresh time-boxed token for the signed-in subscriber's subscription.
 *  Only the SHA-256 hash is stored server-side; the QR carries the raw token. */
export async function getQRToken(): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;
  const sb = getSupabase();
  const { data: subs } = await sb
    .from("subscriptions")
    .select("id,washes_remaining,status,renews_at")
    .eq("owner_id", user.id)
    .eq("status", "active")
    .gt("renews_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);
  const sub = subs?.[0];
  if (!sub || sub.washes_remaining <= 0) return null;
  const raw = `WS1-${randomToken(32)}`;
  const hash = await sha256Hex(raw);
  const { error } = await sb.rpc("issue_wash_token", {
    p_subscription_id: sub.id,
    p_token_hash: hash,
    p_ttl_seconds: 300,
  });
  if (error) return null;
  // Stash the latest token so the partner demo scanner can simulate a
  // camera read on the same device.
  if (isBrowser()) {
    try {
      window.localStorage.setItem(LAST_TOKEN_KEY, raw);
    } catch {
      /* ignore */
    }
  }
  return raw;
}

/** Read the stashed token (partner scanner "simulate camera" fallback). */
export function getLastToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(LAST_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Legacy JSON-payload token parser (kept for compatibility; new tokens
 *  are opaque server-issued strings). */
export function parseToken(token: string): {
  s: string;
  t: number;
  n: string;
} | null {
  try {
    const b64 = token
      .trim()
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const p = JSON.parse(atob(pad)) as Partial<{
      s: string;
      t: number;
      n: string;
    }>;
    if (
      typeof p.s === "string" &&
      typeof p.t === "number" &&
      typeof p.n === "string"
    )
      return p as { s: string; t: number; n: string };
    return null;
  } catch {
    return null;
  }
}

export function tokenAgeMs(token: string): number | null {
  const p = parseToken(token);
  return p ? Date.now() - p.t : null;
}

/** Validate a token without redeeming it (verification checklist).
 *  Reads go through the inspect_wash_token RPC — token hashes are never
 *  directly readable (the hash IS the bearer credential). */
export async function inspectToken(
  token: string
): Promise<
  | { ok: true; subscription: Subscription }
  | { ok: false; failure: RedeemFailure }
> {
  const hash = await sha256Hex(token.trim());
  const { data, error } = await getSupabase().rpc("inspect_wash_token", {
    p_token_hash: hash,
  });
  if (error || !data || data.length === 0)
    return { ok: false, failure: "bad-token" };
  const r = data[0];
  if (!r.valid) {
    const failure = ((): RedeemFailure => {
      switch (r.failure) {
        case "already-used":
          return "already-used";
        case "expired":
          return "expired-token";
        case "no-washes":
          return "no-washes-left";
        case "inactive":
          return "inactive-subscription";
        default:
          return "bad-token";
      }
    })();
    return { ok: false, failure };
  }
  const subscription: Subscription = {
    id: r.subscription_id,
    planId: "",
    planName: r.plan_name,
    price: "",
    amount: 0,
    washesTotal: 0,
    washesRemaining: r.washes_remaining,
    status: "active",
    startedAt: "",
    expiresAt: "",
    email: "",
  };
  return { ok: true, subscription };
}

/**
 * Redeem a wash: the server verifies the token, marks it used, decrements
 * the subscription, records the wash transaction and posts the partner's
 * ledger earning — atomically.
 */
export async function redeemWash(
  token: string,
  partnerId: string
): Promise<RedeemResult> {
  const hash = await sha256Hex(token.trim());
  const sb = getSupabase();
  const { data, error } = await sb.rpc("redeem_wash", {
    p_token_hash: hash,
    p_partner_id: partnerId,
    p_type: "Standard Wash",
  });
  if (error || !data || data.length === 0) {
    const msg = error?.message ?? "";
    const reason: RedeemFailure = msg.includes("already used")
      ? "already-used"
      : msg.includes("expired")
        ? "expired-token"
        : msg.includes("no washes")
          ? "no-washes-left"
          : msg.includes("not authorized")
            ? "bad-token"
            : "bad-token";
    return { ok: false, reason };
  }
  const row = data[0];
  const { data: tx } = await sb
    .from("wash_transactions")
    .select(
      "id,subscription_id,partner_id,type,payout,redeemed_at,subscriber:profiles(name),partner:partners(name,area)"
    )
    .eq("id", row.wash_id)
    .maybeSingle();
  const transaction: WashTransaction = tx
    ? mapWashTx(tx)
    : {
        id: row.wash_id,
        subscriptionId: "",
        subscriberName: "Subscriber",
        partnerId,
        partnerName: "WashSMART Partner",
        location: "Lagos",
        type: "Standard Wash",
        at: new Date().toISOString(),
        payout: 0,
      };
  return { ok: true, transaction, washesRemaining: row.washes_remaining };
}

/* ---------------- history & stats ---------------- */

const TX_COLS =
  "id,subscription_id,partner_id,type,payout,redeemed_at,subscriber:profiles(name),partner:partners(name,area)";

export async function listWashHistory(): Promise<WashTransaction[]> {
  const user = await currentUser();
  if (!user) return [];
  const { data, error } = await getSupabase()
    .from("wash_transactions")
    .select(TX_COLS)
    .eq("subscriber_id", user.id)
    .order("redeemed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapWashTx);
}

export async function listPartnerTransactions(
  partnerId: string
): Promise<WashTransaction[]> {
  const { data, error } = await getSupabase()
    .from("wash_transactions")
    .select(TX_COLS)
    .eq("partner_id", partnerId)
    .order("redeemed_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapWashTx);
}

export interface PartnerStats {
  todayWashes: number;
  totalWashes: number;
  todayEarnings: number;
  totalEarnings: number;
  subscribersServed: number;
}

export async function partnerStats(partnerId: string): Promise<PartnerStats> {
  const txs = await listPartnerTransactions(partnerId);
  const today = new Date().toDateString();
  const todayTxs = txs.filter((t) => new Date(t.at).toDateString() === today);
  return {
    todayWashes: todayTxs.length,
    totalWashes: txs.length,
    todayEarnings: todayTxs.reduce((s, t) => s + t.payout, 0),
    totalEarnings: txs.reduce((s, t) => s + t.payout, 0),
    subscribersServed: new Set(txs.map((t) => t.subscriptionId)).size,
  };
}

/* ---------------- settlements & ledger queries ---------------- */

/** Past (closed) settlements for a partner, newest first. */
export async function listSettlements(partnerId: string): Promise<Settlement[]> {
  const { data, error } = await getSupabase()
    .from("settlements")
    .select("*")
    .eq("partner_id", partnerId)
    .order("period_start", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapSettlement);
}

export async function getSettlement(
  ref: string,
  partnerId: string
): Promise<Settlement | undefined> {
  const { data, error } = await getSupabase()
    .from("settlements")
    .select("*")
    .eq("id", ref)
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSettlement(data) : undefined;
}

/**
 * The live current cycle: this month's verified washes netted into the
 * pending payout. Not stored — recomputed from wash transactions every read.
 */
export async function getPendingSettlement(
  partnerId: string
): Promise<PendingSettlement> {
  const partner = await getPartner(partnerId);
  const rate = partner?.settlementRate || 2500;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const txs = (await listPartnerTransactions(partnerId)).filter(
    (t) => new Date(t.at) >= monthStart
  );
  const gross = txs.length * rate;
  const washsmartFee = Math.round(gross * SETTLEMENT_FEE_RATE);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const settlementDate = new Date(now.getFullYear(), now.getMonth() + 1, 5);
  return {
    period: monthStart.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    }),
    periodStart: monthStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    washes: txs.length,
    gross,
    washsmartFee,
    adjustments: 0,
    payable: gross - washsmartFee,
    settlementDate: settlementDate.toISOString(),
    rate,
  };
}

/** Audit-trail lines behind one closed settlement, newest first. */
export async function ledgerForSettlement(
  partnerId: string,
  ref: string
): Promise<LedgerEntry[]> {
  const { data, error } = await getSupabase()
    .from("ledger_entries")
    .select("*")
    .eq("partner_id", partnerId)
    .or(`settlement_id.eq.${ref},ref.eq.${ref}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapLedger);
}

/** This month's not-yet-settled earning lines, newest first. */
export async function pendingLedger(partnerId: string): Promise<LedgerEntry[]> {
  const { data, error } = await getSupabase()
    .from("ledger_entries")
    .select("*")
    .eq("partner_id", partnerId)
    .eq("status", "pending_settlement")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapLedger);
}

/** Lifetime totals across all closed settlements. */
export async function lifetimeSettled(
  partnerId: string
): Promise<{ washes: number; paid: number }> {
  const ss = await listSettlements(partnerId);
  return {
    washes: ss.reduce((s, x) => s + x.washes, 0),
    paid: ss.reduce((s, x) => s + x.payable, 0),
  };
}

/* ---------------- partner session ---------------- */

/**
 * Partner App login. The username is the Partner ID (e.g. "WS-2026-0001").
 * The ID is resolved to the partner's auth email server-side, then Supabase
 * Auth verifies the password — no plain-text passwords anywhere.
 */
export async function partnerLogin(
  partnerId: string,
  password: string
): Promise<PartnerLoginResult> {
  const sb = getSupabase();
  const { data: lookup, error: lookupError } = await sb.rpc(
    "partner_login_lookup",
    { p_partner_id: partnerId.trim().toUpperCase() }
  );
  if (lookupError || !lookup || lookup.length === 0) {
    return { ok: false, reason: "unknown-id" };
  }
  const { email, id } = lookup[0] as { email: string; id: string };
  const { error: signInError } = await sb.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) return { ok: false, reason: "wrong-password" };
  if (isBrowser()) {
    try {
      window.localStorage.setItem(PARTNER_SESSION_KEY, id);
    } catch {
      /* ignore */
    }
  }
  const partner = await getPartner(id);
  if (!partner) return { ok: false, reason: "unknown-id" };
  return { ok: true, partner };
}

export async function partnerLogout(): Promise<void> {
  await signOut();
}

export async function currentPartnerSession(): Promise<Partner | undefined> {
  if (!isBrowser()) return undefined;
  try {
    const id = window.localStorage.getItem(PARTNER_SESSION_KEY);
    if (!id) return undefined;
    const {
      data: { session },
    } = await getSupabase().auth.getSession();
    if (!session) {
      window.localStorage.removeItem(PARTNER_SESSION_KEY);
      return undefined;
    }
    return getPartner(id);
  } catch {
    return undefined;
  }
}
