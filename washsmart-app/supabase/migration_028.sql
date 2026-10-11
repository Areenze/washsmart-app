-- ============================================================
-- migration_028.sql — login by email or phone number for
-- subscribers and partners (agents were covered in migration_026).
-- Run in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Requires public.normalize_ng_phone from migration_026.
-- ============================================================

-- Identifier -> login email for a subscriber. Accepts the account email
-- or the phone number stored on the profile.
create or replace function public.subscriber_login_lookup_identity(p_identity text)
returns table (id uuid, email text)
language sql security definer set search_path = public as $$
  select p.id, p.email
    from profiles p
   where lower(p.email) = lower(p_identity)
      or public.normalize_ng_phone(p.phone) = public.normalize_ng_phone(p_identity)
   limit 1;
$$;

-- Identifier -> login identity for a partner. Accepts the Partner ID
-- (kept working), the partner email, or the phone number on record.
-- Mirrors partner_login_lookup; the old RPC is left in place.
create or replace function public.partner_login_lookup_identity(p_identity text)
returns table (id text, email text, name text)
language sql security definer set search_path = public as $$
  select p.id, p.email, p.name
    from partners p
   where p.status = 'approved'
     and (
       upper(p.partner_id) = upper(p_identity)
       or lower(p.email) = lower(p_identity)
       or public.normalize_ng_phone(p.phone) = public.normalize_ng_phone(p_identity)
     )
   limit 1;
$$;
