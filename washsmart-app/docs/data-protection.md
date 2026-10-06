# WashSMART — Data Protection Notes (DRAFT)

> **Status:** DRAFT, prepared 2026-10-06 for the pre-launch legal review of the
> privacy policy and terms. This is an internal working document, not legal
> advice. Lawful bases below are *proposed* — confirm with the lawyer.

## 1. Classification under the NDPA / GAID

- WashSMART is a **data controller** (it decides why and how subscriber and
  partner personal data is processed).
- The NDPC's registration threshold is **200+ data subjects within any
  six-month window**. At launch WashSMART holds ~2 users, so it is **not** a
  Data Controller of Major Importance and **registration is not required yet**.
- **Trigger:** once the business approaches 200 subscribers (or any 200 data
  subjects in 6 months), register with the NDPC — likely **OHL (Ordinary High
  Level), ₦10,000/yr, annual renewal, no Compliance Audit Return filing**.
  UHL/EHL tiers (₦250k/₦100k + annual CAR filings) only apply at much larger
  scale. Re-assess classification at ~150 subscribers so registration is in
  place before crossing the line.

## 2. Personal data inventory (what we actually hold)

| Data | Whose | Where | Purpose (proposed lawful basis) | Retention |
|---|---|---|---|---|
| Name, email, phone, password (hashed) | Subscriber | `auth.users`, `profiles` | Account + subscription contract (contract) | While account active; delete on verified request |
| Phone verification status + OTP metadata | Subscriber | `phone_verifications` | Fraud prevention / identity (legitimate interest) | Verification events kept; OTP pins expire |
| Lagos area | Subscriber | `profiles.area` | Service matching (contract) | With account |
| Vehicles: make/model, plate, color | Subscriber | `vehicles` | Subscription covers registered cars only (contract) | With account |
| Subscriptions, wash credits, expiry | Subscriber | `subscriptions` | Fulfil the subscription (contract) | With account |
| Wash redemption history (QR token hashes) | Subscriber + Partner | `wash_transactions` | Verify redemptions, prevent double-spend (contract + legitimate interest) | Accounting/fraud — see lawyer on retention period |
| Payments: amount, Paystack reference | Subscriber | `payments` | Payment processing (contract + legal obligation for records) | As legally required |
| Reviews, support tickets, notifications, referrals | Subscriber | `reviews`, `tickets`, `notifications`, `referrals` | Service quality + support (contract / legitimate interest) | With account; anonymise reviews if requested |
| Location requests: email + area | Anyone (public form) | `location_requests` | Plan coverage expansion (consent) | Until used or 12 months |
| Partner: owner name, phone, WhatsApp, email, business name/address/GPS, business photos | Partner / applicant | `partner_applications`, `partners` | Onboarding + verification (contract / pre-contract) | Successful: with partnership; rejected: confirm retention with lawyer |
| Partner bank name + account last-4, settlement rate, payouts | Partner | `partners`, `settlements`, `ledger_entries` | Settlement cycle payouts (contract + legal obligation) | As legally required |
| Anonymous page views + client errors (random session id, **no cookies, no IP stored**) | — | `page_views`, `client_errors` | Service improvement (legitimate interest) | Aggregate; confirm period with lawyer |

**Sensitive data:** none collected beyond the above (no biometrics, health, religion, etc.).

## 3. Processors and sub-processors (who touches the data)

| Processor | Function | Data involved | Base / notes |
|---|---|---|---|
| Supabase | Database + authentication hosting | All application data | **Hosting region unconfirmed — confirm with lawyer** (cross-border transfer position) |
| Paystack | Payment processing | Payment amounts + references; card data handled by Paystack, not stored by us | NG-based |
| Vercel | App hosting | Data in transit / at rest on servers | US/EU infra — cover in cross-border review |
| Resend | Transactional email (noreply@washsmart.ng) | Subscriber email addresses, message content | US-based — cover in cross-border review |
| Termii | SMS OTP (DND channel) | Phone numbers | NG-based |
| Zoho Mail | support@washsmart.ng inbox | Support correspondence | Confirm data residency with lawyer |
| CARTO | Map tiles (partner finder) | Tile requests only — no personal data sent | API key: `NEXT_PUBLIC_CARTO_API_KEY` |

- GAID requires Data Processing Agreements with vendors to state parties,
  purpose, scope, and lawful basis. Check each vendor's standard terms against
  that requirement during the legal review.

## 4. Data-subject rights (operational notes)

- **Access / correction:** profile + vehicle editing already self-serve in-app.
- **Deletion:** account deletion on request via support@washsmart.ng
  (payment/settlement records retained only as legally required — the privacy
  policy states this).
- **Breach notification:** NDPA requires notifying the NDPC **within 72
  hours** of becoming aware of a breach. Define who calls this and the
  notification draft before launch.
- **Material changes:** GAID requires notifying the NDPC **within 60 days**
  of significant changes to processing (new vendor, new purpose, system
  change). Keep a change log once registered.

## 5. Security measures in place (as of 2026-10-06)

- Row-level security on all personal-data tables; self-mint RLS holes closed.
- Admin-escalation trigger blocks privilege escalation (migration_018).
- Admin credit adjustments are audit-logged (`admin_audit_log`) — never
  silent balance changes.
- Server-issued single-use QR tokens (sha256 hashes stored, never raw codes).

## 6. Next steps (mirror of the launch checklist)

1. Lawyer reviews `/privacy` + `/terms` — this document goes with them.
2. Confirm cross-border transfer position (Supabase region, Resend, Vercel).
3. Agree DPO appointment timing (required once registered as a DCPMI).
4. Draft the 72-hour breach-notification procedure + owner.
5. At ~150 subscribers: start NDPC registration (OHL); display certificate on site.
