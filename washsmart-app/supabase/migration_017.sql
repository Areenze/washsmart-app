-- ============ migration_017: promotions (promo codes) ============

create table if not exists public.promo_codes (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,          -- stored UPPERCASE
  kind         text not null check (kind in ('percent','fixed','bonus_washes')),
  value        numeric not null check (value > 0),
  -- percent: 1-100 | fixed: naira off | bonus_washes: extra washes granted
  plan_ids     text[] null,                   -- null = all plans
  max_uses     int null,
  used_count   int not null default 0,
  max_per_user int not null default 1,
  starts_at    timestamptz null,
  expires_at   timestamptz null,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.promo_redemptions (
  id            uuid primary key default gen_random_uuid(),
  promo_id      uuid not null references public.promo_codes(id) on delete cascade,
  subscriber_id uuid not null references public.profiles(id) on delete cascade,
  payment_id    uuid references public.payments(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (promo_id, subscriber_id)
);
create index if not exists promo_redemptions_promo_idx
  on public.promo_redemptions (promo_id);

alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;

-- No public read on promo_codes: codes are validated through the RPC so the
-- full list of active codes can't be scraped.
drop policy if exists "promo codes admin" on public.promo_codes;
create policy "promo codes admin" on public.promo_codes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "promo redemptions own" on public.promo_redemptions;
create policy "promo redemptions own" on public.promo_redemptions
  for select using (auth.uid() = subscriber_id);
drop policy if exists "promo redemptions admin" on public.promo_redemptions;
create policy "promo redemptions admin" on public.promo_redemptions
  for all using (public.is_admin()) with check (public.is_admin());

-- Validate a code for the calling subscriber + plan. Returns one row when
-- usable: (promo_id, kind, value, discount_naira, label). Empty when not.
create or replace function public.validate_promo_code(p_code text, p_plan_id text)
returns table (promo_id uuid, kind text, value numeric, discount_naira numeric, label text)
language plpgsql security definer set search_path = public as $$
declare v_plan_amount numeric;
begin
  select amount into v_plan_amount from public.plans where id = p_plan_id;
  if v_plan_amount is null then return; end if;

  return query
  select
    c.id,
    c.kind,
    c.value,
    case
      when c.kind = 'percent' then least(round(v_plan_amount * c.value / 100), v_plan_amount)
      when c.kind = 'fixed'   then least(c.value, v_plan_amount)
      else 0
    end as discount_naira,
    case
      when c.kind = 'percent'      then c.value::int || '% off'
      when c.kind = 'fixed'        then '₦' || c.value::int || ' off'
      else '+' || c.value::int || ' bonus washes'
    end as label
  from public.promo_codes c
  where upper(c.code) = upper(trim(p_code))
    and c.active
    and (c.starts_at is null or c.starts_at <= now())
    and (c.expires_at is null or c.expires_at > now())
    and (c.max_uses is null or c.used_count < c.max_uses)
    and (c.plan_ids is null or p_plan_id = any(c.plan_ids))
    and (select count(*) from public.promo_redemptions r
         where r.promo_id = c.id and r.subscriber_id = auth.uid()) < c.max_per_user;
end $$;
grant execute on function public.validate_promo_code(text, text) to authenticated;

-- Record a redemption: atomically bumps used_count (fails when exhausted)
-- and inserts the per-subscriber row (unique guard against double-use).
create or replace function public.record_promo_redemption(p_promo_id uuid, p_payment_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.promo_codes
     set used_count = used_count + 1
   where id = p_promo_id
     and (max_uses is null or used_count < max_uses);
  if not found then
    raise exception 'Promo code is fully redeemed.';
  end if;

  insert into public.promo_redemptions (promo_id, subscriber_id, payment_id)
  values (p_promo_id, auth.uid(), p_payment_id);
end $$;
grant execute on function public.record_promo_redemption(uuid, uuid) to authenticated;

-- Grant bonus washes onto a freshly minted subscription owned by the caller.
create or replace function public.apply_promo_bonus(p_subscription_id uuid, p_washes int)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_washes <= 0 then return; end if;
  update public.subscriptions
     set washes_remaining = washes_remaining + p_washes,
         washes_total = washes_total + p_washes
   where id = p_subscription_id
     and owner_id = auth.uid();
end $$;
grant execute on function public.apply_promo_bonus(uuid, int) to authenticated;
