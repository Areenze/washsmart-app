-- ============================================================
-- migration_029.sql — plan pricing: flat ₦2,500 per wash
-- Run in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- ============================================================
-- Mm's pricing decision, 2026-10-29: subscribers pay a flat ₦2,500/wash.
-- Wash counts stay 4/6/8, so plan prices become:
--   Basic    ₦10,000 (4 washes)
--   Standard ₦15,000 (6 washes)
--   Premium  ₦20,000 (8 washes)
-- Existing subscriptions keep the price/washes baked in at purchase time;
-- only new purchases use these values (same rule as migration_008).

update plans set amount = 10000, washes = 4 where id = 'basic';
update plans set amount = 15000, washes = 6 where id = 'standard';
update plans set amount = 20000, washes = 8 where id = 'premium';
