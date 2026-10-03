"use client";

/* WashSMART landing — sliding hero carousel, subscriber-first entry.
 * [I'm a Car Owner] → /app/signup (standalone subscriber sign-up form)
 * Partner CTA lives in the footer → /join
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand, IconChip, Logo, Reveal } from "@/components/ui";

const SLIDES = ["/images/hero-1.jpg", "/images/hero-2.jpg", "/images/hero-3.jpg"];
const SLIDE_MS = 5000;

const FAQS: [string, string][] = [
  [
    "How does WashSMART work?",
    "Subscribe to a plan and you get a set number of wash credits. When you visit any approved partner, open the Scan tab in the app to generate your wash QR — the partner scans it and one wash is deducted from your balance. That's it.",
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
    "Open the WashSMART app and tap Scan (or “Get My Wash QR” on your dashboard), choose the partner you're visiting, and show the QR code to the partner to scan.",
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

export default function EntryPage() {
  const [slide, setSlide] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [washQuery, setWashQuery] = useState("");
  const router = useRouter();

  const findWash = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/app/partners${washQuery.trim() ? `?q=${encodeURIComponent(washQuery.trim())}` : ""}`);
  };

  useEffect(() => {
    const t = setInterval(
      () => setSlide((s) => (s + 1) % SLIDES.length),
      SLIDE_MS
    );
    return () => clearInterval(t);
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0f0c] text-[#e9f2ec]">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#111a14]/90 backdrop-blur-md px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo />
            <Brand />
          </div>
          <nav className="flex gap-6 text-sm font-semibold">
            <NavLink href="#support">Help & Support</NavLink>
            <NavLink href="/app/login">Log in</NavLink>
            <NavLink href="/partner">Partner login</NavLink>
            <Link
              href="/admin"
              className="text-gray-500 transition-colors hover:text-gray-300"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — sliding, fading image carousel */}
      <section className="relative overflow-hidden bg-[#062b1e]">
        <div className="relative h-[560px] md:h-[620px]">
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
              LAGOS&rsquo; FIRST CAR-CARE NETWORK &middot; LAUNCHING SOON
            </p>
            <h1 className="max-w-2xl text-4xl font-bold leading-tight text-white md:text-6xl">
              One subscription.{" "}
              <span className="text-gradient-brand">Multiple washes.</span>
            </h1>
            <p className="mt-5 max-w-xl text-white/80">
              WashSMART connects car owners to a growing network of approved
              car-wash partners across Lagos.
            </p>
            <p className="mt-3 max-w-xl font-bold text-white">
              Subscribe once. Wash at participating WashSMART partner
              locations.
            </p>
            <div className="mt-8">
              <Link
                href="/app/signup"
                className="inline-block rounded-full bg-[#20a957] px-8 py-4 text-lg font-semibold tracking-wide text-white shadow-lg shadow-[#20a957]/25 transition-all duration-200 hover:bg-[#1a8a47] hover:shadow-xl hover:shadow-[#20a957]/30 active:scale-[0.98]"
              >
                🚗 I&rsquo;m a Car Owner &rarr;
              </Link>
            </div>

            {/* EverWash-style location search pill → partner finder */}
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

      <section className="mx-auto max-w-7xl px-5 py-16 md:py-24">
        <div className="grid gap-5 text-center md:grid-cols-3">
          {[
            ["📍", "green", "Growing network", "Approved partners across Lagos"],
            ["✅", "teal", "Simple verification", "One QR scan per wash"],
            ["💳", "amber", "One subscription", "Plans from ₦8,000/30 days"],
          ].map(([icon, tone, title, body], i) => (
            <Reveal key={title} delay={i * 150}>
              <div className="rounded-3xl border border-white/5 bg-[#111a14] p-8 shadow-[0_0_32px_5px_rgb(0_0_0/0.28)] transition-shadow duration-300 hover:shadow-[0_0_40px_8px_rgb(0_0_0/0.35)]">
                <div className="flex justify-center">
                  <IconChip icon={icon} tone={tone as "green" | "teal" | "amber"} />
                </div>
                <p className="mt-4 font-bold">{title}</p>
                <p className="mt-1 text-sm text-gray-400">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Help & Support — contact strip + FAQ accordion */}
      <section id="support" className="scroll-mt-24 border-t border-white/5 bg-[#0d130f]">
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

      <footer className="border-t bg-[#111a14] px-5 py-8 text-center">
        <p className="text-sm font-semibold text-[#e9f2ec]">
          Own a car wash?{" "}
          <Link href="/join" className="text-[#48d87c] underline">
            Earn today — become a partner &rarr;
          </Link>
        </p>
        <p className="mt-3 text-xs text-gray-500">
          WashSMART · Lagos, Nigeria · Demo build — no real payments are
          processed.
        </p>
      </footer>
    </main>
  );
}
