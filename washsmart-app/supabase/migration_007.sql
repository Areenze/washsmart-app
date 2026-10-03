-- ============ migration_007: fix ambiguous column in redeem_wash ============
-- redeem_wash returns table (wash_id uuid, washes_remaining int), so the OUT
-- parameter "washes_remaining" shadows the subscriptions column inside the
-- function body. Postgres rejects
--   update subscriptions set washes_remaining = washes_remaining - 1 ...
-- with "column reference washes_remaining is ambiguous", which broke every
-- partner redemption. Qualify the column explicitly. No behavior change.

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
    raise exception 'no washes remaining'; end if;
  if v_sub.renews_at < now() then
    -- 30-day credits lapsed: void the pack.
    update subscriptions
       set status = 'expired', washes_remaining = 0
     where id = v_sub.id;
    raise exception 'wash credits expired'; end if;

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
