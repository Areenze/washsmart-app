# WashSMART — Pre-Launch Checklist

Last updated: 2026-10-04. Checked items are done and verified live.

## Mm's inputs (blocking)
- [ ] `washsmart.ng` DNS configured
  - [ ] Add domain to Vercel project `washsmart`, confirm production serves it
  - [ ] Resend: add + verify domain, sender `noreply@washsmart.ng`
  - [ ] Add `https://washsmart.ng/*` to the Google Maps key's HTTP-referrer restriction
- [ ] Google Maps API key created (Maps JavaScript API enabled, referrer-restricted)
  - [ ] Added to Vercel as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, redeployed
  - [ ] Live partner map wired up (pending key)

## Payments & email (after DNS)
- [ ] **Swap Paystack test keys → live keys** in Vercel env (`PAYSTACK_SECRET_KEY`, public key)
- [ ] One live-mode test purchase (small amount, real card, then refund/void)
- [ ] Resend API key in Vercel env; wire `notify()` email dispatch behind notifications

## Security & hygiene
- [x] Security review: self-mint RLS holes closed, admin-escalation trigger added (migration_018)
- [x] Vercel Deployment Protection: Standard Protection ON (previews need login; production stays public)
- [x] Legacy `*_backup_20261002` tables dropped (2026-10-04, Mm approved)
- [x] Anonymous photo uploads restricted to images under `applications/<draft-*>` (migration_020)
- [ ] Sweep for stray test data (test reviews, tickets, promo codes — all test codes are Off)

## Business readiness
- [ ] Partner payout per wash negotiated (brief: target ₦1,500, ceiling ₦2,000)
- [ ] Decide WS-SET-000001 (approved, ₦2,250 payable — test settlement): mark paid or void before launch
- [ ] Real partner onboarding (applications → inspections → approvals)
- [ ] Mm to confirm mobile tab-highlight scroll behavior on his own phone

## Launch day
- [ ] Production smoke test: signup → onboarding → purchase → QR redeem → review
- [ ] Confirm notification bell + support ticket flow
- [ ] Announce
