-- migration_039: 6-digit fallback code for wash redemption.
--
-- Problem: redemption today is QR-only in practice. The wash token is a
-- long bearer string that is (deliberately, audit 2026-11-17) never shown
-- as text on the subscriber's screen, so when a partner's camera is
-- broken / permission-blocked / stuck in a webview, there is no usable
-- alternative — the partner scan page's manual field has nothing a
-- subscriber can read out.
--
-- Fix: every minted wash token ALSO carries a 6-digit one-time code,
-- stored only as a SHA-256 hash on the same wash_tokens row, with the
-- same single-use + 300s expiry semantics. The partner types the code;
-- inspect/redeem run through mirror RPCs with identical checks
-- (approved partner, self-redemption guard, lapse voiding) plus a
-- guessing lockout: 5 failed code attempts (unknown or replayed code)
-- within 15 minutes pauses manual code entry for that partner.
-- The long token itself is never exposed by any of this.
--
-- The app degrades gracefully before this migration runs: the client
-- falls back to token-only minting and hides the code.

-- ---------- 1. Code hash on the token row ----------
alter table public.wash_tokens
  add column if not exists code_hash text;

-- A code value may be live on at most one unused token at a time.
create unique index if not exists wash_tokens_code_hash_live_uidx
  on public.wash_tokens (code_hash)
  where code_hash is not null and used_at is null;

-- ---------- 2. Failed-attempt log (lockout) ----------
create table if not exists public.wash_code_attempts (
  id           uuid primary key default gen_random_uuid(),
  partner_id   uuid not null,
  attempted_at timestamptz not null default now()
);
create index if not exists wash_code_attempts_partner_time_idx
  on public.wash_code_attempts (partner_id, attempted_at desc);

-- Only the SECURITY DEFINER functions below touch this table.
alter table public.wash_code_attempts enable row level security;

-- ---------- 3. Helpers ----------
create or replace function public.code_entry_locked(p_partner_id uuid)
returns boolean
language sql security definer set search_path = public as $$
  select count(*) >= 5
    from wash_code_attempts
   where partner_id = p_partner_id
     and attempted_at > now() - interval '15 minutes';
$$;

revoke all on function public.code_entry_locked(uuid) from public, anon, authenticated;
grant execute on function public.code_entry_locked(uuid) to service_role;

