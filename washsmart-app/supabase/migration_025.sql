-- migration_025: field-agent program Phase 2 — agent accounts.
--
-- Agents are created by admins in /admin/agents (code auto-issued as AGT-001…).
-- The admin then creates the agent's auth user in the Supabase dashboard and
-- links it, mirroring the partner pattern:
--   update agents set user_id = '<auth-user-uuid>', email = '<email>'
--   where code = 'AGT-001';
-- Agents sign in at washsmart.ng/agent with their agent code + password.

create sequence if not exists agent_code_seq start 1;

create table if not exists agents (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique
              default ('AGT-' || lpad(nextval('agent_code_seq')::text, 3, '0')),
  name        text not null,
  phone       text not null,
  email       text,                       -- set when the auth user is linked
  user_id     uuid,                       -- auth.users.id, null until linked
  status      text not null default 'active'
              check (status in ('active','inactive')),
  created_at  timestamptz not null default now(),
  created_by  uuid
);
create index if not exists idx_agents_code on agents (code);
create index if not exists idx_agents_user on agents (user_id);

alter table agents enable row level security;

drop policy if exists "agents admin" on agents;
drop policy if exists "agents own row" on agents;
-- Admins manage all agents; an agent may read only their own row.
create policy "agents admin" on agents
  for all using (public.is_admin()) with check (public.is_admin());
create policy "agents own row" on agents
  for select using (auth.uid() = user_id);

-- ---------- Agent code -> login identity (mirrors partner_login_lookup) ----------
-- Returns only the row matching the supplied agent code.
create or replace function public.agent_login_lookup(p_code text)
returns table (id uuid, email text, name text)
language sql security definer set search_path = public as $$
  select a.id, a.email, a.name
    from agents a
   where a.code = upper(p_code)
     and a.status = 'active'
     and a.user_id is not null
   limit 1;
$$;

-- ---------- Agent dashboard data ----------
-- Referred partners for the SIGNED-IN agent, with wash counts and bounty-gate
-- progress. Bounty gate (PROPOSED figures, not yet approved by Mm):
-- 20 verified washes within 60 days of partner approval -> ₦10,000 bounty.
create or replace function public.agent_referrals()
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
    select jsonb_agg(to_jsonb(x) order by (x.approved_at is null), x.approved_at desc nulls last)
    from (
      select
        p.partner_id                                    as partner_id,
        p.name                                          as name,
        p.area                                          as area,
        p.status                                        as status,
        p.approved_at                                   as approved_at,
        (select count(*) from wash_transactions w
          where w.partner_id = p.id)                    as washes_total,
        (select count(*) from wash_transactions w
          where w.partner_id = p.id
            and p.approved_at is not null
            and w.redeemed_at >= p.approved_at
            and w.redeemed_at <  p.approved_at + interval '60 days'
        )                                             as washes_gate
      from partners p
      join partner_applications pa on pa.ref = p.application_ref
      where pa.agent_code = v_agent.code
    ) x
  ), '[]'::jsonb);
end;
$$;

-- ---------- Admin: agent overview ----------
-- Every agent with referral stats, for /admin/agents. Admin only.
create or replace function public.admin_agent_overview()
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc)
    from (
      select
        a.id                                            as id,
        a.code                                          as code,
        a.name                                          as name,
        a.phone                                         as phone,
        a.email                                         as email,
        a.status                                        as status,
        a.created_at                                    as created_at,
        (a.user_id is not null)                         as linked,
        (select count(*) from partners p
          join partner_applications pa on pa.ref = p.application_ref
         where pa.agent_code = a.code)                  as partners_referred,
        (select count(*) from partners p
          join partner_applications pa on pa.ref = p.application_ref
         where pa.agent_code = a.code
           and p.status = 'approved')                    as partners_active,
        (select count(*) from wash_transactions w
          join partners p on p.id = w.partner_id
          join partner_applications pa on pa.ref = p.application_ref
         where pa.agent_code = a.code)                  as washes_total,
        (select count(*) from partners p
          join partner_applications pa on pa.ref = p.application_ref
         where pa.agent_code = a.code
           and p.approved_at is not null
           and (select count(*) from wash_transactions w
                 where w.partner_id = p.id
                   and w.redeemed_at >= p.approved_at
                   and w.redeemed_at <  p.approved_at + interval '60 days') >= 20
        )                                             as gates_hit
      from agents a
    ) x
  ), '[]'::jsonb);
end;
$$;
