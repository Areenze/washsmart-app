-- migration_030: agent signup links + my-submissions, CAC fields + badge data
-- 1) CAC registration columns on applications and partners.
-- 2) approve_partner_application copies CAC fields to the partner record.
-- 3) agent_my_applications(): the signed-in agent's OWN applications
--    (partner_applications has no agent SELECT policy, so go through an
--    RPC like agent_referrals).

alter table partner_applications
  add column if not exists cac_type   text,
  add column if not exists cac_number text;

alter table partners
  add column if not exists cac_type   text,
  add column if not exists cac_number text;

-- ---------- approve: copy CAC fields ----------
create or replace function public.approve_partner_application(p_ref text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_app partner_applications%rowtype;
  v_pid text;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  select * into v_app from partner_applications where ref = p_ref;
  if not found then
    raise exception 'application not found';
  end if;
  if v_app.status <> 'pending' then
    raise exception 'application already reviewed';
  end if;

  select 'WS-2026-' || lpad((count(*) + 1)::text, 4, '0') into v_pid from partners;
  while exists (select 1 from partners where partner_id = v_pid) loop
    v_pid := 'WS-2026-' || lpad(((floor(random() * 9000) + 1000)::int)::text, 4, '0');
  end loop;

  insert into partners
        (id, application_ref, name, owner_name, phone, whatsapp, email,
         partner_id, settlement_rate,
         address, area, lga, state, gps, hours, services,
         bays, daily_capacity, years_operating, staff_count,
         cac_type, cac_number,
         status, approved_at)
  values
        (v_pid, v_app.ref, v_app.car_wash_name, v_app.owner_name, v_app.phone,
         v_app.whatsapp, v_app.email,
         v_pid, 2500,
         v_app.address, v_app.area, v_app.lga, v_app.state, v_app.gps,
         v_app.opening_hours, v_app.services,
         coalesce(v_app.wash_bays, 1), v_app.daily_capacity,
         v_app.years_operating, v_app.staff_count,
         v_app.cac_type, v_app.cac_number,
         'approved', now());

  update partner_applications
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   where ref = p_ref;

  return v_pid;
end;
$$;

-- ---------- agent: my applications ----------
create or replace function public.agent_my_applications()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_agent agents%rowtype;
begin
  select * into v_agent
    from agents
   where user_id = auth.uid()
     and status = 'active';
  if not found then
    raise exception 'not an agent';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.submitted_at desc)
    from (
      select
        pa.ref          as ref,
        pa.car_wash_name as business_name,
        pa.area         as area,
        pa.status       as status,
        pa.submitted_at as submitted_at
      from partner_applications pa
      where pa.agent_code = v_agent.code
    ) x
  ), '[]'::jsonb);
end;
$$;
