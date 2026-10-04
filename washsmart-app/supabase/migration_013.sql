-- ============ migration_013: admin audit log ============
-- Every sensitive admin action (settlement approval, subscription cancel,
-- credit adjustments, …) writes a row here. Admins can read; inserts are
-- admin-only via RLS (the app writes through the normal client).

create table if not exists public.admin_audit_log (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid references public.profiles(id) on delete set null,
  action     text not null,   -- e.g. 'settlement.approve', 'subscription.cancel'
  entity     text not null,   -- e.g. 'settlement', 'subscription'
  entity_id  text not null,
  detail     text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_entity_idx
  on public.admin_audit_log (entity, entity_id, created_at desc);
create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin audit admin" on public.admin_audit_log;
create policy "admin audit admin" on public.admin_audit_log
  for all using (public.is_admin()) with check (public.is_admin());
