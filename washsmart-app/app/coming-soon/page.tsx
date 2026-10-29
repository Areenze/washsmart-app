"use client";

/* Public pre-launch landing page shown on washsmart.ng while the app is
 * in testing. Collects waitlist signups (name, email, area, car ownership)
 * into public.waitlist_signups; signups land in the admin Requests inbox. */

import { useEffect, useState } from "react";
import { Logo } from "@/components/ui";
import { submitWaitlistSignup, waitlistWhatsappShareUrl } from "@/lib/db/store";

const LAGOS_AREAS = [
  "Lekki Phase 1",
  "Lekki (other)",
  "Ajah",
  "Victoria Island",
  "Ikoyi",
  "Ikeja",
  "Yaba",
  "Surulere",
  "Gbagada",
  "Maryland",
  "Ogudu",
  "Magodo",
  "Ojodu Berger",
  "Agege",
  "Iyana Ipaja",
  "Festac",
  "Apapa",
  "Ikorodu",
  "Epe",
  "Badagry",
  "Other",
];

const PERKS = [
  { icon: "🎟️", text: "One subscription, multiple washes" },
  { icon: "📍", text: "Approved partners near you" },
  { icon: "📱", text: "Scan-and-go with a QR code" },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Choose a plan",
    text: "Subscribe once and pay upfront — no paying cash at the car wash every single time.",
  },
  {
    step: "2",
    title: "Get wash credits",
    text: "Your plan gives you wash credits, valid for 30 days, for the car(s) you register on your account.",
  },
  {
    step: "3",
    title: "Find a partner near you",
    text: "Pick any approved WashSMART partner close to home, work, or wherever you are in Lagos.",
  },
  {
    step: "4",
    title: "Arrive. Verify. Wash.",
    text: "Show your Wash QR, the partner verifies it, one credit is deducted — and you drive off clean.",
  },
];

const PLANS = [
  { name: "Basic", price: "₦8,000", washes: "4 washes", note: "For keeping one car clean" },
  { name: "Standard", price: "₦12,000", washes: "6 washes", note: "Our most popular plan", featured: true },
  { name: "Premium", price: "₦18,000", washes: "8 washes", note: "For frequent drivers & families" },
];

