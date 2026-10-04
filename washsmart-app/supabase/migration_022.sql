-- ============ migration_022: first-party analytics & error monitoring ============
-- Lightweight, privacy-friendly telemetry owned by WashSMART (no third-party
-- tracker, no cookies, no IP storage). Powers the traffic + errors sections
-- on /admin/reports.

create table if not exists public.page_views (
  id         uuid primary key default gen_random_uuid(),
  session_id text not null,                 -- random per-browser session, not a person
  path       text not null,                 -- e.g. '/app/signup'
  referrer   text,
  created_at timestamptz not null default now()
);
create index if not exists page_views_created_idx
  on public.page_views (created_at desc);
create index if not exists page_views_path_idx
  on public.page_views (path, created_at desc);

create table if not exists public.client_errors (
  id         uuid primary key default gen_random_uuid(),
  session_id text,
  path       text,
  message    text not null,
  stack      text,
  created_at timestamptz not null default now()
);
create index if not exists client_errors_created_idx
  on public.client_errors (created_at desc);

alter table public.page_views enable row level security;
alter table public.client_errors enable row level security;

-- Anyone (including logged-out visitors) may record a view/error;
-- only admins may read them.
drop policy if exists "page_views anon insert" on public.page_views;
create policy "page_views anon insert" on public.page_views
  for insert to anon, authenticated with check (true);
drop policy if exists "page_views admin read" on public.page_views;
create policy "page_views admin read" on public.page_views
  for select using (public.is_admin());

drop policy if exists "client_errors anon insert" on public.client_errors;
create policy "client_errors anon insert" on public.client_errors
  for insert to anon, authenticated with check (true);
drop policy if exists "client_errors admin read" on public.client_errors;
create policy "client_errors admin read" on public.client_errors
  for select using (public.is_admin());
