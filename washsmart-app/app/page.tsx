"use client";

/* WashSMART landing — consumer car-care brand, not a SaaS dashboard.
 * Hero: Subscribe. Get credits. Get washed.
 * [I'm a Car Owner] → /app/signup · Partner CTA → /join
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand, IconChip, Logo, Reveal } from "@/components/ui";
import { getPlans } from "@/lib/db/store";
import type { Plan } from "@/lib/db/types";

const SLIDES = ["/images/hero-1.jpg", "/images/hero-2.jpg", "/images/hero-3.jpg"];
const SLIDE_MS = 5000;

const STEPS: [string, string, string][] = [
  ["01", "Subscribe", "Choose the plan that fits how often you wash."],
  ["02", "Get credits", "Your subscription loads wash credits to your account."],
  ["03", "Find a partner", "Pick any approved WashSMART wash center near you."],
  ["04", "Redeem", "Show your QR code — the partner scans it to verify."],
  ["05", "Get washed", "One credit is deducted and your wash is recorded."],
];

const FAQS: [string, string][] = [
  [
    "How does WashSMART work?",
    "Subscribe to a plan and you get a set number of wash credits. When you visit any approved partner, open your dashboard to show your wash QR — the partner scans it and one wash is deducted from your balance. That's it.",
  ],
  [
    "What are wash credits?",
    "Wash credits are the digital units included with your subscription. One credit pays for one wash at any approved WashSMART partner — no cash changes hands at the wash center.",
  ],
  [
    "How long are my washes valid?",
    "Every wash credit is valid for 30 days from the date of purchase. Use them within 30 days — unused credits expire and don't roll over to the next month.",
  ],
  [
    "What happens if I buy a new plan before my current one expires?",
    "Your new washes are added to your active pack and share its existing expiry date. You don't lose any time, and the 30-day clock doesn't restart.",
  ],
  [
    "How do I get my wash QR?",
    "Open your WashSMART dashboard and show your wash QR at any approved partner — they scan it to verify and deduct one wash from your balance. The code refreshes automatically.",
  ],
  [
    "What if my QR code won't scan?",
    "First check your internet connection and refresh — the code renews automatically. If it still won't scan, the partner can key the code in manually, or reach out to us below and we'll sort it out.",
  ],
  [
    "How do referrals work?",
    "Share your referral link from your dashboard or profile. When a friend signs up with your link and buys their first plan, you get 1 free wash credit, valid for 30 days.",
  ],
  [
    "Which car washes accept WashSMART?",
    "A growing network of approved partner car washes across Lagos. Open the Partners tab in the app to find one near you.",
  ],
  [
    "Can I change or cancel my plan?",
    "You can switch plans anytime from the Subscription tab in the app. To cancel, email support@washsmart.ng — any remaining washes stay valid until their expiry date.",
  ],
  [
    "How do I become a partner?",
    "Own a car wash? Apply through our partner registration — we'd love to have you in the network.",
  ],
];

function FaqItem({
  q,
  a,
  open,
  onToggle,
}: {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#111a14]">
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="font-semibold">{q}</span>
        <svg
          aria-hidden
          className={`h-5 w-5 shrink-0 text-[#48d87c] transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-6 text-sm leading-relaxed text-gray-400">{a}</p>
        </div>
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="group relative text-[#48d87c] transition-colors hover:text-white"
    >
      {children}
      <span
        aria-hidden
        className="absolute -bottom-1.5 left-0 h-[3px] w-full origin-left scale-x-0 rounded-full bg-[#20a957] transition-transform duration-300 group-hover:scale-x-100"
      />
    </Link>
  );
}

const MOBILE_LINKS = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#plans", label: "Plans" },
  { href: "#support", label: "FAQ" },
  { href: "/app/signup", label: "Subscribe" },
  { href: "/app/login", label: "Log in" },
  { href: "/partner", label: "Partner login" },
];

export default function EntryPage() {
  const [slide, setSlide] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [washQuery, setWashQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const router = useRouter();

  const findWash = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/find-a-wash${washQuery.trim() ? `?q=${encodeURIComponent(washQuery.trim())}` : ""}`);
  };

  useEffect(() => {
    const t = setInterval(
      () => setSlide((s) => (s + 1) % SLIDES.length),
      SLIDE_MS
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    getPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);

  return (
    <main className="subscriber-light min-h-screen bg-[#0a0f0c] text-[#e9f2ec]">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#111a14]/90 backdrop-blur-md px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo />
            <Brand />
          </div>
          <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
            <NavLink href="#how-it-works">How It Works</NavLink>
            <NavLink href="#plans">Plans</NavLink>
            <NavLink href="#support">FAQ</NavLink>
            <NavLink href="/app/login">Log in</NavLink>
            <Link
              href="/app/signup"
              className="rounded-full bg-[#20a957] px-5 py-2.5 font-bold text-white transition-all duration-200 hover:bg-[#1a8a47]"
            >
              Subscribe
            </Link>
          </nav>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="rounded-lg p-2 text-[#e9f2ec] hover:bg-white/5 md:hidden"
          >
            {menuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="17" x2="20" y2="17" />
              </svg>
            )}
          </button>
        </div>
        {menuOpen && (
          <nav className="mt-3 flex flex-col gap-1 border-t border-white/5 pt-3 text-sm font-semibold md:hidden">
            {MOBILE_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-2.5 text-[#e9f2ec] hover:bg-white/5"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Hero — sliding, fading image carousel. Keeps its dark photographic
          treatment in the light theme (like Bolt's own dark hero). */}
      <section className="hero-dark relative overflow-hidden bg-[#062b1e]">
        <div className="relative h-[600px] md:h-[640px]">
          {SLIDES.map((src, i) => (
            <div
              key={src}
              aria-hidden={i !== slide}
              className={`absolute inset-0 transition-all duration-[1500ms] ease-in-out ${
                i === slide
                  ? "translate-x-0 scale-100 opacity-100"
                  : "translate-x-10 scale-105 opacity-0"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-[#062b1e]/90 via-[#062b1e]/60 to-[#062b1e]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#062b1e]/70 via-transparent to-transparent" />

          <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-5">
            <p className="mb-3 text-xs font-bold tracking-[0.2em] text-[#65e28e] md:text-sm">
              LAUNCHING SOON ACROSS LAGOS
            </p>
            <h1 className="max-w-2xl text-4xl font-bold leading-tight text-white md:text-6xl">
              Subscribe. Get credits.{" "}
              <span className="text-gradient-brand">Get washed.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/85">
              One subscription. Multiple washes.
            </p>
            <p className="mt-2 max-w-xl text-white/75">
              WashSMART gives you wash credits you can redeem at approved
              car-wash centers across Lagos. No cash at the wash center — just
              verify, redeem and wash.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#plans"
                className="inline-block rounded-full bg-[#20a957] px-8 py-4 text-lg font-semibold tracking-wide text-white shadow-lg shadow-[#20a957]/25 transition-all duration-200 hover:bg-[#1a8a47] hover:shadow-xl hover:shadow-[#20a957]/30 active:scale-[0.98]"
              >
                View Plans
              </Link>
              <Link
                href="/app/signup"
                className="inline-block rounded-full border-2 border-white/30 px-8 py-4 text-lg font-semibold tracking-wide text-white transition-all duration-200 hover:border-white/60 hover:bg-white/5 active:scale-[0.98]"
              >
                🚗 I&rsquo;m a Car Owner &rarr;
              </Link>
            </div>

            {/* Location search pill → partner finder */}
            <form onSubmit={findWash} className="mt-6 max-w-xl">
              <div className="flex flex-col gap-2 rounded-3xl bg-white p-2 shadow-xl sm:flex-row sm:items-center sm:rounded-full sm:pl-5">
                <div className="flex flex-1 items-center gap-2 px-3 sm:px-0">
                  <span aria-hidden className="text-lg">📍</span>
                  <input
                    value={washQuery}
                    onChange={(e) => setWashQuery(e.target.value)}
                    placeholder="Search by area or partner name…"
                    aria-label="Search partners by area or name"
                    className="w-full bg-transparent py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-full bg-[#20a957] px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-[#1a8a47] active:scale-[0.98]"
                >
                  Find a wash
                </button>
              </div>
            </form>
            <div className="mt-8 flex gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  aria-label={`Show slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === slide
                      ? "w-8 bg-[#48d87c]"
                      : "w-2 bg-[#111a14]/40 hover:bg-[#111a14]/70"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The problem */}
      <section className="mx-auto max-w-4xl px-5 py-16 md:py-24 text-center">
        <Reveal>
          <p className="text-xs font-bold tracking-[0.2em] text-[#65e28e]">
            WHY WASHSMART EXISTS
          </p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            Car care shouldn&rsquo;t be complicated.
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mx-auto mt-6 max-w-2xl text-gray-400">
            Today, getting your car washed means finding a reliable wash center,
            paying every single time, dealing with inconsistent service — and
            repeating the whole process every week.
          </p>
          <p className="mt-6 text-xl font-bold text-white">
            WashSMART changes that.{" "}
            <span className="text-[#48d87c]">
              One subscription. Wash credits. Any approved partner.
            </span>
          </p>
        </Reveal>
      </section>

      {/* Is WashSMART for me? */}
      <section className="border-t border-white/5 bg-[#0d130f]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:py-20">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-[0.2em] text-[#65e28e]">
              IS WASHSMART FOR ME?
            </p>
            <h2 className="mt-3 text-center text-3xl font-bold md:text-4xl">
              Built for drivers who wash regularly.
            </h2>
          </Reveal>
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["🚗", "Daily commuters"],
              ["🚕", "Ride-hailing drivers"],
              ["👨‍👩‍👧", "Families, multiple cars"],
              ["🏢", "Businesses & fleets"],
              ["🚘", "Car enthusiasts"],
              ["🧽", "Weekly wash regulars"],
            ].map(([icon, label], i) => (
              <Reveal key={label} delay={i * 75}>
                <div className="flex items-center gap-3 rounded-2xl bg-[#111a14] px-5 py-4">
                  <span className="text-2xl">{icon}</span>
                  <span className="text-sm font-semibold">{label}</span>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={150}>
            <p className="mx-auto mt-8 max-w-2xl text-center text-gray-400">
              If you already pay for car washes regularly, a subscription makes
              your routine simpler — and one subscription covers every car you
              register.
            </p>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 border-t border-white/5 bg-[#0d130f]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:py-24">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-[0.2em] text-[#65e28e]">
              HOW IT WORKS
            </p>
            <h2 className="mt-3 text-center text-3xl font-bold md:text-4xl">
              Five steps. Zero wahala.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map(([n, title, body], i) => (
              <Reveal key={n} delay={i * 100}>
                <div className="h-full rounded-3xl border border-white/5 bg-[#111a14] p-6">
                  <p className="text-3xl font-bold text-[#20a957]/40">{n}</p>
                  <p className="mt-3 font-bold">{title}</p>
                  <p className="mt-1 text-sm text-gray-400">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <div className="mt-10 rounded-3xl border border-[#20a957]/25 bg-[#0e2a1c] p-8">
              <p className="text-center text-xs font-bold tracking-[0.2em] text-[#65e28e]">
                AT THE CAR WASH
              </p>
              <p className="mt-2 text-center text-xl font-bold">
                Arrive. Verify. Wash.
              </p>
              <div className="mx-auto mt-6 flex max-w-3xl flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
                {[
                  "Drive to any approved partner",
                  "Show your QR code",
                  "Partner verifies your credits",
                  "One credit deducted — get washed",
                ].map((s, i, arr) => (
                  <div key={s} className="flex flex-1 items-center gap-3">
                    <div className="min-w-0 flex-1 rounded-2xl bg-[#111a14] px-4 py-3 text-center text-sm font-semibold">
                      {s}
                    </div>
                    {i < arr.length - 1 && (
                      <span aria-hidden className="hidden shrink-0 text-[#48d87c] sm:block">
                        →
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-sm text-gray-400">
                Drive away — the wash appears in your WashSMART history.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Credits explainer */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-bold tracking-[0.2em] text-[#65e28e]">
              WASH CREDITS
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Your subscription becomes wash credits.
            </h2>
            <p className="mt-4 text-gray-400">
              Every plan comes with wash credits you redeem at participating
              WashSMART partner locations. One credit, one wash — tracked
              digitally from your account.
            </p>
            <p className="mt-4 font-bold text-white">
              No cash exchange at the wash center. Just verify, redeem and wash.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <div className="rounded-3xl border border-white/5 bg-[#111a14] p-8">
              {[
                ["💳", "Subscribe", "₦12,000 / 30 days"],
                ["🎟️", "Get credits", "6 wash credits"],
                ["📱", "Show QR", "Partner scans to verify"],
                ["🚗", "Get washed", "1 credit deducted"],
              ].map(([icon, title, body], i, arr) => (
                <div key={title}>
                  <div className="flex items-center gap-4">
                    <div className="flex justify-center">
                      <IconChip icon={icon} tone="green" />
                    </div>
                    <div>
                      <p className="font-bold">{title}</p>
                      <p className="text-sm text-gray-400">{body}</p>
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div aria-hidden className="ml-7 h-6 w-px bg-[#20a957]/40" />
                  )}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Value comparison */}
      <section className="border-t border-white/5 bg-[#0d130f]">
        <div className="mx-auto max-w-4xl px-5 py-16 md:py-24">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-[0.2em] text-[#65e28e]">
              THE WASHSMART DIFFERENCE
            </p>
            <h2 className="mt-3 text-center text-3xl font-bold md:text-4xl">
              Turn random washes into a routine.
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <div className="mt-8 overflow-hidden rounded-3xl border border-white/5">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#111a14] text-gray-400">
                    <th className="px-5 py-4 font-semibold"></th>
                    <th className="px-5 py-4 font-semibold">Pay as you go</th>
                    <th className="bg-[#0e2a1c] px-5 py-4 font-bold text-[#48d87c]">
                      WashSMART
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    ["Wash credits, one subscription", false, true],
                    ["Wash at multiple partner locations", false, true],
                    ["Cashless redemption", false, true],
                    ["Digital wash history", false, true],
                    ["Verified partner standards", false, true],
                  ].map(([label, a, b]) => (
                    <tr key={label as string} className="bg-[#111a14]/50">
                      <td className="px-5 py-3.5 font-semibold">{label}</td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {a ? "✓" : "—"}
                      </td>
                      <td className="bg-[#0e2a1c]/60 px-5 py-3.5 font-bold text-[#48d87c]">
                        {b ? "✓" : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="scroll-mt-24 border-t border-white/5 bg-[#0d130f]">
        <div className="mx-auto max-w-7xl px-5 py-16 md:py-24">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-[0.2em] text-[#65e28e]">
              SUBSCRIPTION PLANS
            </p>
            <h2 className="mt-3 text-center text-3xl font-bold md:text-4xl">
              Choose your plan.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-gray-400">
              Every plan gives you wash credits valid for 30 days, redeemable at
              any approved WashSMART partner — and one subscription covers every
              car you register.
            </p>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-3">
            {(plans ?? []).map((p, i) => (
              <Reveal key={p.id} delay={i * 100}>
                <div
                  className={`relative flex h-full flex-col rounded-3xl border p-8 ${
                    p.popular
                      ? "border-[#20a957] bg-[#0e2a1c] shadow-[0_0_40px_8px_rgb(32_169_87/0.15)]"
                      : "border-white/5 bg-[#111a14]"
                  }`}
                >
                  {p.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#20a957] px-4 py-1 text-xs font-bold text-white">
                      MOST POPULAR
                    </span>
                  )}
                  <p className="text-sm font-bold uppercase tracking-wide text-gray-400">
                    {p.name}
                  </p>
                  <p className="mt-2 text-4xl font-bold">
                    ₦{p.amount.toLocaleString("en-NG")}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">per 30 days</p>
                  <p className="mt-4 text-2xl font-bold text-[#48d87c]">
                    {p.washes} wash{p.washes === 1 ? "" : "es"}
                  </p>
                  <Link
                    href="/app/signup"
                    className={`mt-6 block rounded-full py-3 text-center font-bold text-white transition-all duration-200 active:scale-[0.98] ${
                      p.popular
                        ? "bg-[#20a957] hover:bg-[#1a8a47]"
                        : "bg-white/10 hover:bg-white/15"
                    }`}
                  >
                    Subscribe
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-gray-500">
            Credits valid 30 days from purchase. Unused credits expire — no
            rollover.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-gray-400">
            <span className="font-bold text-white">You&rsquo;re in control.</span>{" "}
            No lock-in — cancel anytime and your remaining credits stay valid
            until they expire. Manage everything from your WashSMART account.
          </p>
        </div>
      </section>

      {/* Referrals */}
      <section className="border-t border-white/5">
        <div className="mx-auto max-w-4xl px-5 py-16 md:py-20 text-center">
          <Reveal>
            <p className="text-xs font-bold tracking-[0.2em] text-[#65e28e]">
              REFER & EARN
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Give a wash. Get a wash.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Share your referral link — when a friend buys their first plan,
              you get <span className="font-bold text-white">1 free wash credit</span>,
              valid for 30 days.
            </p>
            <Link
              href="/app/signup"
              className="mt-6 inline-block rounded-full border-2 border-[#20a957]/50 px-8 py-3.5 font-bold text-[#48d87c] transition-all duration-200 hover:border-[#20a957] hover:bg-[#20a957]/10 active:scale-[0.98]"
            >
              Start Referring &rarr;
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Trust — approved partners */}
      <section className="mx-auto max-w-7xl px-5 py-16 md:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <div className="rounded-3xl border border-[#20a957]/30 bg-[#0e2a1c] p-8 text-center">
              <p className="inline-flex items-center gap-2 rounded-full bg-[#20a957]/15 px-5 py-2.5 font-bold text-[#48d87c]">
                ✓ WASHSMART APPROVED PARTNER
              </p>
              <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-3 text-left">
                {[
                  ["📍", "Location verified"],
                  ["⭐", "Service quality"],
                  ["🏢", "Operating standards"],
                  ["😊", "Customer experience"],
                  ["📱", "Digital verification"],
                  ["📊", "Ongoing monitoring"],
                ].map(([icon, label]) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-2xl bg-[#111a14] px-4 py-3 text-sm font-semibold"
                  >
                    <span>{icon}</span>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <p className="text-xs font-bold tracking-[0.2em] text-[#65e28e]">
              TRUSTED NETWORK
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Your wash. Our network.
            </h2>
            <p className="mt-4 text-gray-400">
              WashSMART partners are independently operated car-wash businesses
              that pass our approval standards — location verified, service
              checked, and every wash digitally verified and tracked.
            </p>
            <p className="mt-4 text-gray-400">
              You&rsquo;re never sent to a random car wash. Every partner in the
              network earned the badge.
            </p>
          </Reveal>
        </div>
      </section>

      {/* For partners */}
      <section className="border-t border-white/5 bg-[#0d130f]">
        <div className="mx-auto max-w-4xl px-5 py-16 md:py-24 text-center">
          <Reveal>
            <p className="text-xs font-bold tracking-[0.2em] text-[#65e28e]">
              FOR CAR-WASH BUSINESSES
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Own a car wash? Join the WashSMART network.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-400">
              WashSMART connects approved car-wash businesses with subscribers,
              handles digital verification, and tracks your earnings — with
              monthly settlements, never per-wash payouts.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-3 text-left sm:grid-cols-3">
              {[
                "Access to subscribers",
                "Digital verification",
                "More wash transactions",
                "Transaction records",
                "Earnings tracking",
                "Settlement management",
              ].map((b) => (
                <div
                  key={b}
                  className="flex items-center gap-2 rounded-2xl bg-[#111a14] px-4 py-3 text-sm font-semibold"
                >
                  <span className="text-[#48d87c]">✓</span>
                  {b}
                </div>
              ))}
            </div>
            <Link
              href="/join"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-block rounded-full bg-[#20a957] px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-[#20a957]/25 transition-all duration-200 hover:bg-[#1a8a47] active:scale-[0.98]"
            >
              Become a Partner &rarr;
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Help & Support — contact strip + FAQ accordion */}
      <section id="support" className="scroll-mt-24 border-t border-white/5">
        <div className="mx-auto max-w-4xl px-5 py-16 md:py-24">
          <Reveal>
            <p className="text-center text-xs font-bold tracking-[0.2em] text-[#65e28e]">
              HELP & SUPPORT
            </p>
            <h2 className="mt-3 text-center text-3xl font-bold md:text-4xl">
              Questions? We&rsquo;ve got answers.
            </h2>
          </Reveal>

          <Reveal delay={100}>
            <div className="mt-8 rounded-3xl border border-[#20a957]/30 bg-[#0e2a1c] p-6 text-center shadow-[0_0_32px_5px_rgb(0_0_0/0.28)]">
              <p className="text-sm text-gray-300">
                Still have questions or need a hand? Email us at{" "}
                <a
                  href="mailto:support@washsmart.ng"
                  className="font-bold text-[#48d87c] underline decoration-[#20a957]/50 underline-offset-4 transition-colors hover:text-white"
                >
                  support@washsmart.ng
                </a>
              </p>
            </div>
          </Reveal>

          <div className="mt-8 space-y-3">
            {FAQS.map(([q, a], i) => (
              <Reveal key={q} delay={i * 75}>
                <FaqItem
                  q={q}
                  a={a}
                  open={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/5 bg-[#062b1e]">
        <div className="mx-auto max-w-4xl px-5 py-16 md:py-24 text-center">
          <Reveal>
            <h2 className="text-3xl font-bold text-white md:text-5xl">
              Your next wash is{" "}
              <span className="text-gradient-brand">already waiting.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/75">
              Subscribe once. Get your wash credits. Redeem them at approved
              WashSMART partner centers.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/app/signup"
                className="inline-block rounded-full bg-[#20a957] px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-[#20a957]/25 transition-all duration-200 hover:bg-[#1a8a47] active:scale-[0.98]"
              >
                Get Started &rarr;
              </Link>
              <Link
                href="/join"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-full border-2 border-white/30 px-8 py-4 text-lg font-semibold text-white transition-all duration-200 hover:border-white/60 hover:bg-white/5 active:scale-[0.98]"
              >
                Become a Partner
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-[#111a14] px-5 py-10">
        <div className="mx-auto grid max-w-7xl gap-8 text-sm md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <Logo />
              <Brand />
            </div>
            <p className="mt-3 text-gray-500">
              One subscription. Multiple washes.
            </p>
          </div>
          <div>
            <p className="font-bold text-gray-300">Customers</p>
            <ul className="mt-3 space-y-2 text-gray-500">
              <li><Link href="#how-it-works" className="hover:text-white">How It Works</Link></li>
              <li><Link href="#plans" className="hover:text-white">Plans</Link></li>
              <li><Link href="/find-a-wash" className="hover:text-white">Find a Wash</Link></li>
              <li><Link href="#support" className="hover:text-white">FAQ</Link></li>
              <li><Link href="/app/login" className="hover:text-white">Log in</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-gray-300">Partners</p>
            <ul className="mt-3 space-y-2">
              <li><Link href="/join" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#48d87c] hover:text-white">Become a Partner ↗</Link></li>
              <li><Link href="/partner" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white">Partner Login ↗</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-gray-300">Company</p>
            <ul className="mt-3 space-y-2 text-gray-500">
              <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
              <li>
                <a href="mailto:support@washsmart.ng" className="hover:text-white">
                  support@washsmart.ng
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-7xl text-xs text-gray-600">
          © 2026 WashSMART · Lagos, Nigeria
        </p>
      </footer>
    </main>
  );
}
