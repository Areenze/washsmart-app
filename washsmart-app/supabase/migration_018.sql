-- ============ migration_018: close privilege-escalation holes ============
--
-- 1. Subscriptions/payments must ONLY be created by the topup_subscription
--    RPC (SECURITY DEFINER, called after real payment verification).
--    The old "insert your own row" policies let any signed-in user mint
--    free wash credits for themselves.
drop policy if exists "subs insert" on public.subscriptions;
drop policy if exists "payments insert" on public.payments;

-- 2. The "profiles own" policy is FOR ALL, so a signed-in user could
--    UPDATE their own row and set is_admin = true. This trigger blocks
--    any is_admin change unless the caller is already an admin or the
--    service role (no JWT).
create or replace function public.prevent_admin_escalation()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Service role (no JWT) and existing admins may manage the flag.
  if auth.uid() is null or public.is_admin() then
    return NEW;
  end if;
  if TG_OP = 'INSERT' then
    if coalesce(NEW.is_admin, false) then
      raise exception 'Only admins can grant admin status.';
    end if;
  elsif NEW.is_admin is distinct from OLD.is_admin then
    raise exception 'Only admins can change admin status.';
  end if;
  return NEW;
end $$;

drop trigger if exists profiles_no_escalation on public.profiles;
create trigger profiles_no_escalation
  before insert or update on public.profiles
  for each row execute function public.prevent_admin_escalation();
