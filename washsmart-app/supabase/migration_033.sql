-- ============ migration_033: record Terms & Privacy acceptance at signup ============
-- The signup form states that creating an account means agreeing to
-- WashSMART's Terms of Service and Privacy Policy. The client stamps
-- terms_accepted_at into the auth user metadata at signup;
-- handle_new_user copies it onto the new profile so the acceptance is
-- on record with a timestamp. Signups without the metadata (admin-
-- created accounts, magic-link first logins) simply get null.

alter table profiles
  add column if not exists terms_accepted_at timestamptz;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, phone, terms_accepted_at)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'name', ''),
          new.email,
          coalesce(new.raw_user_meta_data ->> 'phone', ''),
          (new.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz)
  on conflict (id) do nothing;
  return new;
end;
$$;
