-- ============ migration_034: record partner-terms acceptance on applications ============
-- The /join/apply form states "By submitting you agree to the WashSMART
-- partner terms" (linking to /terms#partner-terms). Stamp that
-- acceptance on the application record itself.
--
-- Two steps on purpose: add the column WITHOUT a default first so
-- applications submitted before this migration keep null (no stamp
-- was recorded for them), then set the default so every NEW insert is
-- stamped automatically at submission time. The client insert in
-- submitApplication names its columns explicitly and does not change,
-- so applications keep working before and after this migration runs.

alter table partner_applications
  add column if not exists terms_accepted_at timestamptz;

alter table partner_applications
  alter column terms_accepted_at set default now();
