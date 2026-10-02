-- ============ migration_005: refer-a-friend, 1 free wash ============
-- A subscriber shares a referral link. When a friend signs up with it and
-- buys a plan, the referrer instantly gets a 1-wash credit valid 30 days
-- (its own subscription row, plan_id = 'referral', so it never disturbs the
-- paid pack's own 30-day window).

-- 1. Bonus plan row (kept out of the public catalogue by getPlans()).
insert into plans (id, name, amount, washes, popular)
values ('referral', 'Referral Bonus', 0, 1, false)
on conflict (id) do nothing;

-- 2. Referral code + attribution on profiles.
alter table profiles
  add column if not exists referral_code text unique,
  add column if not exists referred_by uuid references profiles (id) on delete set null;
create index if not exists idx_profiles_referral_code on profiles (referral_code);

-- 3. Referral ledger: one rewarded row per friend (referee_id unique stops
--    double-rewards when the friend buys again later).
create table if not exists referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references profiles (id) on delete cascade,
  referee_id    uuid not null references profiles (id) on delete cascade unique,
  referee_email text not null,
  status        text not null default 'rewarded'
                check (status in ('pending','rewarded')),
  created_at    timestamptz not null default now(),
  rewarded_at   timestamptz
);
create index if not exists idx_referrals_referrer on referrals (referrer_id);
alter table referrals enable row level security;
drop policy if exists "referrals own"   on referrals;
drop policy if exists "referrals admin" on referrals;
create policy "referrals own" on referrals
  for select using (auth.uid() = referrer_id);
create policy "referrals admin" on referrals
  for all using (public.is_admin()) with check (public.is_admin());

-- 4. Mint (or fetch) the caller's referral code. 6 unambiguous chars.
create or replace function public.mint_referral_code()
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code  text;
  v_chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i       int;
  attempt int := 0;
begin
  select referral_code into v_code from profiles where id = auth.uid();
  if v_code is not null then return v_code; end if;
  loop
    attempt := attempt + 1;
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, (floor(random() * 32) + 1)::int, 1);
    end loop;
    begin
      update profiles set referral_code = v_code where id = auth.uid();
      return v_code;
    exception when unique_violation then
      if attempt > 10 then raise exception 'could not mint referral code'; end if;
    end;
  end loop;
end;
$$;

-- 5. Attribute a referral: the signed-in user was invited via p_code.
--    No-ops on unknown codes, self-referral, or already-attributed users.
create or replace function public.apply_referral_code(p_code text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_referrer uuid;
  v_current  uuid := auth.uid();
begin
  if p_code is null or btrim(p_code) = '' then return false; end if;
  select id into v_referrer
    from profiles
   where referral_code = upper(btrim(p_code));
  if v_referrer is null or v_referrer = v_current then return false; end if;
  update profiles
     set referred_by = v_referrer
   where id = v_current and referred_by is null;
  return found;
end;
$$;

-- 6. topup_subscription: never top up a bonus row with a paid purchase,
--    and reward the referrer (if any) exactly once — on the friend's FIRST
--    purchase — with an instant 1-wash credit valid 30 days.
create or replace function public.topup_subscription(p_plan_id text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_plan     plans%rowtype;
  v_sub      subscriptions%rowtype;
  v_now      timestamptz := now();
  v_until    timestamptz := now() + interval '30 days';
  v_id       uuid;
  v_referrer uuid;
  v_email    text;
begin
  select * into v_plan from plans where id = p_plan_id;
  if not found then raise exception 'unknown plan'; end if;
  if v_plan.id = 'referral' then raise exception 'unknown plan'; end if;

  select * into v_sub from subscriptions
   where owner_id = auth.uid()
     and status = 'active'
     and renews_at > v_now
     and plan_id <> 'referral'          -- paid purchases top up paid packs only
   order by created_at desc
   limit 1
   for update;
  if found then
    update subscriptions
       set washes_total     = washes_total + v_plan.washes,
           washes_remaining = washes_remaining + v_plan.washes
     where id = v_sub.id;
    v_id := v_sub.id;
  else
    insert into subscriptions
      (owner_id, plan_id, plan_name, amount,
       washes_total, washes_remaining, status, started_at, renews_at)
    values
      (auth.uid(), v_plan.id, v_plan.name, v_plan.amount,
       v_plan.washes, v_plan.washes, 'active', v_now, v_until)
    returning id into v_id;
  end if;

  insert into payments
    (subscription_id, owner_id, amount, plan_name, method, reference)
  values
    (v_id, auth.uid(), v_plan.amount, v_plan.name, 'card (demo)',
     'WS-PAY-' || extract(year from v_now)::text || '-' ||
     lpad((floor(random() * 9000) + 1000)::int::text, 4, '0'));

  -- ---- refer-a-friend reward (first paid purchase only) ----
  select referred_by, email into v_referrer, v_email
    from profiles where id = auth.uid();
  if v_referrer is not null and v_referrer <> auth.uid() then
    perform 1 from referrals where referee_id = auth.uid();
    if not found then
      insert into referrals
        (referrer_id, referee_id, referee_email, status, rewarded_at)
      values
        (v_referrer, auth.uid(), coalesce(v_email, ''), 'rewarded', v_now);
      insert into subscriptions
        (owner_id, plan_id, plan_name, amount,
         washes_total, washes_remaining, status, started_at, renews_at)
      values
        (v_referrer, 'referral', 'Referral Bonus', 0,
         1, 1, 'active', v_now, v_now + interval '30 days');
    end if;
  end if;

  return v_id;
end;
$$;

comment on table referrals is 'refer-a-friend ledger: one rewarded row per referred friend';
comment on column profiles.referral_code is 'shareable referral code, e.g. KX7P2Q';
comment on column profiles.referred_by is 'profile id of the subscriber who referred this user';
