-- ============ migration_038: Premium Plus goes live + extras sessions ============
-- Mm's decision, 2026-11-19: include Premium Plus NOW (₦25,000), not in
-- a later phase. REQUIRES migration_037 first (the plans perk columns).
--
-- Premium Plus: ₦25,000 · 8 washes · 4 registered cars · referral
-- reward 2 · 5-day rollover grace · priority support · guest wash ·
-- 1 EXTRAS SESSION per 30-day cycle. An extras session upgrades one
-- wash with: engine wash + interior wipe + tyre shine + vacuuming
-- (on top of the standard wash every plan gets: exterior, dashboard
-- cleaning, carpet washing, boot cleaning).
--
-- Mechanics:
--   * plans.extras_per_cycle counts sessions per cycle (1 here).
--   * wash_transactions.extras flags the wash that carried the session;
--     the wash type becomes 'Premium Plus Wash + Extras'. The flag is
--     what settlements will price once the partner extras rate is
--     agreed — the per-wash payout itself is NOT changed here (partner
--     payout rates are still under negotiation, a separate decision).
--   * wash_extras_status(token_hash): partner-facing check at scan
--     time — is an extras session available for this subscription?
--   * redeem_extras_session(wash_id): called by the partner app right
--     after a successful redeem_wash when the subscriber uses their
--     session on that wash. Validates the wash is the caller's own
--     partner's, recent, on an extras-bearing plan, and that the
--     cycle's session is still unused. redeem_wash itself is NOT
--     touched (no signature changes, no new overloads — migration_036's
--     lesson).

-- ---------- 1. Premium Plus plan ----------
alter table public.plans
  add column if not exists extras_per_cycle int not null default 0;

insert into public.plans
  (id, name, amount, washes, popular, car_limit, referral_bonus,
   grace_days, priority_support, guest_wash, extras_per_cycle)
values
  ('premium_plus', 'Premium Plus', 25000, 8, false, 4, 2, 5, true, true, 1)
on conflict (id) do update set
  name = excluded.name, amount = excluded.amount, washes = excluded.washes,
  car_limit = excluded.car_limit, referral_bonus = excluded.referral_bonus,
  grace_days = excluded.grace_days,
  priority_support = excluded.priority_support,
  guest_wash = excluded.guest_wash,
  extras_per_cycle = excluded.extras_per_cycle;

-- ---------- 2. Extras flag on wash transactions ----------
alter table public.wash_transactions
  add column if not exists extras boolean not null default false;

-- ---------- 3. Extras status at scan time (partner) ----------
create or replace function public.wash_extras_status(p_token_hash text)
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
  -- Caller must be an approved partner (or an admin).
  if not exists (
       select 1 from partners
        where user_id = auth.uid() and status = 'approved'
     ) and not exists (
       select 1 from profiles where id = auth.uid() and is_admin
     ) then
    raise exception 'not authorized';
  end if;

  select * into v_tok from wash_tokens where token_hash = p_token_hash;
  if not found then raise exception 'invalid token'; end if;

  select * into v_sub from subscriptions where id = v_tok.subscription_id;
  if not found then raise exception 'invalid token'; end if;

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

revoke all on function public.wash_extras_status(text) from public, anon;
grant execute on function public.wash_extras_status(text) to authenticated;

-- ---------- 4. Redeem the extras session onto a just-redeemed wash ----------
create or replace function public.redeem_extras_session(p_wash_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tx   wash_transactions%rowtype;
  v_sub  subscriptions%rowtype;
  v_plan plans%rowtype;
begin
  select * into v_tx from wash_transactions where id = p_wash_id for update;
  if not found then raise exception 'wash not found'; end if;

  -- Only the partner who performed the wash can attach the session.
  perform 1 from partners
   where id = v_tx.partner_id and user_id = auth.uid();
  if not found then raise exception 'not authorized for this partner'; end if;

  if v_tx.extras then raise exception 'extras already added to this wash'; end if;
  if v_tx.redeemed_at < now() - interval '2 hours' then
    raise exception 'too late to add the extras session to this wash';
  end if;

  select * into v_sub from subscriptions where id = v_tx.subscription_id;
  select * into v_plan from plans where id = v_sub.plan_id;
  if coalesce(v_plan.extras_per_cycle, 0) <= 0 then
    raise exception 'this plan has no extras session';
  end if;

  -- One session per cycle (window ends at the pack's renews_at).
  perform 1 from wash_transactions
   where subscription_id = v_sub.id
     and extras
     and redeemed_at > v_sub.renews_at - interval '30 days';
  if found then raise exception 'extras session already used this cycle'; end if;

  update wash_transactions
     set extras = true,
         type   = 'Premium Plus Wash + Extras'
   where id = p_wash_id;
end;
$$;

revoke all on function public.redeem_extras_session(uuid) from public, anon;
grant execute on function public.redeem_extras_session(uuid) to authenticated;
