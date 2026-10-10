-- ============================================================
-- migration_026.sql — agent login by email or phone number
-- Run in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- ============================================================

-- Normalize a Nigerian phone number to 0XXXXXXXXXX for comparison,
-- so 0803..., +234803... and 234803... all match the stored number.
create or replace function public.normalize_ng_phone(p text)
returns text
language sql immutable set search_path = public as $$
  select case
    when _d like '234%' and length(_d) > 10 then '0' || substr(_d, 4)
    else _d
  end
  from (select regexp_replace(p, '\D', '', 'g') as _d) s
$$;

-- Identifier -> login identity. Accepts the agent code (kept working),
-- the login email, or the phone number stored on the agent record.
-- Mirrors agent_login_lookup; the old RPC is left in place.
create or replace function public.agent_login_lookup_identity(p_identity text)
returns table (id uuid, email text, name text)
language sql security definer set search_path = public as $$
  select a.id, a.email, a.name
    from agents a
   where a.status = 'active'
     and a.user_id is not null
     and (
       upper(a.code) = upper(p_identity)
       or lower(a.email) = lower(p_identity)
       or public.normalize_ng_phone(a.phone) = public.normalize_ng_phone(p_identity)
     )
   limit 1;
$$;
