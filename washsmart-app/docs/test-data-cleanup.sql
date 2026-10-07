-- ============================================================
-- WashSMART pre-launch test-data cleanup — DRAFT for Mm's approval
-- Prepared 2026-10-06. NOTHING HERE RUNS UNTIL YOU SAY SO.
--
-- HOW TO USE (Supabase dashboard → SQL editor):
--   1. Fill the remaining <E2E_PARTNER_ID> placeholder in PART 2 with the
--      Partner ID issued when WS-2026-7426 is approved. The test subscriber
--      email (udehemmanuel.c+e2eoct6@gmail.com, 2026-10-06 E2E) is already
--      filled in.
--   2. Run PART 1 first and read the output — it shows exactly what
--      would be deleted. It deletes nothing.
--   3. Only when every PART 1 row is a test row, run PART 2.
--   4. PART 3 (auth users) must be done in Dashboard → Authentication
--      → Users (SQL cannot delete auth.users without the service role).
--      Deleting an auth user CASCADES to its profile row automatically.
--
-- SCHEMA NOTES (verified against supabase/ on 2026-10-06):
--   partner_applications is keyed by `ref` (text, e.g. 'WS-2026-7426').
--   partners is keyed by `id` (TEXT, e.g. 'WS-2026-0001') — not uuid.
--   Child tables reference partners(id) via their own `partner_id` TEXT col.
--   profiles.id → auth.users(id) ON DELETE CASCADE; vehicles, subscriptions,
--   referrals, wash_tokens, promo_redemptions cascade from profiles.
--   wash_tokens cascades from subscriptions too.
--
-- KEEP LIST (never delete):
--   - Mm's Gmail admin profile (udehemmanuel.c@gmail.com, is_admin=true)
--   - support@washsmart.ng admin profile (is_admin=true)
--   - Tunde Bakare, agents row AGT-001 (real field agent — NOT test data)
--   - plans table (Basic/Standard/Premium seed rows)
-- ============================================================

-- ==================== PART 1: VERIFICATION (read-only) ====================
-- Run these and confirm every returned row is test data before PART 2.

-- 1a. Test partner applications (expect: WS-2026-7426 "E2E Test Wash" + the 5
--     from the 2026-10-05 audit, incl. the pending Olamilli application)
SELECT ref, car_wash_name, status, agent_code, created_at
FROM partner_applications
WHERE ref = 'WS-2026-7426'
   OR car_wash_name ILIKE '%test%' OR car_wash_name ILIKE '%olamilli%'
   OR car_wash_name ILIKE '%e2e%' OR car_wash_name ILIKE '%zzz%';

-- 1b. Test partners (expect: Test Wash Lagos WS-2026-0001, Auto Clean
--     WS-2026-0002, plus the partner row issued when WS-2026-7426 is approved)
--     DECISION NEEDED: is Auto Clean a real partner? Keep Test Wash Lagos?
SELECT id, name, status, created_at
FROM partners
WHERE id IN ('WS-2026-0001', 'WS-2026-0002', '<E2E_PARTNER_ID>');

-- 1c. Test subscriber profiles (expect: the 2026-10-06 E2E throwaway +
--     test profiles from the audit; EXCLUDES the two real admins)
SELECT id, email, name, is_admin, created_at
FROM profiles
WHERE email = 'udehemmanuel.c+e2eoct6@gmail.com'
   OR email ILIKE '%test%' OR email ILIKE '%e2e%'
   OR email ILIKE '%olamilli%' OR email ILIKE '%tempmail%'
   OR email ILIKE '%mailinator%' OR email ILIKE '%guerrilla%';

-- 1d. Subscriptions tied to test subscribers
SELECT s.id, s.plan_name, s.washes_remaining, s.expires_at, p.email
FROM subscriptions s JOIN profiles p ON p.id = s.owner_id
WHERE p.email = 'udehemmanuel.c+e2eoct6@gmail.com'
   OR p.email ILIKE '%test%' OR p.email ILIKE '%e2e%';

-- 1e. Payments tied to test subscribers (Paystack TEST-mode references only —
--     no real money moved)
SELECT pay.id, pay.amount, pay.reference, pay.method, p.email
FROM payments pay JOIN profiles p ON p.id = pay.owner_id
WHERE p.email = 'udehemmanuel.c+e2eoct6@gmail.com'
   OR p.email ILIKE '%test%' OR p.email ILIKE '%e2e%';

-- 1f. Wash tokens + transactions from the test washes
SELECT token_hash, subscriber_id, redeemed_by_partner_id, used_at
FROM wash_tokens
WHERE redeemed_by_partner_id IN ('WS-2026-0001', 'WS-2026-0002', '<E2E_PARTNER_ID>');
SELECT id, partner_id, type, payout, redeemed_at
FROM wash_transactions
WHERE partner_id IN ('WS-2026-0001', 'WS-2026-0002', '<E2E_PARTNER_ID>');

