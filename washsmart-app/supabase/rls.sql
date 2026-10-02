-- ============================================================================
-- WashSMART backend migration 002: auth-linked RLS, wash tokens, RPCs
-- ----------------------------------------------------------------------------
-- Run AFTER supabase/schema.sql in the Supabase SQL editor (same session ok).
-- Idempotent: safe to re-run (drops outline policies before replacing them).
--
-- Auth model
--   Subscribers -> Supabase Auth (email+password); profiles.id = auth.users.id
--   Partners    -> Supabase Auth (email+password); partners.user_id = auth.users.id
--                  Login UX keeps "Partner ID as username": the app resolves
--                  Partner ID -> email via partner_login_lookup(), then
--                  signInWithPassword. No plain-text passwords anywhere.
--   Admins      -> profiles.is_admin = true (flip manually for staff).
--
-- Wash tokens are server-issued and single-use:
--   issue_wash_token()  (subscriber) stores only the SHA-256 hash;
--   redeem_wash()       (partner) verifies + redeems atomically and writes
--                       the wash row, decrements the subscription, and posts
--                       the ledger earning. Direct table writes are denied.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------- link partners to auth.users + admin flag ----------
alter table partners
  add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists idx_partners_user on partners (user_id);

alter table profiles
  add column if not exists is_admin boolean not null default false;

-- ---------- wash tokens (server-issued, single-use) ----------
create table if not exists wash_tokens (
  token_hash             text primary key,  -- sha256 hex of the QR token
  subscription_id        uuid not null references subscriptions (id) on delete cascade,
  subscriber_id          uuid not null references profiles (id) on delete cascade,
  issued_at              timestamptz not null default now(),
  expires_at             timestamptz not null,
  used_at                timestamptz,
  redeemed_by_partner_id text references partners (id)
);
create index if not exists idx_tokens_sub    on wash_tokens (subscription_id);
create index if not exists idx_tokens_expiry on wash_tokens (expires_at);

-- ---------- auto-create profile on signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, phone)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'name', ''),
          new.email,
          coalesce(new.raw_user_meta_data ->> 'phone', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- helpers ----------
create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_admin);
$$;

-- Partner ID -> login identity (used by the Partner App login screen).
-- Returns only the row matching the supplied Partner ID.
create or replace function public.partner_login_lookup(p_partner_id text)
returns table (id text, email text, name text)
language sql security definer set search_path = public as $$
  select p.id, p.email, p.name
    from partners p
   where p.partner_id = p_partner_id
     and p.status = 'approved'
   limit 1;
$$;

-- Application status checker for the "track my application" screen.
create or replace function public.application_status_lookup(p_ref text)
returns table (status text, car_wash_name text, submitted_at timestamptz)
language sql security definer set search_path = public as $$
  select a.status, a.car_wash_name, a.submitted_at
    from partner_applications a
   where a.ref = p_ref;
$$;