-- ---------- 4. Mint token + code together ----------
create or replace function public.issue_wash_token_with_code(
  p_subscription_id uuid,
  p_token_hash      text,
  p_code_hash       text,
  p_ttl_seconds     int default 300
)
returns table (expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_sub subscriptions%rowtype;
  v_exp timestamptz := now() + (least(greatest(coalesce(p_ttl_seconds, 300), 30), 300) || ' seconds')::interval;
  v_inserted boolean := false;
begin
  select * into v_sub from subscriptions where id = p_subscription_id;
  if not found or v_sub.owner_id is distinct from auth.uid() then
    raise exception 'subscription not found';
  end if;
  if v_sub.status <> 'active' or v_sub.washes_remaining <= 0 then
    raise exception 'no washes remaining';
  end if;
  if v_sub.renews_at < now() then
    update subscriptions
       set status = 'expired', washes_remaining = 0
     where id = v_sub.id;
    return;
  end if;

  -- Release code values whose tokens expired unused, so the 6-digit
  -- space does not drain over time.
  update wash_tokens
     set code_hash = null
   where code_hash is not null
     and used_at is null
     and expires_at < now();

  if exists (select 1 from wash_tokens
              where code_hash = p_code_hash and used_at is null) then
    raise exception 'code collision';
  end if;

  begin
    insert into wash_tokens (token_hash, code_hash, subscription_id, subscriber_id, expires_at)
    values (p_token_hash, p_code_hash, p_subscription_id, v_sub.owner_id, v_exp);
    v_inserted := true;
  exception when unique_violation then
    raise exception 'code collision';
  end;

  if not v_inserted then
    raise exception 'code collision';
  end if;

  return query select v_exp;
end;
$$;

revoke all on function public.issue_wash_token_with_code(uuid, text, text, int)
  from public, anon;
grant execute on function public.issue_wash_token_with_code(uuid, text, text, int)
  to authenticated, service_role;

-- ---------- 5. Inspect by code (partner) ----------
create or replace function public.inspect_wash_code(p_code_hash text)
returns table (
  valid            boolean,
  failure          text,
  subscription_id  uuid,
  subscriber_name  text,
  plan_name        text,
  washes_remaining int
)
language plpgsql security definer set search_path = public as $$
declare
  v_partner partners%rowtype;
  v_tok     wash_tokens%rowtype;
  v_sub     subscriptions%rowtype;
  v_name    text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select * into v_partner from partners
   where user_id = auth.uid() and status = 'approved'
   limit 1;
  if not found then
    raise exception 'partners only';
  end if;

  if public.code_entry_locked(v_partner.id) then
    return query select false, 'locked'::text,
      null::uuid, null::text, null::text, null::int;
    return;
  end if;

  select * into v_tok from wash_tokens where code_hash = p_code_hash;
  if not found then
    insert into wash_code_attempts (partner_id) values (v_partner.id);
    return query select false, 'bad-code'::text,
      null::uuid, null::text, null::text, null::int;
    return;
  end if;
  if v_tok.used_at is not null then
    insert into wash_code_attempts (partner_id) values (v_partner.id);
    return query select false, 'already-used'::text,
      null::uuid, null::text, null::text, null::int;
    return;
  end if;
  if v_tok.expires_at < now() then
    return query select false, 'expired'::text,
      null::uuid, null::text, null::text, null::int;
    return;
  end if;

  select * into v_sub from subscriptions where id = v_tok.subscription_id;
  if not found then
    return query select false, 'bad-code'::text,
      null::uuid, null::text, null::text, null::int;
    return;
  end if;
  if v_sub.status <> 'active' then
    return query select false, 'inactive'::text,
      null::uuid, null::text, null::text, null::int;
    return;
  end if;
  if v_sub.washes_remaining <= 0 then
    return query select false, 'no-washes'::text,
      null::uuid, null::text, null::text, null::int;
    return;
  end if;

  select name into v_name from profiles where id = v_tok.subscriber_id;

  return query select true, null::text,
    v_sub.id, v_name, v_sub.plan_name, v_sub.washes_remaining;
end;
$$;

revoke all on function public.inspect_wash_code(text) from public, anon;
grant execute on function public.inspect_wash_code(text)
  to authenticated, service_role;

-- ---------- 6. Redeem by code (partner) ----------
create or replace function public.redeem_wash_by_code(
  p_code_hash  text,
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

  if public.code_entry_locked(v_partner.id) then
    raise exception 'code entry locked';
  end if;

  select * into v_tok from wash_tokens where code_hash = p_code_hash for update;
  if not found then
    insert into wash_code_attempts (partner_id) values (v_partner.id);
    raise exception 'invalid code';
  end if;
  if v_tok.used_at is not null then
    insert into wash_code_attempts (partner_id) values (v_partner.id);
    raise exception 'code already used';
  end if;
  if v_tok.expires_at < now() then raise exception 'code expired'; end if;

  -- Self-redemption guard (same as redeem_wash).
  if v_partner.user_id is not null
     and v_tok.subscriber_id = v_partner.user_id then
    raise exception 'You cannot redeem a wash from your own subscription.';
  end if;

  select * into v_sub from subscriptions where id = v_tok.subscription_id for update;
  if not found
     or v_sub.status <> 'active'
     or v_sub.washes_remaining <= 0 then
    raise exception 'no washes remaining';
  end if;
  if v_sub.renews_at < now() then
    update subscriptions
       set status = 'expired', washes_remaining = 0
     where id = v_sub.id;
    return;
  end if;

  update wash_tokens
     set used_at = now(), redeemed_by_partner_id = p_partner_id
   where code_hash = p_code_hash;

  update subscriptions
     set washes_remaining = subscriptions.washes_remaining - 1
   where id = v_sub.id
  returning * into v_sub;

  insert into wash_transactions
        (subscription_id, subscriber_id, partner_id, token_hash, type, payout)
  values (v_sub.id, v_tok.subscriber_id, p_partner_id, v_tok.token_hash, p_type,
          v_partner.settlement_rate)
  returning id into v_wash_id;

  insert into ledger_entries (partner_id, kind, label, amount, ref, status)
  values (p_partner_id, 'wash_earning',
          'Wash ' || left(v_wash_id::text, 8) || ' — ' || p_type,
          v_partner.settlement_rate, v_wash_id::text, 'pending_settlement');

  return query select v_wash_id, v_sub.washes_remaining;
end;
$$;

revoke all on function public.redeem_wash_by_code(text, text, text)
  from public, anon;
grant execute on function public.redeem_wash_by_code(text, text, text)
  to authenticated, service_role;

-- ---------- 7. Extras status by code (partner) ----------
create or replace function public.wash_extras_status_by_code(p_code_hash text)
returns table (
  plan_id          text,
  plan_name        text,
  extras_available boolean,
  extras_used_at   timestamptz
)
language plpgsql security definer set search_path = public as $$
declare
  v_tok  wash_tokens%rowtype;
  v_sub  subscriptions%rowtype;
  v_plan plans%rowtype;
  v_used timestamptz;
begin
  if not exists (
       select 1 from partners
        where user_id = auth.uid() and status = 'approved'
     ) and not exists (
       select 1 from profiles where id = auth.uid() and is_admin
     ) then
    raise exception 'not authorized';
  end if;

  select * into v_tok from wash_tokens where code_hash = p_code_hash;
  if not found then raise exception 'invalid code'; end if;

  select * into v_sub from subscriptions where id = v_tok.subscription_id;
  if not found then raise exception 'invalid code'; end if;

  select * into v_plan from plans where id = v_sub.plan_id;

  if coalesce(v_plan.extras_per_cycle, 0) > 0 then
    select max(redeemed_at) into v_used
      from wash_transactions
     where subscription_id = v_sub.id
       and extras
       and redeemed_at > v_sub.renews_at - interval '30 days';
  end if;

  return query select
    v_sub.plan_id,
    v_sub.plan_name,
    (coalesce(v_plan.extras_per_cycle, 0) > 0 and v_used is null),
    v_used;
end;
$$;

revoke all on function public.wash_extras_status_by_code(text) from public, anon;
grant execute on function public.wash_extras_status_by_code(text) to authenticated;
