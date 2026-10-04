-- ============ migration_016: support tickets + notifications + fraud ============

-- ---------- support tickets ----------
create table if not exists public.tickets (
  id            uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references public.profiles(id) on delete cascade,
  partner_id    text references public.partners(id) on delete set null,
  wash_id       uuid references public.wash_transactions(id) on delete set null,
  category      text not null check (category in (
                  'wash_quality','refused_redemption','qr_problem',
                  'wrong_deduction','payment_issue','partner_unavailable',
                  'refund_request','account_problem','other')),
  subject       text not null,
  description   text not null default '',
  status        text not null default 'open'
                check (status in ('open','investigating','resolved','closed')),
  priority      text not null default 'normal'
                check (priority in ('low','normal','high')),
  internal_notes text not null default '',
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists tickets_subscriber_idx on public.tickets (subscriber_id, created_at desc);
create index if not exists tickets_status_idx on public.tickets (status, created_at desc);

alter table public.tickets enable row level security;

drop policy if exists "tickets own" on public.tickets;
create policy "tickets own" on public.tickets
  for all using (auth.uid() = subscriber_id)
  with check (auth.uid() = subscriber_id);
-- Subscribers cannot touch internal_notes: strip on write via trigger
drop policy if exists "tickets admin" on public.tickets;
create policy "tickets admin" on public.tickets
  for all using (public.is_admin()) with check (public.is_admin());

-- Subscribers must never write internal_notes (admin-only field).
create or replace function public.strip_ticket_admin_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if TG_OP = 'INSERT' then
      NEW.internal_notes := '';
    else
      NEW.internal_notes := OLD.internal_notes;
    end if;
  end if;
  return NEW;
end $$;

drop trigger if exists tickets_strip_admin on public.tickets;
create trigger tickets_strip_admin
  before insert or update on public.tickets
  for each row execute function public.strip_ticket_admin_fields();

-- ---------- notifications (in-app; email dispatch plugs in later) ----------
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text not null default '',
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read" on public.notifications
  for select using (auth.uid() = user_id);
drop policy if exists "notifications own update" on public.notifications;
create policy "notifications own update" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "notifications admin" on public.notifications;
create policy "notifications admin" on public.notifications
  for all using (public.is_admin()) with check (public.is_admin());

-- Server-side fan-out: any authenticated caller (e.g. a partner's redeem
-- flow notifying a subscriber) can queue a notification.
create or replace function public.notify_user(
  p_user_id uuid, p_kind text, p_title text, p_body text default '', p_link text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.notifications (user_id, kind, title, body, link)
  values (p_user_id, p_kind, p_title, p_body, p_link)
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.notify_user(uuid, text, text, text, text) to authenticated;

-- ---------- fraud dismissals ----------
create table if not exists public.fraud_dismissals (
  id         uuid primary key default gen_random_uuid(),
  rule       text not null,
  entity_id  text not null,
  reason     text not null default '',
  created_at timestamptz not null default now(),
  unique (rule, entity_id)
);

alter table public.fraud_dismissals enable row level security;

drop policy if exists "fraud dismissals admin" on public.fraud_dismissals;
create policy "fraud dismissals admin" on public.fraud_dismissals
  for all using (public.is_admin()) with check (public.is_admin());
