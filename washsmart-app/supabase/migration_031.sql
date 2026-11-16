-- ============ migration_031: renewal rollover (Mm's decision, 2026-11-16) ============
-- New rule for topup_subscription:
--   * Renew BEFORE the live pack expires -> unused washes ROLL OVER into
--     the renewed pack, and a fresh 30-day period starts on the renewal
--     date (renews_at = now + 30 days; it does NOT stack onto the old
--     expiry, and the old expiry no longer swallows the new washes).
--   * Renew AFTER expiry (or first purchase) -> a fresh pack starts;
--     expired washes are gone for good and are never revived.
-- This replaces migration_011's "added washes inherit the current expiry,
-- which never extends" behaviour, which punished early renewal (renewing
-- one day before expiry left one day to use the new washes).
--
-- Also restores two protections migration_011 accidentally dropped from
-- migration_005:
--   * paid purchases never top up a referral-bonus row (plan_id='referral'),
--     and the referral plan itself can never be "bought";
--   * the refer-a-friend reward: on a referred friend's FIRST paid
--     purchase, the referrer gets a separate 1-wash bonus credit valid
--     30 days (its own subscription row, untouched by renewals).

create or replace function public.topup_subscription(
  p_plan_id   text,
  p_method    text default 'card (demo)',
  p_reference text default null
)
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
    -- Renewal before expiry: the remaining washes roll over (they are
    -- already in washes_remaining; we simply add the new plan's washes)
    -- and a fresh 30-day period starts today.
    update subscriptions
       set washes_total     = washes_total + v_plan.washes,
           washes_remaining = washes_remaining + v_plan.washes,
           renews_at        = v_until
     where id = v_sub.id;
    v_id := v_sub.id;
  else
    -- First purchase, or the previous pack already expired: fresh pack,
    -- fresh 30 days. Expired washes are never revived.
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
    (v_id, auth.uid(), v_plan.amount, v_plan.name, p_method,
     coalesce(p_reference,
       'WS-PAY-' || extract(year from v_now)::text || '-' ||
       lpad((floor(random() * 9000) + 1000)::int::text, 4, '0')));

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