-- 1g. Test settlements + ledger entries (expect WS-SET-000001, approved but
--     unpaid — the 2026-10-04 test settlement)
SELECT id, partner_id, status, payable FROM settlements
WHERE partner_id IN ('WS-2026-0001', 'WS-2026-0002', '<E2E_PARTNER_ID>');
SELECT id, partner_id, kind, amount, status FROM ledger_entries
WHERE partner_id IN ('WS-2026-0001', 'WS-2026-0002', '<E2E_PARTNER_ID>');

-- 1h. Test reviews, tickets, location requests, promo codes
SELECT id, partner_id, rating, body FROM reviews
WHERE body ILIKE '%test%' OR (rating = 5 AND body = 'Excellent wash');
SELECT id, subject, status FROM tickets
WHERE subject ILIKE '%test%' OR subject ILIKE '%e2e%';
SELECT id, email, area FROM location_requests
WHERE email ILIKE '%test%' OR email ILIKE '%e2e%';
SELECT code, active, used_count FROM promo_codes
WHERE code ILIKE '%TEST%' OR code ILIKE '%E2E%' OR active = false;

-- 1i. Any test profile that was granted admin (revoke BEFORE deleting)
SELECT id, email, is_admin FROM profiles
WHERE is_admin = true AND email NOT IN ('udehemmanuel.c@gmail.com', 'support@washsmart.ng');

-- ==================== PART 2: DELETIONS (after approval only) ==============
-- Children first, then parents. Uncomment each block only after PART 1
-- confirms its rows. Each statement is idempotent for its keys.

-- 2a. Revoke admin from any test profile FIRST (see 1i)
-- UPDATE profiles SET is_admin = false WHERE email = '<DISPOSABLE_ADMIN_EMAIL>';

-- 2b. Test wash tokens + transactions
-- DELETE FROM wash_tokens WHERE redeemed_by_partner_id IN ('WS-2026-0001','WS-2026-0002','<E2E_PARTNER_ID>');
-- DELETE FROM wash_transactions WHERE partner_id IN ('WS-2026-0001','WS-2026-0002','<E2E_PARTNER_ID>');

-- 2c. Test settlements + ledger entries
-- DELETE FROM ledger_entries WHERE partner_id IN ('WS-2026-0001','WS-2026-0002','<E2E_PARTNER_ID>');
-- DELETE FROM settlements   WHERE partner_id IN ('WS-2026-0001','WS-2026-0002','<E2E_PARTNER_ID>');

-- 2d. Test payments + subscriptions (explicit; profiles cascade covers the rest)
-- DELETE FROM payments WHERE owner_id IN (SELECT id FROM profiles WHERE email = 'udehemmanuel.c+e2eoct6@gmail.com');
-- DELETE FROM subscriptions WHERE owner_id IN (SELECT id FROM profiles WHERE email = 'udehemmanuel.c+e2eoct6@gmail.com');

-- 2e. Test reviews, tickets, location requests, promo codes
--     (promo_redemptions cascade from promo_codes automatically)
-- DELETE FROM reviews WHERE body ILIKE '%test%' OR (rating = 5 AND body = 'Excellent wash');
-- DELETE FROM tickets WHERE subject ILIKE '%test%' OR subject ILIKE '%e2e%';
-- DELETE FROM location_requests WHERE email ILIKE '%test%' OR email ILIKE '%e2e%';
-- DELETE FROM promo_codes WHERE code ILIKE '%TEST%' OR code ILIKE '%E2E%';

-- 2f. Test partner applications (keyed by `ref`, not application_id)
-- DELETE FROM partner_applications WHERE ref = 'WS-2026-7426';
-- DELETE FROM partner_applications WHERE car_wash_name ILIKE '%test%' OR car_wash_name ILIKE '%olamilli%' OR car_wash_name ILIKE '%e2e%' OR car_wash_name ILIKE '%zzz%';

-- 2g. Test partners (keyed by `id`, TEXT). DECISION: delete WS-2026-0001?
--     delete WS-2026-0002? — confirm with Mm; deleting cascades to reviews,
--     tickets.partner_id (set null), wash child rows.
-- DELETE FROM partners WHERE id IN ('WS-2026-0001', 'WS-2026-0002', '<E2E_PARTNER_ID>');

-- 2h. Test subscriber profiles (cascades: vehicles, subscriptions, referrals,
--     phone_verifications, notifications, promo_redemptions, wash_tokens —
--     but 2d ran first explicitly for audit clarity)
-- DELETE FROM profiles WHERE email = 'udehemmanuel.c+e2eoct6@gmail.com';
-- DELETE FROM profiles WHERE email ILIKE '%test%' OR email ILIKE '%e2e%'
--    OR email ILIKE '%olamilli%' OR email ILIKE '%tempmail%';

-- 2i. Draft application photo folders (3 folders found in the 2026-10-05 audit)
--     — delete from the Supabase Storage dashboard, not SQL.

-- ==================== PART 3: AUTH USERS (dashboard only) ===================
-- Dashboard → Authentication → Users → delete each test user.
-- Deleting the auth user cascades to its profiles row automatically
-- (profiles.id REFERENCES auth.users(id) ON DELETE CASCADE).
-- Do NOT delete: Mm's Gmail user, support@washsmart.ng user.
