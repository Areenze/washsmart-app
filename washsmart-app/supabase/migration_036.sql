-- ============ migration_036: revoke ALL overloads of the legacy mint RPCs ============
-- migration_035 revoked topup_subscription(text, text, text) — the
-- migration_031 signature — and the post-run probes confirmed it
-- (42501). But a call with ONLY p_plan_id still executed: migration_005
-- originally created topup_subscription(text), and CREATE OR REPLACE
-- with a different argument list (migration_011's 3-arg version)
-- created a second OVERLOAD instead of replacing it. The 1-arg
-- overload kept its default PUBLIC execute grant for two months —
-- the demo-mint path (createSubscription, p_plan_id only) has been
-- silently running the migration_005 function all along, while the
-- Paystack verify route (3 args) ran 011/031.
-- This enumerates every overload of the three legacy mint functions
-- in pg_proc and revokes them all, whatever signatures exist.
-- (apply_promo_bonus and record_promo_redemption are already 42501;
-- they are included so the guarantee is total.)

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'topup_subscription',
         'apply_promo_bonus',
         'record_promo_redemption'
       )
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated',
      r.sig::text
    );
  end loop;
end $$;
