# WashSMART — Pre-Launch Checklist

Last updated: 2026-10-08. Checked items are done and verified live.

## 1. Finish testing + clean the database
- [ ] Finish E2E testing (in progress — new test rows landed 2026-10-06)
- [ ] Refresh + execute the test-data sweep (Oct-05 list is stale after the Oct-06 E2E)
  - Revoke `is_admin` on `higaxe5638@flakeian.com`, then delete all 17 test accounts
  - Delete test subscriptions/payments (keep Mm's), both test partners + applications, test review, E2E ticket, E2E promo codes, location request, draft photo folders
  - Keep: Mm's Gmail (admin), support@washsmart.ng (admin), Mm's Standard test subscription
- [ ] Decide WS-SET-000001 (approved test settlement, ₦2,250 payable): void or delete in the sweep

## 2. Money: Paystack live
- [ ] Paystack dashboard: activate the business FIRST (Settings → Your Business; legal entity YUEC AVIVAR GROUP LTD) — live keys only work after activation
- [ ] Vercel → washsmart → Production env: `PAYSTACK_SECRET_KEY` (`sk_test_` → `sk_live_`) + `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` (`pk_test_` → `pk_live_`); redeploy. Keep test keys in Preview env. (No code change needed — verified.)
- [ ] One real-card purchase (Basic ₦8,000, cheapest), confirm 4 washes mint; refund via Paystack dashboard if desired

## 3. People: partners + field agent
- [ ] Settle Tunde's (AGT-001) bounty terms — dashboard currently promises ₦10,000 / 20 verified washes / 60 days as the deal; Mm never approved these. Lock in, change the figures, or mark "proposed"
- [ ] Negotiate real partner payouts (brief: target ₦1,500/wash, ceiling ₦2,000)
- [ ] Onboard real partners: applications → inspections → approvals
- [ ] Lawyer reviews the field-agent agreement draft (`docs/field-agent-agreement.md`) before any real partner is approved under an agent code

## 4. Comms: email + SMS
- [ ] Vercel Production env: add `RESEND_API_KEY` (Resend dashboard) + redeploy — welcome emails stay silent until this exists; in-app notifications already work
- [ ] Termii: register `WashSMART` sender ID in the Termii dashboard + fund the wallet
- [ ] Live SMS test: https://washsmart.ng/app/verify-phone on a real phone; confirm code arrives and verifies
- [ ] Confirm support@washsmart.ng receives mail (send a test from Gmail) + set its WashSMART password via /app/forgot-password

## 5. Legal + remaining decisions
- [ ] Lawyer reviews /privacy + /terms (both marked pre-launch drafts); hand them `docs/data-protection.md`. NDPC: below the 200-subjects threshold → registration NOT required at launch; re-assess near 200 subscribers (then OHL, ₦10,000/yr)
- [ ] Plan counts: live build is 4/6/8 washes — confirm against the 2/4/8 in the continuity brief
- [ ] `/find-a-wash`: flip to the light theme or keep dark?
- [ ] Push the unpushed SEO files: `app/robots.ts`, `app/sitemap.ts`, Organization JSON-LD (all prepared, type-checked, not yet deployed)

## 6. Launch day
- [ ] Production smoke test: signup → onboarding → purchase → QR redeem → review
- [ ] Real-camera QR decode test on iPhone/Safari
- [ ] Confirm notification bell + support ticket flow
- [ ] Announce

## Non-blocking / post-launch
- [ ] washsmart.com.ng DNS: WhoGoHost support ticket (zone stuck "already taken"); Vercel side already 308s to washsmart.ng
- [ ] Paystack webhook endpoint (HMAC) — closes the tab-closed-after-payment edge case; half-day build, post-launch
- [ ] Consider Supabase Pro before scale
- [ ] Native Capacitor wrappers after traction (PWA-first for now)

## Done (verified live)
- [x] washsmart.ng live with HTTPS (WhoGoHost DNS: A @ → 216.198.79.1, CNAME www → Vercel)
- [x] Resend domain verified; Supabase Auth SMTP via smtp.resend.com:465, sender noreply@washsmart.ng
- [x] Paystack test-mode E2E passed (purchase → verify → mint → QR redeem → double-redeem rejected)
- [x] Partner map: keyed CARTO tiles (dark) + light tiles for subscribers; Google Maps cancelled, no key needed
- [x] Subscriber light theme (/app/*) + homepage light; partner/admin stay dark; WashSMART W-mark favicon/PWA icons
- [x] Automated welcome messages: subscriber (in-app + email), partner (email on approval), agent (email)
- [x] Field-agent Phase 1+2: agent code on applications, /agent login, first agent Tunde Bakare (AGT-001) onboarded
- [x] Termii OTP: TERMII_API_KEY in Vercel (Production + Preview); /app/verify-phone live (skippable, never traps nav)
- [x] Security: self-mint RLS holes closed, prevent_admin_escalation trigger (migration_018)
- [x] Vercel Deployment Protection: Standard ON (previews need login; production public)
- [x] Legacy `*_backup_20261002` tables dropped (Mm approved 2026-10-04)
