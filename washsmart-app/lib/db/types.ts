/* WashSMART shared domain types.
 * These mirror the production Postgres schema (see supabase/schema.sql).
 * All ids are strings; partner ids are stable slugs like "p-cleanride". */

export type PartnerStatus = "pending" | "approved" | "rejected" | "suspended";

export interface Partner {
  id: string;
  name: string;
  ownerName: string;
  phone: string;
  whatsapp?: string;
  email: string;
  /** Login username for the Partner App, e.g. "WS-2026-0001" */
  partnerId: string;
  /** @deprecated demo-era field. Production uses Supabase Auth; never populated from the DB. */
  password?: string;
  /** Agreed ₦ payout per verified wash (commercial contract rate) */
  settlementRate: number;
  bankName: string;
  /** last 4 digits of the settlement account, for display */
  bankLast4: string;
  address: string;
  area: string;
  lga: string;
  state: string;
  /** "lat,lng" pin captured at registration (demo) */
  gps?: string;
  location: string; // display string, e.g. "Lekki Phase 1, Lagos"
  distance: string; // display string, e.g. "1.2 km"
  rating: number;
  reviews: number;
  status: "Open" | "Closed";
  hours: string;
  services: string[];
  bays: number;
  dailyCapacity: number;
  yearsOperating: number;
  staffCount: number;
  partnerStatus: PartnerStatus;
  appliedAt: string; // ISO date
  approvedAt?: string;
  /** Public gallery photo URLs (Supabase Storage) */
  photos: string[];
}

export interface PartnerApplication {
  ref: string; // WS-2026-XXXX
  status: PartnerStatus;
  submittedAt: string;
  business: {
    carWashName: string;
    ownerName: string;
    phone: string;
    whatsapp: string;
    email: string;
  };
  location: {
    address: string;
    area: string;
    lga: string;
    state: string;
    gps: string;
  };
  operations: {
    openingHours: string;
    openingTime: string;
    closingTime: string;
    washBays: string;
    dailyCapacity: string;
    yearsOperating: string;
    staffCount: string;
  };
  services: string[];
  otherService: string;
  /** Field-agent referral code entered by the applicant (optional, Phase 1). */
  agentCode: string;
  photos: {
    business: string[];
    location: string[];
  };
}

export interface Agent {
  id: string;
  code: string; // AGT-001
  name: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
  createdAt: string;
  linked: boolean; // auth user linked
}

export interface AgentReferral {
  partner_id: string;
  name: string;
  area: string;
  status: string;
  approved_at: string | null;
  washes_total: number;
  washes_gate: number; // washes within 60 days of approval
}

export interface AgentOverviewRow extends Agent {
  partners_referred: number;
  partners_active: number;
  washes_total: number;
  gates_hit: number;
}

export interface Plan {
  id: string;
  name: string;
  price: string; // display, e.g. "₦12,000"
  amount: number; // kobo-free naira integer
  washes: number;
  popular?: boolean;
}

export interface Profile {
  name: string;
  email: string;
  phone: string;
  area?: string;
  phone_verified?: boolean;
}

export interface Vehicle {
  id: string;
  label: string; // e.g. "Toyota Camry"
  plate: string;
  color: string;
}

export interface Subscription {
  id: string;
  planId: string;
  planName: string;
  price: string;
  amount: number;
  washesTotal: number;
  washesRemaining: number;
  status: "active" | "expired" | "cancelled";
  startedAt: string; // ISO
  expiresAt: string; // ISO — wash credits valid until (30 days from purchase)
  email: string;
}

export interface WashTransaction {
  id: string;
  subscriptionId: string;
  subscriberName: string;
  partnerId: string;
  partnerName: string;
  location: string;
  type: string; // e.g. "Standard Wash"
  at: string; // ISO
  /** per-wash partner payout estimate (₦) */
  payout: number;
}

export interface Payment {
  id: string;
  subscriptionId: string;
  amount: number;
  planName: string;
  at: string;
  method: string; // "card (demo)"
  reference: string;
}

/** Result of redeemWash() */
export type RedeemResult =
  | { ok: true; transaction: WashTransaction; washesRemaining: number }
  | { ok: false; reason: RedeemFailure };

/* ---------------- partner money flow: settlements & ledger ----------------
 * WashSMART does NOT pay partners per wash. Verified washes accrue as
 * ledger entries, then a monthly settlement cycle nets them out:
 *
 *   wash completed → ledger entry (pending) → settlement approved
 *     → Paystack transfer → partner bank → paid
 *
 * Paystack never decides what a partner earns — WashSMART does, from
 * verified washes and the commercial settlement rate. */

export type SettlementStatus = "pending" | "approved" | "paid";

export interface Settlement {
  /** e.g. "WS-SET-000184" — also the payout reference */
  id: string;
  partnerId: string;
  /** display, e.g. "September 2026" */
  period: string;
  periodStart: string; // ISO
  periodEnd: string; // ISO
  washes: number;
  /** washes × settlementRate */
  gross: number;
  /** WashSMART commission on the gross */
  washsmartFee: number;
  /** refunds / dispute reversals (signed; usually negative or 0) */
  adjustments: number;
  /** gross − fee + adjustments */
  payable: number;
  status: SettlementStatus;
  /** when the payout is/was made */
  settlementDate: string; // ISO
  paidAt?: string; // ISO
  bankName: string;
  bankLast4: string;
  note?: string;
}

export type LedgerKind =
  | "wash_earning"
  | "washsmart_fee"
  | "adjustment"
  | "settlement_payout";

export type LedgerStatus = "pending_settlement" | "settled" | "paid";

/** One accounting line. The full audit trail behind every settlement. */
export interface LedgerEntry {
  id: string;
  partnerId: string;
  kind: LedgerKind;
  label: string;
  /** signed naira: + earning, − fee / payout */
  amount: number;
  at: string; // ISO
  /** wash transaction id or settlement id this line belongs to */
  ref: string;
  /** the settlement this line was closed into (undefined while pending) */
  settlementId?: string;
  status: LedgerStatus;
}

/** Live, not-yet-settled current cycle (computed from this month's washes). */
export interface PendingSettlement {
  period: string;
  periodStart: string; // ISO
  periodEnd: string; // ISO
  washes: number;
  gross: number;
  washsmartFee: number;
  adjustments: number;
  payable: number;
  settlementDate: string; // ISO — 5th of next month
  rate: number;
}

export type PartnerLoginResult =
  | { ok: true; partner: Partner }
  | { ok: false; reason: "unknown-id" | "wrong-password" };

export type RedeemFailure =
  | "bad-token"
  | "expired-token"
  | "unknown-subscription"
  | "inactive-subscription"
  | "no-washes-left"
  | "already-used";

export interface LocationRequest {
  id: string;
  email: string;
  area: string;
  createdAt: string;
}

export interface WaitlistSignup {
  id: string;
  name: string;
  email: string;
  area: string;
  ownsCar: boolean;
  howHeard: string | null;
  createdAt: string;
}
