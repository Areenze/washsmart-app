-- migration_023: phone number verification (Termii OTP)
--
-- Adds phone_verified tracking to profiles and a server-side table for
-- pending OTP verifications. The Termii pin_id never touches the browser:
-- the client only sends the phone number and the code the user typed.

alter table profiles
  add column if not exists phone_verified boolean not null default false,
  add column if not exists phone_verified_at timestamptz;

create table if not exists phone_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phone text not null,
  pin_id text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists phone_verifications_user_idx
  on phone_verifications (user_id, created_at desc);

alter table phone_verifications enable row level security;

drop policy if exists "phone_verifications own" on phone_verifications;
create policy "phone_verifications own"
  on phone_verifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
