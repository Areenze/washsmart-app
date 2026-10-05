/* /privacy — WashSMART privacy policy (pre-launch). */

import Link from "next/link";

const SECTIONS: [string, string][] = [
  [
    "What we collect",
    "To run your subscription we collect: your name, email address, phone number, password (stored securely, never in plain text), your registered vehicles (make, model, plate number, color), your Lagos area, your wash credits and redemption history, referral activity, and support tickets you file. We also record anonymous usage analytics (pages visited, tied to a random browser session — no cookies, no IP storage) to improve the service.",
  ],
  [
    "How we use it",
    "Your data is used to operate your subscription — issuing wash credits, verifying redemptions at partners, tracking your balance, processing payments, preventing fraud, and supporting you when you contact us. Partners see only what they need to verify a wash (your name and remaining credits at redemption time).",
  ],
  [
    "What we don't do",
    "We do not sell your personal data. We do not share it with advertisers. We do not expose your password, payment details, or full account history to partners.",
  ],
  [
    "Service providers",
    "We use trusted providers to run the service: Supabase (database & authentication hosting), Paystack (payment processing), Vercel (app hosting), and Resend (transactional email). Each processes only the data needed for its function under its own privacy terms.",
  ],
  [
    "Data retention",
    "Your account data is kept while your account is active. Wash transaction records are kept for accounting, settlement, and fraud-prevention purposes. You can request deletion of your account by emailing support@washsmart.ng; records we are legally required to keep (e.g. payment records) are retained as required.",
  ],
  [
    "Security",
    "Access is protected by authenticated sessions, row-level database security, and audit logging of sensitive admin actions. No system is perfectly secure — if you suspect unauthorized access to your account, contact us immediately.",
  ],
  [
    "Changes",
    "We may update this policy as the service evolves. This is a pre-launch version and will be reviewed before public launch.",
  ],
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0a0f0c] text-[#e9f2ec]">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <Link href="/" className="text-sm font-semibold text-[#66dca4]">
          ← Back to home
        </Link>
        <h1 className="mt-6 text-4xl font-bold">Privacy Policy</h1>
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
          Questions about your data? Email{" "}
          <a
            href="mailto:support@washsmart.ng"
            className="font-bold text-[#66dca4]"
          >
            support@washsmart.ng
          </a>
        </p>
      </div>
    </main>
  );
}
