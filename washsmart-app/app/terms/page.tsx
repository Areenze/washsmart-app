/* /terms — WashSMART terms of service (pre-launch). */

import Link from "next/link";

const SECTIONS: [string, string][] = [
  [
    "The service",
    "WashSMART is a subscription-based car-care network. Subscribers buy wash credits that can be redeemed for washes at independently operated, WashSMART-approved partner car-wash centers in Lagos, Nigeria.",
  ],
  [
    "Subscriptions & wash credits",
    "Each subscription plan grants a fixed number of wash credits. One credit pays for one standard wash at any approved partner. Credits are valid for 30 days from the date of purchase. If you buy a new plan before your current credits expire, your unused credits roll over into the renewed pack and a new 30-day period starts on the date of that purchase. Credits that have already expired do not roll over and cannot be recovered.",
  ],
  [
    "Redemption",
    "To redeem a wash, present your WashSMART QR code at an approved partner. The partner scans the code to verify your subscription and deduct one credit. WashSMART records every redemption. Partners cannot create washes or payouts without a verified redemption.",
  ],
  [
    "Eligible washes",
    "One wash credit covers one standard wash (exterior wash plus the partner's standard inclusions). Premium services such as detailing, waxing, or engine cleaning may attract additional charges payable directly to the partner at their displayed prices.",
  ],
  [
    "Credits are personal",
    "Wash credits are tied to your account and the vehicles registered on it. Credits cannot be transferred, resold, or shared with other accounts.",
  ],
  [
    "If a partner can't serve you",
    "If a partner is temporarily unavailable or refuses a valid redemption, do not pay cash — report it through in-app support with the partner name and time. We investigate every report and will restore or replace credits wrongly affected.",
  ],
  [
    "Payments",
    "Payments are processed by our payment provider. Prices are shown in Nigerian Naira (₦) and include any applicable fees shown at checkout. WashSMART may update plan prices; changes apply to new purchases only and never change the washes already on your account.",
  ],
  [
    "Cancellation",
    "You can cancel anytime by emailing support@washsmart.ng. Any remaining wash credits stay valid until their expiry date. Expired credits are not refunded.",
  ],
  [
    "Referrals",
    "If you refer a friend and they buy their first plan, you receive one bonus wash credit valid for 30 days. One bonus per referred friend; abuse of the referral program may lead to account suspension.",
  ],
  [
    "Partner network",
    "Partner car washes are independent businesses. WashSMART approves partners against published standards and tracks every verified wash, but the wash itself is performed by the partner. Report quality issues through in-app support and we will follow up.",
  ],
  [
    "Fair use",
    "Subscriptions cover the vehicles registered on your account. Sharing QR codes, reselling credits, or any attempt to manipulate redemptions may lead to suspension.",
  ],
  [
    "Changes",
    "We may update these terms as the service evolves. Continued use after changes means you accept the updated terms. This is a pre-launch version and will be reviewed before public launch.",
  ],
];

/* Partner terms — the sections a car wash business agrees to by
   submitting an application at /join/apply (the form links here).
   Deliberately no payout figures: the per-wash rate is whatever is
   confirmed in writing at approval. */
const PARTNER_SECTIONS: [string, string][] = [
  [
    "Joining the network",
    "Car wash businesses join WashSMART by application. Submitting an application means you agree to these partner terms. Approval is at WashSMART's discretion and may include an on-site inspection of your premises, washing bays, water and drainage, and waiting area. On approval you receive a Partner ID and a listing in the WashSMART subscriber app.",
  ],
  [
    "An independent business",
    "Partners are independent businesses — not employees, agents, or franchisees of WashSMART or Yuec Avivar Limited. You remain responsible for your staff, your premises, your taxes, and the quality and safety of every wash you perform.",
  ],
  [
    "Verified washes only",
    "You earn only for washes verified through the WashSMART system: the subscriber presents their QR code, you scan it in the Partner app, and the system records the redemption and deducts the credit. Washes arranged outside the system — cash deals with subscribers, manual claims, or scans of copied codes or screenshots — earn nothing.",
  ],
  [
    "Earnings and the settlement cycle",
    "Partners are not paid at the bay and are not paid immediately after each wash. Every verified wash creates an earning in your WashSMART ledger at your agreed per-wash rate, held in pending settlement. WashSMART runs two settlement cycles each month — washes redeemed from the 1st to the 15th are settled around the 20th of that month, and washes redeemed from the 16th to the end of the month are settled around the 5th of the following month. In each cycle, completed washes are verified, duplicate or fraudulent redemptions are removed, refunds and disputes are accounted for, and WashSMART's commission is calculated. You receive a settlement statement, and once the settlement is approved the amount is paid to the bank account you registered with us. WashSMART calculates what you earn, based on your verified washes and this agreement — the payment provider only moves the money.",
  ],
  [
    "Your rate",
    "Your per-wash rate and commission are the ones confirmed in writing when your business is approved, and they are shown on your partner record. WashSMART may review rates with reasonable written notice; a reviewed rate applies only to washes redeemed after the notice takes effect, never backwards.",
  ],
  [
    "No double charging",
    "A standard wash covered by a subscriber's credit has already been paid for through WashSMART — never charge the subscriber again for that wash. Premium extras such as detailing, waxing, or engine cleaning are agreed with the subscriber and paid directly to you at your displayed prices.",
  ],
  [
    "Standards and availability",
    "Keep the standards verified at your inspection, honour valid redemptions during your published opening hours, and keep your listing details — hours, location, and photos — accurate. Repeated subscriber complaints, refusing valid redemptions, or a failed re-inspection may lead to suspension or removal from the network.",
  ],
  [
    "Fraud",
    "Duplicate scans, redeeming codes for your own or staff vehicles, collusion with subscribers, or fabricated washes void the related earnings and may lead to immediate suspension, removal from the network, and recovery of any amounts already paid out for those washes.",
  ],
  [
    "Ending the partnership",
    "Either side may end the partnership with written notice — email is enough. Washes verified before the end date are settled through the normal settlement cycle. No earnings are created after removal.",
  ],
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0a0f0c] text-[#e9f2ec]">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <Link href="/" className="text-sm font-semibold text-[#48d87c]">
          ← Back to home
        </Link>
        <h1 className="mt-6 text-4xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: November 2026 · Pre-launch version
        </p>
        <div className="mt-8 space-y-8">
          {SECTIONS.map(([title, body]) => (
            <section key={title}>
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="mt-2 leading-relaxed text-gray-400">{body}</p>
            </section>
          ))}
        </div>

        <div id="partner-terms" className="mt-14 scroll-mt-8">
          <h2 className="border-t border-white/10 pt-10 text-2xl font-bold">
            Partner terms
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            For car wash businesses that apply to join, or are listed in,
            the WashSMART partner network. By submitting an application you
            agree to these partner terms.
          </p>
          <div className="mt-8 space-y-8">
            {PARTNER_SECTIONS.map(([title, body]) => (
              <section key={title}>
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="mt-2 leading-relaxed text-gray-400">{body}</p>
              </section>
            ))}
          </div>
        </div>
        <p className="mt-10 text-sm text-gray-500">
          Questions? Email{" "}
          <a
            href="mailto:support@washsmart.ng"
            className="font-bold text-[#48d87c]"
          >
            support@washsmart.ng
          </a>
        </p>
      </div>
    </main>
  );
}
