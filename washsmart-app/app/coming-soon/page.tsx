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
      <div className="flex w-full max-w-md flex-col items-center text-center">
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
        <p className="mt-4 text-base leading-relaxed text-[#4b5751]">
          We&apos;re opening WashSMART&apos;s network of approved car-wash
          partners across Lagos — and early subscribers get an{" "}
          <strong className="text-[#101613]">early-bird offer</strong> at
          launch.
        </p>

        <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
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

        <div className="mt-8 w-full rounded-3xl border border-[#e4ede7] bg-white p-6 text-left shadow-[0_8px_30px_rgba(32,169,87,0.08)] sm:p-8">
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

        <div className="mt-8 w-full rounded-3xl bg-[#101613] p-6 text-left text-white">
          <p className="text-sm font-bold">Own a car wash?</p>
          <p className="mt-1 text-sm leading-relaxed text-white/70">
            Partner applications open at launch. Join the waitlist above and
            we&apos;ll invite you to apply first.
          </p>
        </div>
      </div>

      <footer className="mt-12 text-center text-xs text-[#8a948e]">
        © 2026 WashSMART · support@washsmart.ng
      </footer>
    </main>
  );
}
