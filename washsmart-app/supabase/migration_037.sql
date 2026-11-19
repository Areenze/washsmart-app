-- ============ migration_037: plan tier perks (Mm's decisions, 2026-11-19) ============
-- The tiers stop being "more of the same" at a flat ₦2,500/wash:
--   Basic    ₦10,000/4 — 1 registered car · referral reward 1 wash
--   Standard ₦15,000/6 — 2 cars · priority support · referral reward 1
--   Premium  ₦20,000/8 — 3 cars · priority support · referral reward 2
--                        · 3-day rollover grace after expiry · guest wash
--   (Premium Plus ₦25,000/8 is Phase 2 — NOT seeded here, so it cannot
--    be sold yet. Its perk values land with the phase-2 migration.)
--
-- This migration:
--   1. Adds perk columns to plans (car_limit, referral_bonus, grace_days,
--      priority_support, guest_wash) and sets the values above.
--   2. Seeds the internal 'gift' plan row (like 'referral', never sold)
--      so gifted washes can live in subscriptions under the FK.
--   3. Replaces topup_subscription_for (migration_035 body) with:
--        * renewal now also moves the pack to the purchased plan
--          (plan_id/plan_name/amount follow the latest purchase);
--        * ROLLOVER GRACE: if the previous paid pack expired within
--          ITS plan's grace window (Premium 3 days) and still holds
--          washes, renewing revives it — leftovers roll over exactly
--          like a before-expiry renewal. Outside grace, expired washes
--          stay dead (migration_031 rule);
--        * the refer-a-friend reward follows the REFERRER's tier:
--          Premium referrers earn 2 bonus washes, everyone else 1.
--   4. Vehicle cap trigger: a subscriber cannot register more cars
--      than their live plan's car_limit (no live pack — e.g. during
--      onboarding, before choosing a plan — the max tier cap, 4,
--      applies so signup is never blocked; existing cars are never
--      deleted, the cap only blocks ADDING beyond it).
--   5. wash_gifts + gift_wash(email): Premium subscribers gift 1 wash
--      from their own pool per 30-day cycle to another account. The
--      wash moves (deducted from the giver's pack) into a 'gift'
--      credit for the recipient, valid 30 days, and the recipient is
--      notified. SECURITY DEFINER with strict internal checks, in the
--      pattern of redeem_wash; execute is authenticated-only.

-- ---------- 1. Plan perk columns ----------
alter table public.plans
  add column if not exists car_limit        int     not null default 1,
  add column if not exists referral_bonus   int     not null default 1,
  add column if not exists grace_days       int     not null default 0,
  add column if not exists priority_support boolean not null default false,
  add column if not exists guest_wash       boolean not null default false;

update public.plans set car_limit = 1, referral_bonus = 1, grace_days = 0,
  priority_support = false, guest_wash = false where id = 'basic';
update public.plans set car_limit = 2, referral_bonus = 1, grace_days = 0,
  priority_support = true,  guest_wash = false where id = 'standard';
update public.plans set car_limit = 3, referral_bonus = 2, grace_days = 3,
  priority_support = true,  guest_wash = true  where id = 'premium';
update public.plans set car_limit = 1, referral_bonus = 1, grace_days = 0,
  priority_support = false, guest_wash = false where id = 'referral';

-- ---------- 2. Internal 'gift' plan row (never sold) ----------
insert into public.plans
  (id, name, amount, washes, popular, car_limit, referral_bonus,
   grace_days, priority_support, guest_wash)
values
  ('gift', 'Gift Wash', 0, 1, false, 1, 1, 0, false, false)
on conflict (id) do nothing;

-- ---------- 3. topup_subscription_for: tiered referral + grace + plan follows purchase ----------
create or replace function public.topup_subscription_for(
  p_user_id      uuid,
  p_plan_id      text,
  p_method       text default 'card',
  p_reference    text default null,
  p_bonus_washes int  default 0
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_plan       plans%rowtype;
  v_sub        subscriptions%rowtype;
  v_old        subscriptions%rowtype;
  v_old_plan   plans%rowtype;
  v_now        timestamptz := now();
  v_until      timestamptz := now() + interval '30 days';
  v_id         uuid;
  v_referrer   uuid;
  v_email      text;
  v_ref_row    uuid;
  v_ref_bonus  int := 1;
  v_ref_plan   text;
begin
  select * into v_plan from plans where id = p_plan_id;
  if not found then raise exception 'unknown plan'; end if;
  if v_plan.id in ('referral', 'gift') then raise exception 'unknown plan'; end if;

  select * into v_sub from subscriptions
   where owner_id = p_user_id
     and status = 'active'
     and renews_at > v_now
     and plan_id not in ('referral', 'gift')  -- paid purchases top up paid packs only
   order by created_at desc
   limit 1
   for update;

  if found then
    -- Renewal before expiry: unused washes roll over (migration_031);
    -- the pack now also BECOMES the purchased plan.
    update subscriptions
       set washes_total     = washes_total + v_plan.washes,
           washes_remaining = washes_remaining + v_plan.washes,
           plan_id          = v_plan.id,
           plan_name        = v_plan.name,
           amount           = v_plan.amount,
           renews_at        = v_until
     where id = v_sub.id;
    v_id := v_sub.id;
  else
    -- No live pack. Rollover grace: the most recent paid pack may still
    -- be revivable if it expired within ITS plan's grace window and
    -- still holds washes.
    select * into v_old from subscriptions
     where owner_id = p_user_id
       and status in ('active', 'expired')
       and renews_at <= v_now
       and washes_remaining > 0
       and plan_id not in ('referral', 'gift')
     order by renews_at desc
     limit 1
     for update;

    if found then
      select * into v_old_plan from plans where id = v_old.plan_id;
      if found and v_old.renews_at + make_interval(days => v_old_plan.grace_days) > v_now then
        -- Within grace: revive the old pack — leftovers roll over and
        -- a fresh 30 days starts today, on the newly purchased plan.
        update subscriptions
           set washes_total     = washes_remaining + v_plan.washes,
               washes_remaining = washes_remaining + v_plan.washes,
               plan_id          = v_plan.id,
               plan_name        = v_plan.name,
               amount           = v_plan.amount,
               status           = 'active',
               started_at       = v_now,
               renews_at        = v_until
         where id = v_old.id;
        v_id := v_old.id;
      end if;
    end if;

    if v_id is null then
      -- First purchase, or the previous pack is beyond grace: fresh
      -- pack, fresh 30 days. Expired washes are never revived.
      insert into subscriptions
        (owner_id, plan_id, plan_name, amount,
         washes_total, washes_remaining, status, started_at, renews_at)
      values
        (p_user_id, v_plan.id, v_plan.name, v_plan.amount,
         v_plan.washes, v_plan.washes, 'active', v_now, v_until)
      returning id into v_id;
    end if;
  end if;

  -- Promo bonus washes (unchanged from migration_035): derived by the
  -- calling server route from the promo_codes row, never from the buyer.
  if coalesce(p_bonus_washes, 0) > 0 then
    update subscriptions
       set washes_total     = washes_total + p_bonus_washes,
           washes_remaining = washes_remaining + p_bonus_washes
     where id = v_id;
  end if;

  insert into payments
    (subscription_id, owner_id, amount, plan_name, method, reference)
  values
    (v_id, p_user_id, v_plan.amount, v_plan.name, p_method,
     coalesce(p_reference, 'WS-PAY-' || gen_random_uuid()::text));

  -- ---- refer-a-friend reward (first paid purchase only) ----
  -- The reward size follows the REFERRER's tier (Premium earns 2).
  select referred_by, email into v_referrer, v_email
    from profiles where id = p_user_id;
  if v_referrer is not null and v_referrer <> p_user_id then
    insert into referrals
      (referrer_id, referee_id, referee_email, status, rewarded_at)
    values
      (v_referrer, p_user_id, coalesce(v_email, ''), 'rewarded', v_now)
    on conflict (referee_id) do nothing
    returning id into v_ref_row;
    if v_ref_row is not null then
      select s.plan_id into v_ref_plan from subscriptions s
       where s.owner_id = v_referrer
         and s.status = 'active' and s.renews_at > v_now
         and s.plan_id not in ('referral', 'gift')
       order by s.created_at desc limit 1;
      if v_ref_plan is not null then
        select referral_bonus into v_ref_bonus from plans where id = v_ref_plan;
      end if;
      insert into subscriptions
        (owner_id, plan_id, plan_name, amount,
         washes_total, washes_remaining, status, started_at, renews_at)
      values
        (v_referrer, 'referral', 'Referral Bonus', 0,
         coalesce(v_ref_bonus, 1), coalesce(v_ref_bonus, 1),
         'active', v_now, v_now + interval '30 days');
    end if;
  end if;

  return v_id;
end;
$$;

revoke all on function public.topup_subscription_for(uuid, text, text, text, int)
  from public, anon, authenticated;
grant execute on function public.topup_subscription_for(uuid, text, text, text, int)
  to service_role;

-- ---------- 4. Vehicle cap ----------
create or replace function public.enforce_vehicle_cap()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_cap   int;
  v_count int;
begin
  select p.car_limit into v_cap
    from subscriptions s
    join plans p on p.id = s.plan_id
   where s.owner_id = new.owner_id
     and s.status = 'active'
     and s.renews_at > now()
     and s.plan_id not in ('referral', 'gift')
   order by s.created_at desc
   limit 1;
  -- No live paid pack (e.g. onboarding, before a plan is chosen): the
  -- highest tier cap applies so signup is never blocked.
  v_cap := coalesce(v_cap, 4);
  select count(*) into v_count from vehicles where owner_id = new.owner_id;
  if v_count >= v_cap then
    raise exception 'CAR_LIMIT: your current plan covers up to % registered car(s).', v_cap;
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_cap on public.vehicles;
create trigger vehicles_cap
  before insert on public.vehicles
  for each row execute function public.enforce_vehicle_cap();

-- ---------- 5. Guest wash ----------
create table if not exists public.wash_gifts (
  id                    uuid primary key default gen_random_uuid(),
  giver_id              uuid not null references public.profiles (id) on delete cascade,
  recipient_id          uuid not null references public.profiles (id) on delete cascade,
  giver_subscription_id uuid not null references public.subscriptions (id),
  gift_subscription_id  uuid references public.subscriptions (id),
  created_at            timestamptz not null default now()
);
create index if not exists idx_wash_gifts_giver on public.wash_gifts (giver_id, created_at desc);

alter table public.wash_gifts enable row level security;
drop policy if exists "wash gifts own" on public.wash_gifts;
create policy "wash gifts own" on public.wash_gifts
  for select using (giver_id = auth.uid() or recipient_id = auth.uid());

create or replace function public.gift_wash(p_recipient_email text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_giver     uuid := auth.uid();
  v_recipient profiles%rowtype;
  v_sub       subscriptions%rowtype;
  v_giver_nm  text;
  v_new_sub   uuid;
  v_gift_id   uuid;
  v_now       timestamptz := now();
begin
  if v_giver is null then raise exception 'not signed in'; end if;

  select * into v_recipient from profiles
   where lower(email) = lower(trim(p_recipient_email));
  if not found then
    raise exception 'No WashSMART account found for that email — ask them to sign up first.';
  end if;
  if v_recipient.id = v_giver then
    raise exception 'You cannot gift a wash to yourself.';
  end if;

  select * into v_sub from subscriptions
   where owner_id = v_giver
     and status = 'active'
     and renews_at > v_now
     and plan_id not in ('referral', 'gift')
   order by created_at desc
   limit 1
   for update;
  if not found then raise exception 'You need an active plan to gift a wash.'; end if;

  perform 1 from plans where id = v_sub.plan_id and guest_wash;
  if not found then raise exception 'Guest wash is a Premium perk.'; end if;
  if v_sub.washes_remaining <= 0 then raise exception 'No washes left to gift.'; end if;

  -- Once per cycle: the current cycle window ends at renews_at.
  perform 1 from wash_gifts
   where giver_id = v_giver
     and giver_subscription_id = v_sub.id
     and created_at > v_sub.renews_at - interval '30 days';
  if found then raise exception 'You have already gifted a wash this cycle.'; end if;

  -- Move the wash: out of the giver's pack, into a 30-day gift credit.
  update subscriptions
     set washes_total     = washes_total - 1,
         washes_remaining = washes_remaining - 1
   where id = v_sub.id;

  insert into subscriptions
    (owner_id, plan_id, plan_name, amount,
     washes_total, washes_remaining, status, started_at, renews_at)
  values
    (v_recipient.id, 'gift', 'Gift Wash', 0,
     1, 1, 'active', v_now, v_now + interval '30 days')
  returning id into v_new_sub;

  insert into wash_gifts
    (giver_id, recipient_id, giver_subscription_id, gift_subscription_id)
  values
    (v_giver, v_recipient.id, v_sub.id, v_new_sub)
  returning id into v_gift_id;

  select name into v_giver_nm from profiles where id = v_giver;
  insert into notifications (user_id, kind, title, body, link, audience)
  values (
    v_recipient.id,
    'gift_received',
    'You received a gift wash 🎁',
    coalesce(nullif(v_giver_nm, ''), 'A WashSMART subscriber') ||
      ' sent you 1 free wash, valid for 30 days. Book your wash at any WashSMART partner.',
    '/app',
    'subscriber'
  );

  return v_gift_id;
end;
$$;

revoke all on function public.gift_wash(text) from public, anon;
grant execute on function public.gift_wash(text) to authenticated;