-- ---------- subscriber: issue a single-use wash token ----------
-- p_token_hash is sha256 hex of the random token embedded in the QR.
-- The server never sees the raw token, so a DB read cannot forge washes.
create or replace function public.issue_wash_token(
  p_subscription_id uuid,
  p_token_hash      text,
  p_ttl_seconds     int default 300
)
returns table (expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_sub subscriptions%rowtype;
  v_exp timestamptz := now() + (p_ttl_seconds || ' seconds')::interval;
begin
  select * into v_sub from subscriptions where id = p_subscription_id;
  if not found or v_sub.owner_id is distinct from auth.uid() then
    raise exception 'subscription not found';
  end if;
  if v_sub.status <> 'active' or v_sub.washes_remaining <= 0 then
    raise exception 'no washes remaining';
  end if;
  insert into wash_tokens (token_hash, subscription_id, subscriber_id, expires_at)
  values (p_token_hash, p_subscription_id, v_sub.owner_id, v_exp)
  on conflict (token_hash) do nothing;
  return query select v_exp;
end;
$$;

-- ---------- partner: redeem a wash atomically ----------
-- Verifies the token, marks it used, inserts the wash row, decrements the
-- subscription, and posts the partner's ledger earning — all or nothing.
-- The unique constraint on wash_transactions.token_hash is the backstop
-- against double-redemption even under race conditions.
create or replace function public.redeem_wash(
  p_token_hash text,
  p_partner_id text,
  p_type       text default 'Standard Wash'
)
returns table (wash_id uuid, washes_remaining int)
language plpgsql security definer set search_path = public as $$
declare
  v_tok     wash_tokens%rowtype;
  v_sub     subscriptions%rowtype;
  v_partner partners%rowtype;
  v_wash_id uuid;
begin
  select * into v_partner from partners where id = p_partner_id;
  if not found
     or v_partner.status <> 'approved'
     or v_partner.user_id is distinct from auth.uid() then
    raise exception 'not authorized for this partner';
  end if;

  select * into v_tok from wash_tokens where token_hash = p_token_hash for update;
  if not found                 then raise exception 'invalid token'; end if;
  if v_tok.used_at is not null then raise exception 'token already used'; end if;
  if v_tok.expires_at < now()  then raise exception 'token expired'; end if;

  select * into v_sub from subscriptions where id = v_tok.subscription_id for update;
  if not found
     or v_sub.status <> 'active'
     or v_sub.washes_remaining <= 0 then
    raise exception 'no washes remaining';
  end if;

  update wash_tokens
     set used_at = now(), redeemed_by_partner_id = p_partner_id
   where token_hash = p_token_hash;

  update subscriptions
     set washes_remaining = washes_remaining - 1
   where id = v_sub.id
  returning * into v_sub;

  insert into wash_transactions
        (subscription_id, subscriber_id, partner_id, token_hash, type, payout)
  values (v_sub.id, v_tok.subscriber_id, p_partner_id, p_token_hash, p_type,
          v_partner.settlement_rate)
  returning id into v_wash_id;

  -- Ledger earning accrues to the pending settlement cycle (WashSMART's
  -- commission is netted at settlement; see the settlements flow).
  insert into ledger_entries (partner_id, kind, label, amount, ref, status)
  values (p_partner_id, 'wash_earning',
          'Wash ' || left(v_wash_id::text, 8) || ' — ' || p_type,
          v_partner.settlement_rate, v_wash_id::text, 'pending_settlement');

  return query select v_wash_id, v_sub.washes_remaining;
end;
$$;

-- ---------- admin: approve a partner application ----------
-- Moves the application to partners and issues the Partner ID.
-- The admin then creates the partner's auth user (dashboard) and links it:
--   update partners set user_id = '<auth-user-uuid>' where partner_id = 'WS-2026-XXXX';
create or replace function public.approve_partner_application(p_ref text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_app partner_applications%rowtype;
  v_pid text;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  select * into v_app from partner_applications where ref = p_ref;
  if not found then
    raise exception 'application not found';
  end if;
  if v_app.status <> 'pending' then
    raise exception 'application already reviewed';
  end if;

  select 'WS-2026-' || lpad((count(*) + 1)::text, 4, '0') into v_pid from partners;
  while exists (select 1 from partners where partner_id = v_pid) loop
    v_pid := 'WS-2026-' || lpad(((floor(random() * 9000) + 1000)::int)::text, 4, '0');
  end loop;

  insert into partners
        (id, application_ref, name, owner_name, phone, whatsapp, email,
         partner_id, settlement_rate,
         address, area, lga, state, gps, hours, services,
         bays, daily_capacity, years_operating, staff_count,
         status, approved_at)
  values
        (v_pid, v_app.ref, v_app.car_wash_name, v_app.owner_name, v_app.phone,
         v_app.whatsapp, v_app.email,
         v_pid, 2500,
         v_app.address, v_app.area, v_app.lga, v_app.state, v_app.gps,
         v_app.opening_hours, v_app.services,
         coalesce(v_app.wash_bays, 1), v_app.daily_capacity,
         v_app.years_operating, v_app.staff_count,
         'approved', now());

  update partner_applications
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   where ref = p_ref;

  return v_pid;
end;
$$;

-- ============================================================================
-- Tightened RLS (replaces the outline policies in schema.sql)
-- ============================================================================

-- drop outlines
drop policy if exists "own profile"        on profiles;
drop policy if exists "own vehicles"       on vehicles;
drop policy if exists "own subscriptions"  on subscriptions;
drop policy if exists "own payments"       on payments;
drop policy if exists "approved partners readable" on partners;
drop policy if exists "own washes"         on wash_transactions;
drop policy if exists "own settlements"    on settlements;
drop policy if exists "own ledger"         on ledger_entries;

alter table plans       enable row level security;
alter table wash_tokens enable row level security;
-- (no policies on wash_tokens: only SECURITY DEFINER RPCs touch it)

-- ---------- plans: public catalogue ----------
drop policy if exists "plans public read" on plans;
create policy "plans public read" on plans for select using (true);

-- ---------- profiles ----------
drop policy if exists "profiles own"   on profiles;
drop policy if exists "profiles admin" on profiles;
create policy "profiles own"   on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles admin"  on profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- vehicles: subscriber owns ----------
drop policy if exists "vehicles own"   on vehicles;
drop policy if exists "vehicles admin" on vehicles;
create policy "vehicles own"   on vehicles
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "vehicles admin" on vehicles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- subscriptions ----------
-- Subscriber: read + insert own. washes_remaining changes ONLY via redeem_wash().
drop policy if exists "subs read"   on subscriptions;
drop policy if exists "subs insert" on subscriptions;
drop policy if exists "subs admin"  on subscriptions;
create policy "subs read"   on subscriptions
  for select using (auth.uid() = owner_id);
create policy "subs insert" on subscriptions
  for insert with check (auth.uid() = owner_id);
create policy "subs admin"  on subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- payments ----------
drop policy if exists "payments read"   on payments;
drop policy if exists "payments insert" on payments;
drop policy if exists "payments admin"  on payments;
create policy "payments read"   on payments
  for select using (auth.uid() = owner_id);
create policy "payments insert" on payments
  for insert with check (auth.uid() = owner_id);
create policy "payments admin"  on payments
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- partners ----------
-- Public directory (approved shops); partner edits own row; admin manages.
drop policy if exists "partners directory"  on partners;
drop policy if exists "partners own update" on partners;
drop policy if exists "partners admin"      on partners;
create policy "partners directory"  on partners
  for select using (status = 'approved');
create policy "partners own update" on partners
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "partners admin"      on partners
  for all using (public.is_admin()) with check (public.is_admin());
-- NOTE: partner INSERT happens via approve_partner_application() (admin).

-- ---------- partner_applications ----------
-- Anyone can apply; only admins read/manage; status via lookup function.
drop policy if exists "applications insert" on partner_applications;
drop policy if exists "applications admin"  on partner_applications;
create policy "applications insert" on partner_applications
  for insert with check (true);
create policy "applications admin"  on partner_applications
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- wash_transactions ----------
-- Subscriber reads own; partner staff read their shop's; writes only via
-- redeem_wash() (SECURITY DEFINER bypasses RLS).
drop policy if exists "wash sub read"     on wash_transactions;
drop policy if exists "wash partner read" on wash_transactions;
drop policy if exists "wash admin"        on wash_transactions;
create policy "wash sub read" on wash_transactions
  for select using (auth.uid() = subscriber_id);
create policy "wash partner read" on wash_transactions
  for select using (
    exists (select 1 from partners p
             where p.id = wash_transactions.partner_id
               and p.user_id = auth.uid()));
create policy "wash admin" on wash_transactions
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- settlements & ledger ----------
-- Partner staff read their shop's rows; WashSMART (admin) manages.
drop policy if exists "settlements partner read" on settlements;
drop policy if exists "settlements admin"        on settlements;
drop policy if exists "ledger partner read"      on ledger_entries;
drop policy if exists "ledger admin"             on ledger_entries;
create policy "settlements partner read" on settlements
  for select using (
    exists (select 1 from partners p
             where p.id = settlements.partner_id
               and p.user_id = auth.uid()));
create policy "settlements admin" on settlements
  for all using (public.is_admin()) with check (public.is_admin());
create policy "ledger partner read" on ledger_entries
  for select using (
    exists (select 1 from partners p
             where p.id = ledger_entries.partner_id
               and p.user_id = auth.uid()));
create policy "ledger admin" on ledger_entries
  for all using (public.is_admin()) with check (public.is_admin());
