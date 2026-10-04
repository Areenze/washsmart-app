-- ============ migration_020: tighten anonymous application photo uploads ============
-- The public application form needs anonymous uploads, but the old policy
-- allowed ANY file under applications/*. Now restricted to:
--   1. image extensions only (jpg/jpeg/png/webp/gif) — blocks executables, html, etc.
--   2. the applications/<draft-*> path shape the form actually uses.
-- The app already generates both (lib/db/photos.ts + app/join/apply draftId),
-- so legitimate uploads are unaffected.

drop policy if exists "partner-photos application upload" on storage.objects;
create policy "partner-photos application upload" on storage.objects
  for insert with check (
    bucket_id = 'partner-photos'
    and (storage.foldername(name))[1] = 'applications'
    and (storage.foldername(name))[2] like 'draft-%'
    and name ~* '\.(jpg|jpeg|png|webp|gif)$'
  );
