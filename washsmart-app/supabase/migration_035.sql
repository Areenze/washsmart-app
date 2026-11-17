-- ============ migration_035: close the 2026-11-17 audit's launch-blocking holes ============
-- Root cause of the critical findings: no function in the public schema
-- ever had EXECUTE revoked, so SECURITY DEFINER RPCs were callable
-- directly with the public anon key + any free account, bypassing the
-- app (and Paystack) entirely. This migration:
--   1. Moves subscription minting behind a service-role-only RPC
--      (topup_subscription_for). The /api/paystack/verify,
--      /api/checkout/promo and /api/checkout/demo routes call it with
--      the service key AFTER verifying the payment / promo / demo
--      environment server-side. The legacy client-callable mint paths
--      (topup_subscription, apply_promo_bonus, record_promo_redemption)
--      are revoked from anon + authenticated.
--      Also folds in two audit bug fixes from migration_031's body:
--      the fallback payment reference is now UUID-based (the old
--      'WS-PAY-<year>-<4 digits>' collided against payments.reference
--      unique), and the referral-reward insert is ON CONFLICT DO
--      NOTHING (a concurrent first purchase no longer fails the whole
--      purchase on the referrals.referee_id unique constraint).
--   2. Freezes partner sensitive columns against self-edit
--      (settlement_rate, status, bank details, ...) — the "partners own
--      update" policy had no column restrictions, so a partner could
--      set their own payout rate.
--   3. Freezes profile sensitive columns (phone_verified self-grant,
--      referral attribution, email) — migration_018 guarded only
--      is_admin. Phone verification is now written by the verify-phone
--      confirm route using the service role, after Termii says yes.
--   4. Restricts notify_user: previously any signed-in user could push
--      a fake notification (e.g. "Settlement paid") to ANY user. Now:
--      service role, admins, self-notifications, and an approved
--      partner notifying a subscriber who has washed with them.
--   5. Serves the public partner directory through a view exposing
--      display columns only (no email/whatsapp/settlement_rate/bank/
--      user_id); the base table's public SELECT policy is replaced
--      with own-row + admin.
--   6. redeem_wash: a partner can no longer redeem their own
--      subscription (self-redemption was only forbidden by the Terms).
--   7. issue_wash_token: TTL clamped to 30–300s (was caller-controlled
--      and uncapped — tokens could be minted valid for years).
--      inspect_wash_token: restricted to linked, approved partners
--      (was: any signed-in user could read a photographed QR's owner,
--      plan and balance).
--   8. Partner applications: non-admin inserts are forced to
--      status='pending' with no review fields (the anon insert policy
--      allowed forging status/agent attribution).
--   9. Support tickets: non-admins can no longer change status,
--      priority or resolved_at on an existing ticket.
--
-- DEPLOY ORDER: the new app code must be live (it uses the service
-- role for minting + OTP writes) — or land in the same sitting. Until
-- this runs, the app keeps working exactly as before.

-- ---------- 1a. topup_subscription_for (service role only) ----------
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
  v_plan     plans%rowtype;
  v_sub      subscriptions%rowtype;
  v_now      timestamptz := now();
  v_until    timestamptz := now() + interval '30 days';
  v_id       uuid;
  v_referrer uuid;
  v_email    text;
  v_ref_row  uuid;
begin
  select * into v_plan from plans where id = p_plan_id;
  if not found then raise exception 'unknown plan'; end if;
  if v_plan.id = 'referral' then raise exception 'unknown plan'; end if;

  select * into v_sub from subscriptions
   where owner_id = p_user_id
     and status = 'active'
     and renews_at > v_now
     and plan_id <> 'referral'          -- paid purchases top up paid packs only
   order by created_at desc
   limit 1
   for update;

  if found then
    -- Renewal before expiry: unused washes roll over; fresh 30 days
    -- from today (migration_031 semantics, unchanged).
    update subscriptions
       set washes_total     = washes_total + v_plan.washes,
           washes_remaining = washes_remaining + v_plan.washes,
           renews_at        = v_until
     where id = v_sub.id;
    v_id := v_sub.id;
  else
    insert into subscriptions
      (owner_id, plan_id, plan_name, amount,
       washes_total, washes_remaining, status, started_at, renews_at)
    values
      (p_user_id, v_plan.id, v_plan.name, v_plan.amount,
       v_plan.washes, v_plan.washes, 'active', v_now, v_until)
    returning id into v_id;
  end if;

  -- Promo bonus washes: the count is derived by the calling server
  -- route from the promo_codes row (validate_promo_code), never from
  -- the buyer. Granted onto the pack just minted/topped up.
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

