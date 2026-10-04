-- ============ migration_014: partner inspections ============
-- Structured site inspection between application review and approval.
-- Workflow: application → review → inspection → approval → activation.

create table if not exists public.inspections (
  id              uuid primary key default gen_random_uuid(),
  application_ref text not null unique references public.partner_applications(ref) on delete cascade,
  partner_id      text references public.partners(id) on delete set null,
  -- checklist: { "washing_area": { "pass": true, "note": "..." }, ... }
  checklist       jsonb not null default '{}'::jsonb,
  score           integer not null default 0,   -- % of items passed
  inspector_name  text not null default '',
  notes           text not null default '',
  status          text not null default 'in_progress'
                  check (status in ('in_progress','passed','failed')),
  inspected_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists inspections_status_idx
  on public.inspections (status, updated_at desc);

alter table public.inspections enable row level security;

drop policy if exists "inspections admin" on public.inspections;
create policy "inspections admin" on public.inspections
  for all using (public.is_admin()) with check (public.is_admin());