const WHY = [
  {
    icon: "📍",
    title: "Not tied to one car wash",
    text: "Your subscription works across the whole network, not just one location. If you move, travel across town, or your usual spot is busy, use another approved partner.",
  },
  {
    icon: "✅",
    title: "Approved, professional partners",
    text: "Every centre in the network is a real, approved WashSMART partner — checked to WashSMART standards so you know what you're getting before you arrive.",
  },
  {
    icon: "📱",
    title: "Simple verification, no cash",
    text: "No paper vouchers, no haggling, no cash at the gate. Your Wash QR verifies your wash in seconds.",
  },
  {
    icon: "🚗",
    title: "One pool for your cars",
    text: "Register your car(s) once. Every wash comes from the same subscription pool, whichever registered car you bring.",
  },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ComingSoonPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("");
  const [ownsCar, setOwnsCar] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [duplicate, setDuplicate] = useState(false);

  useEffect(() => {
    document.title = "WashSMART — launching soon in Lagos";
  }, []);

  const valid =
    name.trim().length > 0 && EMAIL_RE.test(email.trim()) && area.trim().length > 0;

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const res = await submitWaitlistSignup({
      name,
      email,
      area,
      ownsCar,
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
    } else if (res.duplicate) {
      setDuplicate(true);
      setDone(true);
    } else {
      setError(res.error ?? "Something went wrong. Please try again.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center bg-white px-6 py-14 text-[#101613]">
      <div className="flex w-full max-w-3xl flex-col items-center text-center">
        <Logo size={68} />
        <p className="mt-4 text-lg font-bold tracking-tight">
          Wash<span className="text-[#20a957]">SMART</span>
        </p>

        <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#e7f7ee] px-4 py-1.5 text-xs font-bold text-[#157a3d]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#20a957] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#20a957]" />
          </span>
          LAUNCHING SOON IN LAGOS
        </p>

        <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">
          One subscription.
          <br />
          <span className="text-[#20a957]">Multiple washes.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-[#4b5751]">
          WashSMART is a <strong className="text-[#101613]">car wash subscription network</strong> for
          Lagos. Instead of paying cash at one car wash every time, you subscribe
          once — and use your washes at <strong className="text-[#101613]">any approved WashSMART
          partner near you</strong>, at home, at work, or on the move. We&apos;re opening
          the network across Lagos, and early subscribers get an{" "}
          <strong className="text-[#101613]">early-bird offer</strong> at launch.
        </p>

        <div className="mt-6 flex w-full max-w-md flex-col gap-2 sm:flex-row">
          {PERKS.map((p) => (
            <div
              key={p.text}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#f4f8f5] px-3 py-2.5 text-xs font-semibold text-[#33413a]"
            >
              <span className="text-base">{p.icon}</span>
              {p.text}
            </div>
          ))}
        </div>

        <div className="mt-8 w-full max-w-md rounded-3xl border border-[#e4ede7] bg-white p-6 text-left shadow-[0_8px_30px_rgba(32,169,87,0.08)] sm:p-8">
          {done ? (
            <div className="py-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e7f7ee] text-2xl">
                ✅
              </div>
              <h2 className="mt-4 text-xl font-extrabold">
                {duplicate ? "You're already on the list" : `You're on the list, ${name.trim().split(" ")[0]}!`}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#4b5751]">
                We&apos;ll email <strong>{email.trim()}</strong> the moment we
                launch{area.trim() ? ` in ${area.trim()}` : ""} — with your
                early-bird offer.
              </p>
              <a
                href={waitlistWhatsappShareUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25d366] px-6 py-3.5 text-base font-bold text-white transition-transform active:scale-[0.98]"
              >
                <span className="text-lg">💬</span>
                Tell a friend on WhatsApp
              </a>
              <p className="mt-3 text-xs text-[#8a948e]">
                Every friend you bring gets the early-bird offer too.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-extrabold">Join the waitlist</h2>
              <p className="mt-1 text-sm text-[#4b5751]">
                Be first in when your area goes live.
              </p>
              <form onSubmit={join} className="mt-5 flex flex-col gap-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">
                    Your name
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Adaeze Okafor"
                    autoComplete="name"
                    className="w-full rounded-2xl border border-[#dbe5de] px-4 py-3 text-base outline-none transition-colors placeholder:text-[#a9b5ad] focus:border-[#20a957] focus:ring-2 focus:ring-[#20a957]/20"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">
                    Email address
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-2xl border border-[#dbe5de] px-4 py-3 text-base outline-none transition-colors placeholder:text-[#a9b5ad] focus:border-[#20a957] focus:ring-2 focus:ring-[#20a957]/20"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">
                    Your area in Lagos
                  </span>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Lekki Phase 1"
                    list="lagos-areas"
                    autoComplete="off"
                    className="w-full rounded-2xl border border-[#dbe5de] px-4 py-3 text-base outline-none transition-colors placeholder:text-[#a9b5ad] focus:border-[#20a957] focus:ring-2 focus:ring-[#20a957]/20"
                  />
                  <datalist id="lagos-areas">
                    {LAGOS_AREAS.map((a) => (
                      <option key={a} value={a} />
                    ))}
                  </datalist>
                </label>
                <div>
                  <span className="mb-1.5 block text-sm font-semibold">
                    Do you own a car?
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: true, label: "Yes 🚗" },
                      { value: false, label: "Not yet" },
                    ].map((o) => (
                      <button
                        key={o.label}
                        type="button"
                        onClick={() => setOwnsCar(o.value)}
                        aria-pressed={ownsCar === o.value}
                        className={`rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${
                          ownsCar === o.value
                            ? "border-[#20a957] bg-[#e7f7ee] text-[#157a3d]"
                            : "border-[#dbe5de] text-[#4b5751]"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                {error && (
                  <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={!valid || busy}
                  className="w-full rounded-full bg-[#20a957] px-6 py-3.5 text-base font-bold text-white transition-all enabled:hover:bg-[#1a8c47] enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "Joining…" : "Join the waitlist"}
                </button>
                <p className="text-center text-xs text-[#8a948e]">
                  No spam — one email when we launch.
                </p>
              </form>
            </>
          )}
        </div>

        {/* What WashSMART is */}
        <section className="mt-14 w-full text-left">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            What is the WashSMART network?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-base leading-relaxed text-[#4b5751]">
            WashSMART connects car owners with a growing network of approved
            car wash centres across Lagos — all under one subscription.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-center text-base leading-relaxed text-[#4b5751]">
            The partners are independent car wash businesses in your neighbourhood.
            They keep their own name and business, and join WashSMART as approved
            partners. You don&apos;t buy a wash from just one place — you join a
            network, so your subscription travels with you wherever you are in the city.
          </p>
        </section>

        {/* How it works */}
        <section className="mt-12 w-full text-left">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="rounded-3xl bg-[#f4f8f5] p-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#20a957] text-sm font-extrabold text-white">
                  {s.step}
                </div>
                <p className="mt-3 font-bold">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#4b5751]">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Plans */}
        <section className="mt-12 w-full text-left">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Simple plans, no surprises
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-[#4b5751]">
            Every plan gives you wash credits to use at any approved partner in
            the network. Credits are valid for 30 days from purchase.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl p-5 text-center ${
                  plan.featured
                    ? "border-2 border-[#20a957] bg-[#e7f7ee]"
                    : "border border-[#e4ede7] bg-white"
                }`}
              >
                <p className="text-sm font-bold text-[#157a3d]">{plan.name}</p>
                <p className="mt-2 text-3xl font-extrabold">{plan.price}</p>
                <p className="mt-1 text-sm font-semibold">{plan.washes} <span className="font-normal text-[#4b5751]">/ 30 days</span></p>
                <p className="mt-2 text-xs leading-relaxed text-[#4b5751]">{plan.note}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why WashSMART */}
        <section className="mt-12 w-full text-left">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
            Why car owners join WashSMART
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {WHY.map((w) => (
              <div key={w.title} className="rounded-3xl border border-[#e4ede7] bg-white p-5">
                <p className="text-xl">{w.icon}</p>
                <p className="mt-2 font-bold">{w.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-[#4b5751]">{w.text}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-xl text-center text-sm leading-relaxed text-[#4b5751]">
            We&apos;re opening area by area across Lagos — starting where demand
            is highest. Joining the waitlist above tells us where to bring the
            network first: Lekki, Ajah, Victoria Island, Ikoyi, Ikeja, Yaba,
            Surulere, Gbagada and beyond.
          </p>
        </section>

        <div className="mt-12 w-full rounded-3xl bg-[#101613] p-6 text-left text-white sm:p-8">
          <p className="text-base font-bold">Own a car wash?</p>
          <p className="mt-2 text-sm leading-relaxed text-white/70">
            Join WashSMART as an approved partner — keep your own name and
            business, and get discovered by subscribers looking for a wash near
            them. Partners receive verified wash redemptions from subscribers
            and are paid through WashSMART&apos;s settlement cycle.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Partner applications open at launch. Join the waitlist above and
            we&apos;ll invite you to apply first.
          </p>
        </div>
      </div>

      <footer className="mt-12 text-center text-xs text-[#8a948e]">
        <p className="text-sm font-semibold text-[#4b5751]">
          Powered by <span className="text-[#101613]">Yuec Avivar Limited</span>
        </p>
        <p className="mt-2">© 2026 WashSMART · support@washsmart.ng</p>
      </footer>
    </main>
  );
}