revoke all on function public.topup_subscription_for(uuid, text, text, text, int)
  from public, anon, authenticated;
grant execute on function public.topup_subscription_for(uuid, text, text, text, int)
  to service_role;

-- ---------- 1b. record_promo_redemption_for (service role only) ----------
-- 017's logic with the buyer as a parameter, plus the revalidation
-- 017 skipped (active flag + time window re-checked at record time).
create or replace function public.record_promo_redemption_for(
  p_promo_id   uuid,
  p_user_id    uuid,
  p_payment_id uuid default null
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_promo promo_codes%rowtype;
begin
  select * into v_promo from promo_codes where id = p_promo_id;
  if not found then raise exception 'unknown promo'; end if;
  if not v_promo.active
     or (v_promo.starts_at is not null and v_promo.starts_at > now())
     or (v_promo.expires_at is not null and v_promo.expires_at <= now()) then
    raise exception 'Promo code is not active.';
  end if;

  update public.promo_codes
     set used_count = used_count + 1
   where id = p_promo_id
     and (max_uses is null or used_count < max_uses);
  if not found then
    raise exception 'Promo code is fully redeemed.';
  end if;

  insert into public.promo_redemptions (promo_id, subscriber_id, payment_id)
  values (p_promo_id, p_user_id, p_payment_id);
end;
$$;

revoke all on function public.record_promo_redemption_for(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.record_promo_redemption_for(uuid, uuid, uuid)
  to service_role;

-- ---------- 1c. Revoke the legacy client-callable mint paths ----------
revoke all on function public.topup_subscription(text, text, text)
  from public, anon, authenticated;
revoke all on function public.apply_promo_bonus(uuid, int)
  from public, anon, authenticated;
revoke all on function public.record_promo_redemption(uuid, uuid)
  from public, anon, authenticated;

-- ---------- 2. Freeze partner sensitive columns ----------
create or replace function public.freeze_partner_sensitive()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Service role (no JWT) and admins manage these fields.
  if auth.uid() is null or public.is_admin() then
    return NEW;
  end if;
  NEW.id                 := OLD.id;
  NEW.partner_id         := OLD.partner_id;
  NEW.user_id            := OLD.user_id;
  NEW.application_ref    := OLD.application_ref;
  NEW.status             := OLD.status;
  NEW.approved_at        := OLD.approved_at;
  NEW.settlement_rate    := OLD.settlement_rate;
  NEW.bank_name          := OLD.bank_name;
  NEW.bank_account_last4 := OLD.bank_account_last4;
  NEW.rating             := OLD.rating;
  NEW.reviews            := OLD.reviews;
  NEW.cac_type           := OLD.cac_type;
  NEW.cac_number         := OLD.cac_number;
  -- Phone verification can be REMOVED by the partner (e.g. number
  -- change drops it until re-verified) but never self-granted; the
  -- verify-phone confirm route grants it via the service role.
  if not coalesce(OLD.phone_verified, false)
     and coalesce(NEW.phone_verified, false) then
    NEW.phone_verified    := false;
    NEW.phone_verified_at := OLD.phone_verified_at;
  end if;
  return NEW;
end;
$$;

drop trigger if exists partners_freeze_sensitive on public.partners;
create trigger partners_freeze_sensitive
  before update on public.partners
  for each row execute function public.freeze_partner_sensitive();

-- ---------- 3. Freeze profile sensitive columns ----------
create or replace function public.freeze_profile_sensitive()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or public.is_admin() then
    return NEW;
  end if;
  NEW.email             := OLD.email;
  NEW.terms_accepted_at := OLD.terms_accepted_at;
  -- Phone verification: removable by the owner, never self-granted.
  if not coalesce(OLD.phone_verified, false)
     and coalesce(NEW.phone_verified, false) then
    NEW.phone_verified    := false;
    NEW.phone_verified_at := OLD.phone_verified_at;
  end if;
  -- Referral attribution is write-once, never to self, and only to a
  -- profile that actually owns a referral code — the same end state
  -- apply_referral_code produces, so the RPC flow is unaffected.
  if OLD.referred_by is not null then
    NEW.referred_by := OLD.referred_by;
  elsif NEW.referred_by is not null then
    if NEW.referred_by = NEW.id
       or not exists (select 1 from profiles p
                       where p.id = NEW.referred_by
                         and p.referral_code is not null) then
      NEW.referred_by := null;
    end if;
  end if;
  -- Referral code is set-once (mint_referral_code parity).
  if OLD.referral_code is not null then
    NEW.referral_code := OLD.referral_code;
  end if;
  return NEW;
end;
$$;

drop trigger if exists profiles_freeze_sensitive on public.profiles;
create trigger profiles_freeze_sensitive
  before update on public.profiles
  for each row execute function public.freeze_profile_sensitive();

-- ---------- 4. notify_user: relationship-gated ----------
create or replace function public.notify_user(
  p_user_id uuid, p_kind text, p_title text,
  p_body text default '', p_link text default null,
  p_audience text default 'subscriber'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if coalesce(auth.role(), '') = 'service_role'
     or public.is_admin()
     or p_user_id = auth.uid()
     or exists (
          select 1
            from partners p
            join wash_transactions w on w.partner_id = p.id
           where p.user_id = auth.uid()
             and p.status = 'approved'
             and w.subscriber_id = p_user_id
        ) then
    insert into public.notifications (user_id, kind, title, body, link, audience)
    values (p_user_id, p_kind, p_title, p_body, p_link, p_audience)
    returning id into v_id;
    return v_id;
  end if;
  raise exception 'not allowed to notify this user';
end $$;

revoke all on function public.notify_user(uuid, text, text, text, text, text)
  from public, anon;
grant execute on function public.notify_user(uuid, text, text, text, text, text)
  to authenticated, service_role;

-- ---------- 5. Partner directory: safe view + own-row base policy ----------
create or replace view public.partner_directory as
  select id, partner_id, name, phone,
         address, area, lga, state, gps, hours, services,
         bays, daily_capacity, years_operating, staff_count,
         rating, reviews, open_now, status, photos,
         cac_type, cac_number
    from partners
   where status = 'approved';

grant select on public.partner_directory to anon, authenticated, service_role;

drop policy if exists "partners directory" on partners;
drop policy if exists "partners own read" on partners;
create policy "partners own read" on partners
  for select using (user_id = auth.uid());

-- ---------- 6 + 7. redeem_wash self-redemption guard; token fixes ----------
create or replace function public.issue_wash_token(
  p_subscription_id uuid,
  p_token_hash      text,
  p_ttl_seconds     int default 300
)
returns table (expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_sub subscriptions%rowtype;
  -- TTL clamped to 30–300 seconds: the 300s anti-screenshot window is
  -- a design property, not a caller choice (migration_010 took the
  -- caller's value verbatim).
  v_exp timestamptz := now() + (least(greatest(coalesce(p_ttl_seconds, 300), 30), 300) || ' seconds')::interval;
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
  insert into wash_tokens (token_hash, subscription_id, subscriber_id, expires_at)
  values (p_token_hash, p_subscription_id, v_sub.owner_id, v_exp)
  on conflict (token_hash) do nothing;
  return query select v_exp;
end;
$$;

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

  -- Self-redemption: a partner cannot wash their own subscription —
  -- no service is delivered but a real earning would post.
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

  insert into ledger_entries (partner_id, kind, label, amount, ref, status)
  values (p_partner_id, 'wash_earning',
          'Wash ' || left(v_wash_id::text, 8) || ' — ' || p_type,
          v_partner.settlement_rate, v_wash_id::text, 'pending_settlement');

  return query select v_wash_id, v_sub.washes_remaining;
end;
$$;

create or replace function public.inspect_wash_token(p_token_hash text)
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
  v_tok  wash_tokens%rowtype;
  v_sub  subscriptions%rowtype;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  -- Only a linked, approved partner may inspect a token (migration_003
  -- let ANY signed-in user read the owner's name, plan and balance).
  if not exists (select 1 from partners p
                  where p.user_id = auth.uid() and p.status = 'approved') then
    raise exception 'partners only';
  end if;

  select * into v_tok from wash_tokens where token_hash = p_token_hash;
  if not found then
    return query select false, 'bad-token'::text,
      null::uuid, null::text, null::text, null::int;
    return;
  end if;
  if v_tok.used_at is not null then
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
    return query select false, 'bad-token'::text,
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

-- ---------- 8. Application insert sanitation ----------
create or replace function public.sanitize_application_insert()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_admin() then
    NEW.status      := 'pending';
    NEW.reviewed_by := null;
    NEW.reviewed_at := null;
  end if;
  return NEW;
end;
$$;

drop trigger if exists applications_sanitize on public.partner_applications;
create trigger applications_sanitize
  before insert on public.partner_applications
  for each row execute function public.sanitize_application_insert();

-- ---------- 9. Tickets: status/priority frozen for non-admins ----------
create or replace function public.strip_ticket_admin_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if TG_OP = 'INSERT' then
      NEW.internal_notes := '';
    else
      NEW.internal_notes := OLD.internal_notes;
      NEW.status         := OLD.status;
      NEW.priority       := OLD.priority;
      NEW.resolved_at    := OLD.resolved_at;
    end if;
  end if;
  return NEW;
end $$;
