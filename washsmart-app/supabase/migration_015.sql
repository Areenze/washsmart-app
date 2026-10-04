-- ============ migration_015: partner photo storage ============
-- 1) partners.photos: public gallery shown in the subscriber app.
-- 2) partner-photos bucket (public read):
--    - applications/<draft>/* : anonymous upload (public intake form)
--    - partners/<partner_id>/* : the partner themself, or admin

alter table public.partners
  add column if not exists photos text[] not null default '{}';

insert into storage.buckets (id, name, public)
values ('partner-photos', 'partner-photos', true)
on conflict (id) do nothing;

-- Public read (subscriber app gallery, admin review)
drop policy if exists "partner-photos public read" on storage.objects;
create policy "partner-photos public read" on storage.objects
  for select using (bucket_id = 'partner-photos');

-- Anonymous upload for the public application intake form
drop policy if exists "partner-photos application upload" on storage.objects;
create policy "partner-photos application upload" on storage.objects
  for insert with check (
    bucket_id = 'partner-photos'
    and (storage.foldername(name))[1] = 'applications'
  );

-- Partners manage their own folder
drop policy if exists "partner-photos partner write" on storage.objects;
create policy "partner-photos partner write" on storage.objects
  for all using (
    bucket_id = 'partner-photos'
    and (storage.foldername(name))[1] = 'partners'
    and (storage.foldername(name))[2] in (
      select id from public.partners where user_id = auth.uid()
    )
  ) with check (
    bucket_id = 'partner-photos'
    and (storage.foldername(name))[1] = 'partners'
    and (storage.foldername(name))[2] in (
      select id from public.partners where user_id = auth.uid()
    )
  );

-- Admin manages everything
drop policy if exists "partner-photos admin" on storage.objects;
create policy "partner-photos admin" on storage.objects
  for all using (
    bucket_id = 'partner-photos' and public.is_admin()
  ) with check (
    bucket_id = 'partner-photos' and public.is_admin()
  );
