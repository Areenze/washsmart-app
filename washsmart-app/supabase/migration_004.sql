-- ============ migration_004: 30-day wash credits ============
-- Replaces calendar-month renewal with 30-day wash-credit packs:
-- every purchase grants N wash credits valid 30 days from purchase.
-- Unused credits expire (no rollover). renews_at now stores the
-- credit-pack expiry. Top-ups add credits to the live pack WITHOUT
-- extending its expiry.

-- ---------- subscriber: top up (or create) wash-credit pack ----------
-- SECURITY DEFINER so the top-up works under the subscriber RLS policy
-- (subscribers may read + insert subscriptions, not update them).
create or replace function public.topup_subscription(p_plan_id text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_plan  plans%rowtype;
  v_sub   subscriptions%rowtype;
  v_now   timestamptz := now();
  v_until timestamptz := now() + interval '30 days';
  v_id    uuid;
begin
  select * into v_plan from plans where id = p_plan_id;
  if not found then raise exception 'unknown plan'; end if;

  select * into v_sub from subscriptions
   where owner_id = auth.uid()
     and status = 'active'
     and renews_at > v_now
   order by created_at desc
   limit 1
   for update;

  if found then
    -- Top up the live pack: added credits share the current expiry,
    -- which never extends.
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

  return v_id;
end;
$$;

-- ---------- subscriber: issue a wash token (expiry guard added) ----------
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
  if v_sub.renews_at < now() then
    -- 30-day credits lapsed: void the pack.
    update subscriptions
       set status = 'expired', washes_remaining = 0
     where id = v_sub.id;
    raise exception 'wash credits expired';
  end if;
  insert into wash_tokens (token_hash, subscription_id, subscriber_id, expires_at)
  values (p_token_hash, p_subscription_id, v_sub.owner_id, v_exp)
  on conflict (token_hash) do nothing;
  return query select v_exp;
end;
$$;

-- ---------- partner: redeem a wash (expiry guard added) ----------
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
  if v_sub.renews_at < now() then
    -- 30-day credits lapsed: void the pack.
    update subscriptions
       set status = 'expired', washes_remaining = 0
     where id = v_sub.id;
    raise exception 'wash credits expired';
  end if;

  update wash_tokens
     set used_at = now(), redeemed_by_partner_id = p_partner_id
   where token_hash = p_token_hash;

  update subscriptions
     set washes_remaining = subscriptions.washes_remaining - 1
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

-- ---------- documentation ----------
comment on column plans.washes is 'washes per 30-day wash-credit pack';
comment on column subscriptions.renews_at is 'wash-credit expiry: 30 days from purchase; unused credits expire (no rollover)';
