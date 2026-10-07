# WashSMART Field Agent Agreement (DRAFT — for lawyer review)

**Between:** YUEC AVIVAR GROUP LTD ("the Company"), operating the WashSMART subscription network
**And:** ________________________________ ("the Agent"), Agent code: ____________

**Date:** ________________

## 1. Role
The Agent is an independent field recruiter for the WashSMART program. This is not an employment relationship. The Agent's role is to recruit and sign up partner car washes through the Company's application process.

## 2. Definitions
- **Approved partner:** a car wash the Company has reviewed and approved via the admin process.
- **Verified wash:** a wash completed through the Company's QR redemption loop (token issued and redeemed server-side).

## 3. Compensation — partner bounty
[DECIDE] The Company pays the Agent a one-off bounty per Approved Partner once that partner reaches the agreed wash gate:

| Term | Figure on agent dashboard today (NOT yet approved) | Final figure (to decide) |
|---|---|---|
| Bounty per partner | ₦10,000 | ₦____________ |
| Verified washes required | 20 | ____________ |
| Window from partner approval | 60 days | ____________ days |

Note: the dashboard at washsmart.ng/agent currently displays the left-hand column as the deal. Replace with the final figures once decided, and update the constants in `lib/db/agents.ts` so the dashboard matches this agreement exactly.

## 4. Compensation — payout schedule
[DECIDE] Payout interval and method. Industry practice is to put the formula and pay intervals in the signed agreement (Reporum 2026 launch guide; Dock 365 sales-agency guidance):

- Bounties are paid: [e.g. monthly / with the partner settlement cycle / on request above a threshold] ____________
- Payment method: [e.g. bank transfer] ____________
- No payout is owed for washes that are later voided as fraudulent or duplicated.

## 5. Bonus tiers and multipliers (optional)
[DECIDE] Thresholds for base, bonus, and multiplier levels — e.g. extra multiplier for agents whose partners pass a monthly total:

- Tier 1: ____________
- Tier 2: ____________

Leave blank if the program starts with the flat bounty only.

## 6. Term
This agreement covers recruitment from the date above until terminated by either party with [DECIDE: e.g. 30 days] notice. Bounties already earned under a hit wash gate remain payable.

## 7. One point of truth
The figures in this signed agreement govern. The agent dashboard is a display; if it ever disagrees with this agreement, this agreement wins.

---

**For the Company:** ______________________  **For the Agent:** ______________________

*Draft prepared for legal review alongside the data-protection draft. Do not present to an agent until signed off.*
