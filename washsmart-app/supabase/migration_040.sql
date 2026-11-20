-- migration_040: fix two runtime faults in migration_039.
--
-- Fault 1 — the code never minted. issue_wash_token_with_code's
-- expired-code cleanup UPDATE referenced `expires_at` unqualified, but
-- the function also RETURNS TABLE (expires_at ...), so PL/pgSQL raised
-- "column reference expires_at is ambiguous" on every call. The app
-- silently fell back to token-only minting, so no subscriber ever saw
-- a code. Fixed by aliasing the table in that UPDATE.
--
-- Fault 2 — the lockout helper could never run. wash_code_attempts
-- .partner_id was declared uuid, but partners.id is TEXT (e.g.
-- 'WS-2026-0001'), so code_entry_locked(v_partner.id) failed with
-- "invalid input syntax for type uuid" — which would have broken
-- every code inspect/redeem. Column and helper now use text.
--
-- Both faults reproduced and the fixes verified against a local
-- Postgres before shipping (mint → inspect → redeem → replay →
-- lockout all pass). The app needs no changes.

-- ---------- Fault 2: partner_id is text, not uuid ----------
drop function if exists public.code_entry_locked(uuid);

alter table public.wash_code_attempts
  alter column partner_id type text;

create or replace function public.code_entry_locked(p_partner_id text)
returns boolean
language sql security definer set search_path = public as $$
  select count(*) >= 5
    from wash_code_attempts
   where partner_id = p_partner_id
     and attempted_at > now() - interval '15 minutes';
$$;

revoke all on function public.code_entry_locked(text) from public, anon, authenticated;
grant execute on function public.code_entry_locked(text) to service_role;

-- ---------- Fault 1: unambiguous cleanup UPDATE ----------
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
  -- space does not drain over time. (Table aliased: bare `expires_at`
  -- collides with this function's output column of the same name.)
  update wash_tokens wt
     set code_hash = null
   where wt.code_hash is not null
     and wt.used_at is null
     and wt.expires_at < now();

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
