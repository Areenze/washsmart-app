-- migration_027.sql — waitlist_signups
-- Pre-launch waitlist on the washsmart.ng holding page.
-- Anyone can sign up; only admins can read (same pattern as
-- location_requests / partner_applications).
-- Emails are unique case-insensitively so a resubmit shows
-- "you're already on the list" instead of a duplicate row.

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  area text not null,
  owns_car boolean not null default true,
  how_heard text,
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_signups_email_key
  on public.waitlist_signups (lower(email));

alter table public.waitlist_signups enable row level security;

drop policy if exists "waitlist insert" on public.waitlist_signups;
drop policy if exists "waitlist admin"  on public.waitlist_signups;

create policy "waitlist insert" on public.waitlist_signups
  for insert with check (true);

create policy "waitlist admin" on public.waitlist_signups
  for all using (public.is_admin()) with check (public.is_admin());
