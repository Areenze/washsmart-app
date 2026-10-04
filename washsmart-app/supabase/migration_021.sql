-- ============ migration_021: partner notifications audience ============
-- The notifications table served subscribers only. Partners need their own
-- notifications in the partner portal (redemptions, settlements). The
-- audience column routes them; the partner app filters audience='partner'.

alter table public.notifications
  add column if not exists audience text not null default 'subscriber'
  check (audience in ('subscriber', 'partner'));

create index if not exists notifications_audience_idx
  on public.notifications (user_id, audience, created_at desc);

-- notify_user gains an audience parameter. The default keeps every existing
-- 5-argument call working unchanged.
drop function if exists public.notify_user(uuid, text, text, text, text);
create or replace function public.notify_user(
  p_user_id uuid, p_kind text, p_title text,
  p_body text default '', p_link text default null,
  p_audience text default 'subscriber'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.notifications (user_id, kind, title, body, link, audience)
  values (p_user_id, p_kind, p_title, p_body, p_link, p_audience)
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.notify_user(uuid, text, text, text, text, text) to authenticated;
