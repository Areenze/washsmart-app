-- ============ migration_009: safe is_email_registered RPC ============
-- The login and checkout pages need to know whether an email is registered
-- while logged out. A direct profiles SELECT can't work: RLS only exposes a
-- user's own row, so logged-out lookups always returned "not found".
-- This SECURITY DEFINER function answers just that boolean without exposing
-- any profile data. (The app's UX already distinguishes registered vs not,
-- so this reveals nothing beyond the intended login/signup behavior.)

create or replace function public.is_email_registered(p_email text)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if p_email is null or btrim(p_email) = '' then
    return false;
  end if;
  return exists (
    select 1 from profiles where email = lower(btrim(p_email))
  );
end;
$$;

grant execute on function public.is_email_registered(text) to anon, authenticated;
