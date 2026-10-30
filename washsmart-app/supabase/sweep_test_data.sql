-- ============================================================
-- sweep_test_data.sql — pre-launch test-data sweep (2026-10-30)
-- Run in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- NOT a migration. One-off cleanup after the Oct 2026 E2E rounds.
--
-- FINAL scope confirmed by Mm 2026-10-30: EVERYTHING test goes,
-- including the AGT-001 "Tunde Bakare" agent record + login and the
-- Olamilli application WS-2026-7208 (both were test data, not real).
--
-- KEEP (never touched):
--   auth users: udehemmanuel.c@gmail.com (Mm, admin),
--               support@washsmart.ng (admin)
--   ...and what belongs to them (Mm's Standard subscription, plans,
--   admin_audit_log, page_views, client_errors).
-- DELETE: every other auth user and everything test-created:
--   20 test accounts (incl. the higaxe5638 rogue admin), the test
--   agent AGT-001, all 3 test partners, all 6 applications,
--   WS-SET-000001, promo codes E2E20/E2EFIX, the E2E support ticket,
--   the Ikosi Ketu location request, the test waitlist signup.
-- ============================================================

-- ---------- RUN FIRST: full backup (separate run, before deletes) ----------
-- Supabase Free has no point-in-time restore, so snapshot every touched
-- table first. Tiny data (dozens of rows). Drop schema backup_sweep_20261030
-- a few days after the sweep verifies clean.
-- create schema if not exists backup_sweep_20261030;
-- create table backup_sweep_20261030.auth_users          as select * from auth.users;
-- create table backup_sweep_20261030.profiles            as select * from profiles;
-- create table backup_sweep_20261030.vehicles            as select * from vehicles;
-- create table backup_sweep_20261030.subscriptions       as select * from subscriptions;
-- create table backup_sweep_20261030.payments            as select * from payments;
-- create table backup_sweep_20261030.wash_transactions   as select * from wash_transactions;
-- create table backup_sweep_20261030.wash_tokens         as select * from wash_tokens;
-- create table backup_sweep_20261030.ledger_entries      as select * from ledger_entries;
-- create table backup_sweep_20261030.settlements         as select * from settlements;
-- create table backup_sweep_20261030.reviews             as select * from reviews;
-- create table backup_sweep_20261030.tickets             as select * from tickets;
-- create table backup_sweep_20261030.notifications       as select * from notifications;
-- create table backup_sweep_20261030.referrals           as select * from referrals;
-- create table backup_sweep_20261030.promo_codes         as select * from promo_codes;
-- create table backup_sweep_20261030.promo_redemptions   as select * from promo_redemptions;
-- create table backup_sweep_20261030.partners            as select * from partners;
-- create table backup_sweep_20261030.partner_applications as select * from partner_applications;
-- create table backup_sweep_20261030.inspections         as select * from inspections;
-- create table backup_sweep_20261030.location_requests   as select * from location_requests;
-- create table backup_sweep_20261030.waitlist_signups    as select * from waitlist_signups;
-- create table backup_sweep_20261030.agents              as select * from agents;

-- ---------- 0. Preview (run and eyeball BEFORE the deletes) ----------
-- Expect: 20 emails to delete; admins = the two keep accounts + the
-- higaxe5638@flakeian.com rogue admin (deleted below).
-- select email, created_at from auth.users
--  where lower(email) not in ('udehemmanuel.c@gmail.com',
--                             'support@washsmart.ng')
--  order by created_at;
-- select email from profiles where is_admin is true;
-- select bucket_id, name from storage.objects order by bucket_id, name;

begin;

-- ---------- 1. Wash activity (blocks partner/profile deletes) ----------
delete from wash_transactions
 where partner_id in ('WS-2026-0001', 'WS-2026-0002', 'WS-2026-0003')
    or subscriber_id in (
      select id from profiles where lower(email) not in
        ('udehemmanuel.c@gmail.com', 'support@washsmart.ng'));

-- Wash tokens are ephemeral (5-min TTL) — clear all.
delete from wash_tokens;

-- ---------- 2. Partner money ----------
delete from ledger_entries
 where partner_id in ('WS-2026-0001', 'WS-2026-0002', 'WS-2026-0003');
delete from settlements
 where partner_id in ('WS-2026-0001', 'WS-2026-0002', 'WS-2026-0003');

-- ---------- 3. Reviews / tickets / notifications ----------
delete from reviews
 where partner_id in ('WS-2026-0001', 'WS-2026-0002', 'WS-2026-0003');
delete from tickets where subject ilike 'E2E test ticket%';
delete from notifications
 where user_id in (
   select id from profiles where lower(email) not in
     ('udehemmanuel.c@gmail.com', 'support@washsmart.ng'));

-- ---------- 4. Promos (redemptions reference payments — go first) ----------
delete from promo_redemptions
 where subscriber_id in (
   select id from profiles where lower(email) not in
     ('udehemmanuel.c@gmail.com', 'support@washsmart.ng'));
delete from promo_codes where code in ('E2E20', 'E2EFIX');

-- ---------- 5. Subscriber money & plans ----------
delete from payments
 where owner_id in (
   select id from profiles where lower(email) not in
     ('udehemmanuel.c@gmail.com', 'support@washsmart.ng'));
delete from subscriptions
 where owner_id in (
   select id from profiles where lower(email) not in
     ('udehemmanuel.c@gmail.com', 'support@washsmart.ng'));
delete from referrals
 where referrer_id in (
   select id from profiles where lower(email) not in
     ('udehemmanuel.c@gmail.com', 'support@washsmart.ng'))
    or referee_id in (
   select id from profiles where lower(email) not in
     ('udehemmanuel.c@gmail.com', 'support@washsmart.ng'));

-- ---------- 6. Partners, applications & the test agent ----------
delete from inspections
 where application_ref in ('WS-2026-7426', 'WS-2026-9070', 'WS-2026-4378',
                           'WS-2026-2274', 'WS-2026-3922', 'WS-2026-7208');
delete from partners
 where partner_id in ('WS-2026-0001', 'WS-2026-0002', 'WS-2026-0003');
delete from partner_applications
 where ref in ('WS-2026-7426', 'WS-2026-9070', 'WS-2026-4378',
               'WS-2026-2274', 'WS-2026-3922', 'WS-2026-7208');
-- AGT-001 "Tunde Bakare" was a test agent (Mm, 2026-10-30) — record goes
-- too; its login dies with the auth.users delete in step 8.
delete from agents where code = 'AGT-001';

-- ---------- 7. Requests / waitlist / OTP scratch ----------
delete from location_requests where email = 'biyeli1817@flakeian.com';
delete from waitlist_signups where email = 'e2e-waitlist-check@example.com';
delete from phone_verifications;

-- ---------- 8. Test accounts (cascades profiles -> vehicles etc.) ----------
delete from auth.users
 where lower(email) not in ('udehemmanuel.c@gmail.com',
                            'support@washsmart.ng');

commit;

-- ---------- 9. Verify (run after): expect 2 users, 2 profiles,
-- 1 subscription (Mm's Standard), 0 partners, 0 applications, 0 agents ----------
-- select (select count(*) from auth.users)        as users,
--        (select count(*) from profiles)          as profiles,
--        (select count(*) from subscriptions)     as subscriptions,
--        (select count(*) from partners)          as partners,
--        (select count(*) from partner_applications) as applications,
--        (select count(*) from agents)            as agents;
