-- migration_024: field-agent program Phase 1 — agent referral code on applications.
-- Applicants enter the code of the WashSMART field agent who referred them
-- (optional). Admins track agent-sourced applications from this column;
-- payouts stay manual (bank transfer) in Phase 1.
alter table partner_applications
  add column if not exists agent_code text;

comment on column partner_applications.agent_code is
  'Field-agent referral code entered by the applicant (optional, Phase 1 manual tracking).';
