-- migration_032: phone verification for partners (Termii OTP)
--
-- Extends the subscriber phone-verification system (migration_023) to
-- partners. Partners reuse the same /api/verify-phone/send|confirm
-- routes and the same phone_verifications table (keyed by auth user);
-- on a successful confirm, the partner row linked to that auth user is
-- marked verified too. The verified number becomes the number on the
-- partner record (same semantics as profiles for subscribers).

alter table partners
  add column if not exists phone_verified boolean not null default false,
  add column if not exists phone_verified_at timestamptz;
