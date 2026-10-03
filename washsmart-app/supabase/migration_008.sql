-- ============ migration_008: plan wash counts 4/6/8 + profiles.area ============
-- New wash allowances: Basic 4, Standard 6, Premium 8 (amounts unchanged).
-- Existing subscriptions keep the counts baked in at purchase time; only new
-- purchases use these values. Also adds profiles.area for subscriber onboarding
-- (Lagos neighborhood/LGA, collected with vehicle registration).

update plans set washes = 4 where id = 'basic';
update plans set washes = 6 where id = 'standard';
update plans set washes = 8 where id = 'premium';

alter table profiles add column if not exists area text;
