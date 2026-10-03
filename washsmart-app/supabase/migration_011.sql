-- ============ migration_011: record real payment method/reference ============
-- topup_subscription gains optional p_method / p_reference so the server-side
-- Paystack verification route can record how the pack was actually paid for.
-- Defaults preserve the old demo behavior for existing callers.

drop function if exists public.topup_subscription(text);

create or replace function public.topup_subscription(
  p_plan_id   text,
  p_method    text default 'card (demo)',
  p_reference text default null
)
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
    (v_id, auth.uid(), v_plan.amount, v_plan.name, p_method,
     coalesce(p_reference,
       'WS-PAY-' || extract(year from v_now)::text || '-' ||
       lpad((floor(random() * 9000) + 1000)::int::text, 4, '0')));

  return v_id;
end;
$$;
