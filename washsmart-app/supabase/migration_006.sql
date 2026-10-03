-- migration_006.sql — location_requests
-- Subscribers ask for WashSMART coverage in their neighborhood/city
-- ("Don't see a WashSMART location in your area?").
-- Anyone can submit; only admins can read (same pattern as
-- partner_applications).

create table if not exists public.location_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  area text not null,
  created_at timestamptz not null default now()
);

alter table public.location_requests enable row level security;

drop policy if exists "location requests insert" on public.location_requests;
drop policy if exists "location requests admin"  on public.location_requests;

create policy "location requests insert" on public.location_requests
  for insert with check (true);

create policy "location requests admin" on public.location_requests
  for all using (public.is_admin()) with check (public.is_admin());
