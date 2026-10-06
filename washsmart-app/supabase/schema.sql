-- ============================================================================
-- WashSMART production Postgres schema (Supabase)
-- ----------------------------------------------------------------------------
-- This is the production target for the demo data layer in lib/db/.
-- The demo store (lib/db/store.ts) uses the same entity names, field names and
-- relationships so the frontend can be ported to Supabase with minimal changes:
--   PartnerApplication -> partner_applications
--   Partner            -> partners
--   Profile            -> profiles (1:1 with auth.users)
--   Vehicle            -> vehicles
--   Plan               -> plans
--   Subscription       -> subscriptions
--   WashTransaction    -> wash_transactions
--   Payment            -> payments
--   Settlement         -> settlements
--   LedgerEntry        -> ledger_entries
-- Run this in the Supabase SQL editor. Auth uses Supabase Auth (email);
-- RLS policies below are outlines — tighten them before launch.
-- ============================================================================

-- ---------- lookup: subscription plans ----------
create table if not exists plans (
  id          text primary key,          -- 'basic' | 'standard' | 'premium'
  name        text not null,
  amount      integer not null,          -- naira (no kobo)
  washes      integer not null,          -- washes per month
  popular     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ---------- partner applications (join funnel) ----------
create table if not exists partner_applications (
  ref               text primary key,    -- WS-2026-XXXX
  status            text not null default 'pending'
                    check (status in ('pending','approved','rejected','suspended')),
  submitted_at      timestamptz not null default now(),

  -- business information
  car_wash_name     text not null,
  owner_name        text not null,
  phone             text not null,
  whatsapp          text,
  email             text not null,

  -- location
  address           text not null,
  area              text not null,
  lga               text not null,
  state             text not null default 'Lagos',
  gps               text,                -- "lat,lng"

  -- operations
  opening_hours     text,
  wash_bays         integer,
  daily_capacity    integer,
  years_operating   integer,
  staff_count       integer,

  -- services
  services          text[] not null default '{}',
  other_service     text,

  -- verification photos (Supabase Storage paths)
  business_photos   text[] not null default '{}',
  location_photos   text[] not null default '{}',

  reviewed_by       uuid,                -- admin user
  reviewed_at       timestamptz,

  -- field-agent program (Phase 1): optional referral code entered by applicant
  agent_code        text,

  created_at        timestamptz not null default now()
);
create index if not exists idx_applications_status on partner_applications (status);

-- ---------- field agents (Phase 2) ----------
-- Created by admins in /admin/agents; code auto-issued as AGT-001…
-- The admin creates the auth user in the Supabase dashboard and links it:
--   update agents set user_id = '<auth-user-uuid>', email = '<email>'
--   where code = 'AGT-001';
-- Agents sign in at /agent with agent code + password.
create table if not exists agents (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique
              default ('AGT-' || lpad(nextval('agent_code_seq')::text, 3, '0')),
  name        text not null,
  phone       text not null,
  email       text,
  user_id     uuid,
  status      text not null default 'active'
              check (status in ('active','inactive')),
  created_at  timestamptz not null default now(),
  created_by  uuid
);

-- ---------- approved partners ----------
create table if not exists partners (
  id              text primary key,
  application_ref text references partner_applications (ref),
  name            text not null,
  owner_name      text not null,
  phone           text not null,
  whatsapp        text,
  email           text not null,
  -- Partner App login: Partner ID is the username (issued at approval).
  -- Production uses Supabase Auth; never store plain-text passwords.
  partner_id      text not null unique,  -- e.g. 'WS-2026-0001'
  password_hash   text,                  -- null until the partner sets it
  -- commercial terms: agreed ₦ payout per verified wash
  settlement_rate integer not null default 2500,
  bank_name       text,
  bank_account_last4 text,
  address         text not null,
  area            text not null,
  lga             text not null,
  state           text not null default 'Lagos',
  gps             text,
  hours           text,
  services        text[] not null default '{}',
  bays            integer not null default 1,
  daily_capacity  integer,
  years_operating integer,
  staff_count     integer,
  rating          numeric(2,1) not null default 5.0,
  reviews         integer not null default 0,
  open_now        boolean not null default true,
  status          text not null default 'approved'
                  check (status in ('pending','approved','rejected','suspended')),
  approved_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_partners_status on partners (status);
create index if not exists idx_partners_area on partners (area);

-- ---------- subscriber profiles (1:1 with auth.users) ----------
create table if not exists profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  email       text not null unique,      -- unique => duplicate-email blocking
  phone       text not null,
  created_at  timestamptz not null default now()
);

-- ---------- vehicles ----------
create table if not exists vehicles (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles (id) on delete cascade,
  label       text not null,             -- e.g. "Toyota Camry"
  plate       text,
  color       text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_vehicles_owner on vehicles (owner_id);

-- ---------- subscriptions ----------
create table if not exists subscriptions (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references profiles (id) on delete cascade,
  plan_id           text not null references plans (id),
  plan_name         text not null,
  amount            integer not null,
  washes_total      integer not null,
  washes_remaining  integer not null check (washes_remaining >= 0),
  status            text not null default 'active'
                    check (status in ('active','expired','cancelled')),
  started_at        timestamptz not null default now(),
  renews_at         timestamptz not null,
  created_at        timestamptz not null default now()
);
create index if not exists idx_subscriptions_owner on subscriptions (owner_id);

-- ---------- wash transactions (one row per redeemed wash) ----------
create table if not exists wash_transactions (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions (id),
  subscriber_id   uuid not null references profiles (id),
  partner_id      text not null references partners (id),
  token_hash      text not null unique,  -- sha256 of the redeemed QR token
  type            text not null,         -- e.g. "Standard Wash"
  payout          integer not null,      -- partner payout estimate (₦)
  redeemed_at     timestamptz not null default now()
);
create index if not exists idx_wash_partner on wash_transactions (partner_id);
create index if not exists idx_wash_sub on wash_transactions (subscription_id);
create index if not exists idx_wash_redeemed on wash_transactions (redeemed_at desc);

-- ---------- payments ----------
create table if not exists payments (
  id              uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions (id),
  owner_id        uuid not null references profiles (id),
  amount          integer not null,
  plan_name       text not null,
  method          text not null,         -- 'paystack'
  reference       text not null unique,  -- Paystack reference
  paid_at         timestamptz not null default now()
);

-- ---------- settlements (partner money flow) ----------
-- Partners are NOT paid per wash. Verified washes accrue as ledger entries;
-- each monthly settlement nets them (gross − commission ± adjustments) and
-- WashSMART pays the partner by bank transfer (Paystack). Paystack moves the
-- money; WashSMART decides the amount from verified washes + contract rate.
create table if not exists settlements (
  id              text primary key,      -- 'WS-SET-000184', also payout ref
  partner_id      text not null references partners (id),
  period          text not null,         -- 'September 2026'
  period_start    timestamptz not null,
  period_end      timestamptz not null,
  washes          integer not null,
  gross           integer not null,      -- washes × settlement_rate (₦)
  washsmart_fee   integer not null,      -- WashSMART commission (₦)
  adjustments     integer not null default 0, -- refunds/disputes (signed)
  payable         integer not null,      -- gross − fee + adjustments (₦)
  status          text not null default 'pending'
                  check (status in ('pending','approved','paid')),
  settlement_date timestamptz not null,  -- payout date (5th of next month)
  paid_at         timestamptz,
  bank_name       text,
  bank_last4      text,
  note            text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_settlements_partner on settlements (partner_id);
create index if not exists idx_settlements_status on settlements (status);

-- ---------- ledger entries (audit trail behind every settlement) ----------
create table if not exists ledger_entries (
  id          uuid primary key default gen_random_uuid(),
  partner_id  text not null references partners (id),
  kind        text not null
              check (kind in ('wash_earning','washsmart_fee','adjustment','settlement_payout')),
  label       text not null,
  amount      integer not null,          -- signed ₦: + earning, − fee/payout
  ref         text not null,             -- wash_transactions.id or settlements.id
  status      text not null default 'pending_settlement'
              check (status in ('pending_settlement','settled','paid')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_ledger_partner on ledger_entries (partner_id);
create index if not exists idx_ledger_ref on ledger_entries (ref);

-- ============================================================================
-- Row Level Security (outlines — enable RLS and tighten before launch)
-- ============================================================================
alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table subscriptions enable row level security;
alter table wash_transactions enable row level security;
alter table payments enable row level security;
alter table partners enable row level security;
alter table partner_applications enable row level security;
alter table settlements enable row level security;
alter table ledger_entries enable row level security;

-- Subscribers read/write only their own rows
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own vehicles" on vehicles
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "own subscriptions" on subscriptions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "own payments" on payments
  for select using (auth.uid() = owner_id);

-- Approved partners are publicly readable (user app partner finder)
create policy "approved partners readable" on partners
  for select using (status = 'approved');

-- Wash transactions: subscriber sees own; partner staff see their shop's
create policy "own washes" on wash_transactions
  for select using (auth.uid() = subscriber_id);

-- Settlements & ledger: partner staff read their own shop's rows
create policy "own settlements" on settlements
  for select using (partner_id = current_setting('app.partner_id', true));
create policy "own ledger" on ledger_entries
  for select using (partner_id = current_setting('app.partner_id', true));

-- Admins (service_role / custom claim) manage applications & partners.
-- TODO: add is_admin() helper checking a staff table or JWT claim.

-- ============================================================================
-- Seed: plans (₦8,000/2 · ₦12,000/4 · ₦18,000/8)
-- ============================================================================
insert into plans (id, name, amount, washes, popular) values
  ('basic',    'Basic',    8000,  2, false),
  ('standard', 'Standard', 12000, 4, true),
  ('premium',  'Premium',  18000, 8, false)
on conflict (id) do nothing;
