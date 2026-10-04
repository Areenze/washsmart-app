-- ============ migration_012: subscriber reviews for partners ============
-- One review per subscriber per partner (upsert). Only subscribers with a
-- completed wash at that partner may review — enforced in submit_review.
-- The RPC also refreshes partners.rating / partners.reviews aggregates.

create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  partner_id    uuid not null references public.partners(id) on delete cascade,
  subscriber_id uuid not null references public.profiles(id) on delete cascade,
  rating        smallint not null check (rating between 1 and 5),
  body          text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (partner_id, subscriber_id)
);

create index if not exists reviews_partner_idx
  on public.reviews (partner_id, created_at desc);

alter table public.reviews enable row level security;

-- Reviews are public; writes go through the submit_review RPC.
drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read" on public.reviews
  for select using (true);

-- Reviewers may remove their own review (admins via service role).
drop policy if exists "reviews delete own" on public.reviews;
create policy "reviews delete own" on public.reviews
  for delete using (auth.uid() = subscriber_id);

create or replace function public.submit_review(
  p_partner_id uuid,
  p_rating     smallint,
  p_body       text
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_washes int;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'rating must be 1-5'; end if;

  select count(*) into v_washes
    from wash_transactions
   where subscriber_id = auth.uid()
     and partner_id = p_partner_id;
  if v_washes = 0 then raise exception 'wash here first'; end if;

  insert into reviews (partner_id, subscriber_id, rating, body)
  values (p_partner_id, auth.uid(), p_rating,
          coalesce(nullif(trim(coalesce(p_body, '')), ''), ''))
  on conflict (partner_id, subscriber_id)
  do update set rating     = excluded.rating,
                body       = excluded.body,
                updated_at = now();

  -- refresh the partner's aggregate rating / review count
  update partners p
     set rating  = coalesce(sub.avg_rating, 5.0),
         reviews = coalesce(sub.n, 0)
    from (select avg(rating)::numeric(2,1) as avg_rating,
                 count(*) as n
            from reviews
           where partner_id = p_partner_id) sub
   where p.id = p_partner_id;
end;
$$;

grant execute on function public.submit_review(uuid, smallint, text) to authenticated;
