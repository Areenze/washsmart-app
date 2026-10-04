-- ============ migration_019: plans admin write ============
-- Plans were public-read-only; plan configuration in /admin/settings
-- needs admin writes. Reads stay public.

drop policy if exists "plans admin" on public.plans;
create policy "plans admin" on public.plans
  for all using (public.is_admin()) with check (public.is_admin());
