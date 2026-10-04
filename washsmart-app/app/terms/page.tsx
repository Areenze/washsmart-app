/* /terms — WashSMART terms of service (pre-launch). */

import Link from "next/link";

const SECTIONS: [string, string][] = [
  [
    "The service",
    "WashSMART is a subscription-based car-care network. Subscribers buy wash credits that can be redeemed for washes at independently operated, WashSMART-approved partner car-wash centers in Lagos, Nigeria.",
  ],
  [
    "Subscriptions & wash credits",
    "Each subscription plan grants a fixed number of wash credits. One credit pays for one standard wash at any approved partner. Credits are valid for 30 days from the date of purchase. Unused credits expire at the end of the 30-day period and do not roll over. Buying a new plan while one is active adds the new washes to your active pack; the added washes share the existing pack's expiry date.",
  ],
  [
    "Redemption",
    "To redeem a wash, present your WashSMART QR code at an approved partner. The partner scans the code to verify your subscription and deduct one credit. WashSMART records every redemption. Partners cannot create washes or payouts without a verified redemption.",
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

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0a0f0c] text-[#e9f2ec]">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <Link href="/" className="text-sm font-semibold text-[#48d87c]">
          ← Back to home
        </Link>
        <h1 className="mt-6 text-4xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: October 2026 · Pre-launch version
        </p>
        <div className="mt-8 space-y-8">
          {SECTIONS.map(([title, body]) => (
            <section key={title}>
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="mt-2 leading-relaxed text-gray-400">{body}</p>
            </section>
          ))}
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
