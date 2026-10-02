-- ============================================================================
-- WashSMART backend migration 003: token inspection RPC + ledger link
-- ----------------------------------------------------------------------------
-- Run AFTER supabase/rls.sql in the Supabase SQL editor.
-- ============================================================================

-- Link ledger lines to the settlement they were closed into.
alter table ledger_entries
  add column if not exists settlement_id text
    references settlements (id) on delete set null;
create index if not exists idx_ledger_settlement on ledger_entries (settlement_id);

-- Read-only token check for the partner verification checklist.
-- The token hash IS the bearer credential, so wash_tokens has no SELECT
-- policy by design; this SECURITY DEFINER RPC is the only read path.
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
