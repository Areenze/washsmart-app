"use client";

/* /app — subscriber home dashboard. */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PartnerCard from "@/components/partner-card";
import InstallPrompt from "@/components/install-prompt";
import ReferralCard from "@/components/referral-card";
import QRCode from "@/components/qrcode";
import { EmptyState, IconChip, Reveal, SectionTitle } from "@/components/ui";
import {
  TOKEN_TTL_MS,
  clearVerifyPending,
  creditDaysLeft,
  fmtDate,
  getQRToken,
  getVerifyPending,
  getWashSummary,
  getProfile,
  listApprovedPartners,
  listWashHistory,
} from "@/lib/db/store";
import type { WashSummary } from "@/lib/db/store";
import type {
  Partner,
  Profile,
  Subscription,
  WashTransaction,
} from "@/lib/db/types";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function UserHome() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<WashSummary | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [history, setHistory] = useState<WashTransaction[]>([]);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);

  // Dashboard wash QR: partner-specific code minted right here, so the
  // subscriber never needs the separate Scan tab. The last-used partner
  // is remembered between visits.
  const [qrPartnerId, setQrPartnerId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem("washsmart.lastPartner");
    } catch {
      return null;
    }
  });
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrIssuedAt, setQrIssuedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const mintQr = useCallback(async () => {
    const t = await getQRToken();
    setQrToken(t);
    setQrIssuedAt(Date.now());
    setNow(Date.now());
  }, []);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      setProfile(p);
      // A verification link was sent but not yet clicked: remind, don't trap.
      if (p) {
        clearVerifyPending();
      } else {
        setVerifyEmail(getVerifyPending());
      }
      setSummary(await getWashSummary());
      setPartners(await listApprovedPartners());
      setHistory(await listWashHistory());
    })();
  }, []);

  // Drop a remembered partner that is no longer listed.
  useEffect(() => {
    if (qrPartnerId && partners.length > 0 && !partners.some((p) => p.id === qrPartnerId)) {
      setQrPartnerId(null);
      try {
        window.localStorage.removeItem("washsmart.lastPartner");
      } catch {
        /* ignore */
      }
    }
  }, [partners, qrPartnerId]);

  // Mint (and auto-refresh) the QR token while a partner is selected.
  useEffect(() => {
    if (!profile || !qrPartnerId) {
      setQrToken(null);
      return;
    }
    try {
      window.localStorage.setItem("washsmart.lastPartner", qrPartnerId);
    } catch {
      /* ignore */
    }
    mintQr();
  }, [profile, qrPartnerId, mintQr]);

  useEffect(() => {
    if (!qrPartnerId) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [qrPartnerId]);

  const qrRemainingMs = Math.max(0, TOKEN_TTL_MS - (now - qrIssuedAt));
  const qrRemainingSec = Math.ceil(qrRemainingMs / 1000);

  useEffect(() => {
    if (qrToken && qrRemainingMs <= 0) mintQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrRemainingMs]);

  const subscription: Subscription | null = summary?.primary ?? null;
  const totalWashes = summary?.totalRemaining ?? 0;
  const bonusWashes = summary?.bonusRemaining ?? 0;
  const outOfWashes = totalWashes <= 0;
  const firstName = profile?.name.split(" ")[0] ?? "there";
  const openPartners = partners.filter((p) => p.status === "Open");
  const qrPartner = partners.find((p) => p.id === qrPartnerId) ?? null;

  return (
    <section className="mx-auto max-w-7xl px-5 py-8">
      <p className="text-lg text-gray-300">
        {greeting()} 👋, <span className="font-bold text-[#e9f2ec]">{firstName}</span>
      </p>

      {verifyEmail && !profile && (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-[#20a957]/40 bg-[#0e2a1c] p-4">
          <p className="text-sm text-gray-300">
            ✉️{" "}
            <span className="font-bold text-[#e9f2ec]">
              Verification link sent to {verifyEmail}.
            </span>
            <br />
            Click the link in your inbox to finish signing in — then pick
            your plan.
          </p>
          <button
            onClick={() => {
              clearVerifyPending();
              setVerifyEmail(null);
            }}
            aria-label="Dismiss"
            className="text-xl leading-none text-gray-500"
          >
            ×
          </button>
        </div>
      )}

      <div className="mt-4">
        <InstallPrompt />
      </div>

      {/* My Wash QR — lives on the dashboard now (was the Scan tab). */}
      <Reveal className="mt-6">
        <section
          id="wash-qr"
          aria-label="My Wash QR"
          className="scroll-mt-24 overflow-hidden rounded-3xl border border-white/5 bg-[#063c28] p-6 text-white shadow-[0_0_32px_5px_rgb(0_0_0/0.28)] md:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-wide text-[#65e28e]">
                WASHSMART VERIFICATION
              </p>
              <h2 className="mt-1 text-2xl font-bold">My Wash QR</h2>
            </div>
            {profile && openPartners.length > 0 && (
              <label className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-white/70">Washing at</span>
                <select
                  value={qrPartnerId ?? ""}
                  onChange={(e) => setQrPartnerId(e.target.value || null)}
                  aria-label="Choose the partner you're visiting"
                  className="max-w-[220px] rounded-full border border-white/20 bg-[#0a0f0c] px-4 py-2.5 text-sm font-semibold text-[#e9f2ec] outline-none focus:border-[#20a957]"
                >
                  <option value="">Choose a partner…</option>
                  {openPartners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {!profile ? (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/5 p-5">
              <p className="text-sm text-white/75">
                Log in to generate your wash QR.
              </p>
              <Link
                href="/app/login"
                className="rounded-full bg-[#20a957] px-6 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-[#1a8a47]"
              >
                Log in →
              </Link>
            </div>
          ) : !qrPartner ? (
            <p className="mt-6 rounded-2xl bg-white/5 p-5 text-sm text-white/70">
              Pick the car wash you&rsquo;re visiting above to generate your
              wash QR.
            </p>
          ) : outOfWashes ? (
            <div className="mt-6 text-center">
              <p className="text-xl font-bold">No washes left</p>
              <p className="mt-2 text-sm text-white/70">
                Top up to keep washing smarter.
              </p>
              <Link
                href="/app/subscription"
                className="mt-4 inline-block rounded-full bg-[#2ed06a] px-8 py-3 font-bold text-white transition-all duration-200 hover:bg-[#25b856]"
              >
                View Plans
              </Link>
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-6 md:flex-row md:gap-10">
              <div className="rounded-2xl bg-white p-3 shadow-xl">
                {qrToken ? (
                  <QRCode text={qrToken} size={200} />
                ) : (
                  <div className="flex h-[200px] w-[200px] items-center justify-center">
                    <p className="text-sm text-gray-500">Loading…</p>
                  </div>
                )}
              </div>
              <div className="text-center md:text-left">
                <p className="font-bold">{qrPartner.name}</p>
                <p className="mt-1 text-sm text-white/60">{qrPartner.location}</p>
                <div className="mt-4 inline-flex items-center gap-3 rounded-full bg-[#111a14]/40 px-4 py-2 text-sm">
                  <span className="text-white/70">Refreshes in</span>
                  <span className="font-mono font-bold text-[#65e28e]">
                    {Math.floor(qrRemainingSec / 60)}:
                    {String(qrRemainingSec % 60).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-4 text-sm text-white/70">
                  Present this QR at {qrPartner.name}. The partner scans it to
                  verify and deduct one wash.
                </p>
                <p className="mt-2 text-sm font-semibold text-[#65e28e]">
                  {totalWashes} {totalWashes === 1 ? "wash" : "washes"} remaining
                </p>
              </div>
            </div>
          )}
        </section>
      </Reveal>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Reveal>
        <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#063c28] p-8 text-white shadow-[0_0_32px_5px_rgb(0_0_0/0.28)]">
          <p className="mb-3 text-sm font-semibold text-[#65e28e]">
            WASHSMART SUBSCRIBER
          </p>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Your car deserves a
            <span className="text-gradient-brand"> smarter</span> way to stay clean.
          </h1>
          <p className="mt-5 max-w-lg text-white/75">
            {subscription
              ? `Your ${subscription.planName} subscription is active — ${totalWashes} wash${totalWashes === 1 ? "" : "es"} left.`
              : "Subscribe to WashSMART and access a growing network of approved car-wash partners."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {subscription ? (
              <Link
                href="#wash-qr"
                className="rounded-full bg-[#20a957] px-6 py-3 font-semibold tracking-wide text-white shadow-lg shadow-[#20a957]/20 transition-all duration-200 hover:bg-[#1a8a47] active:scale-[0.98]"
              >
                Get My Wash QR
              </Link>
            ) : (
              <Link
                href="/app/signup"
                className="rounded-full bg-[#20a957] px-6 py-3 font-semibold tracking-wide text-white shadow-lg shadow-[#20a957]/20 transition-all duration-200 hover:bg-[#1a8a47] active:scale-[0.98]"
              >
                Subscribe Now
              </Link>
            )}
            <Link
              href="/app/partners"
              className="rounded-full border border-white/40 px-6 py-3 font-semibold tracking-wide transition-all duration-200 hover:border-white/70 hover:bg-white/5 active:scale-[0.98]"
            >
              Find a Partner
            </Link>
          </div>
          {!profile && (
            <p className="mt-4 text-sm text-white/70">
              Already a subscriber?{" "}
              <Link href="/app/login" className="font-bold text-white underline">
                Log in →
              </Link>
            </p>
          )}
        </div>
        </Reveal>

        <Reveal delay={150}>
        <div className="space-y-6">
        <div className="rounded-3xl border border-white/5 bg-[#111a14] p-6 shadow-[0_0_32px_5px_rgb(0_0_0/0.28)]">
          {subscription ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Subscription</p>
                  <h2 className="mt-1 text-2xl font-bold">
                    {subscription.planName} Plan
                  </h2>
                </div>
                <div className="rounded-full bg-[#20a957]/15 px-3 py-1 text-xs font-bold text-green-400">
                  ACTIVE
                </div>
              </div>
              <div className="mt-6 rounded-2xl bg-[#20a957]/10 p-5">
                <p className="text-sm text-gray-400">Washes remaining</p>
                <div className="mt-1 text-4xl font-bold text-[#48d87c]">
                  {totalWashes}
                  <span className="text-base font-normal text-gray-400">
                    {" "}
                    of {subscription.washesTotal}
                  </span>
                </div>
                {bonusWashes > 0 && (
                  <p className="mt-1 text-xs font-semibold text-[#48d87c]">
                    🎁 Includes {bonusWashes} free referral wash
                    {bonusWashes === 1 ? "" : "es"}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  Expires {fmtDate(subscription.expiresAt)} ·{" "}
                  {creditDaysLeft(subscription.expiresAt)} days left
                </p>
              </div>
              <Link
                href="#wash-qr"
                className={`mt-5 block w-full rounded-full py-3 transition-all duration-200 text-center font-bold text-white ${
                  outOfWashes
                    ? "pointer-events-none bg-white/15"
                    : "bg-[#20a957] hover:bg-[#1a8a47]"
                }`}
              >
                {outOfWashes ? "No Washes Left" : "Scan & Wash"}
              </Link>
              {outOfWashes && (
                <Link
                  href="/app/subscription"
                  className="mt-3 block w-full rounded-full border border-[#20a957] py-3 transition-all duration-200 hover:bg-[#20a957]/10 text-center text-sm font-bold text-[#48d87c]"
                >
                  Renew Subscription
                </Link>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col justify-center text-center">
              <div className="flex justify-center"><IconChip icon="🧽" /></div>
              <h2 className="mt-3 text-xl font-bold">No active subscription</h2>
              <p className="mt-2 text-sm text-gray-400">
                Choose a plan to start washing smarter today.
              </p>
              <Link
                href="/app/subscription"
                className="mt-5 block w-full rounded-full bg-[#20a957] py-3 transition-all duration-200 hover:bg-[#1a8a47] text-center font-bold text-white"
              >
                View Plans
              </Link>
            </div>
          )}
        </div>
        {profile && <ReferralCard highlight={outOfWashes} />}
        </div>
        </Reveal>
      </div>

      <section className="mt-10">
        <SectionTitle
          action={
            <Link
              href="/app/partners"
              className="text-sm font-semibold text-[#48d87c]"
            >
              View all →
            </Link>
          }
        >
          Nearby Partners
        </SectionTitle>
        {partners.length === 0 ? (
          <EmptyState
            icon="📍"
            title="No partners yet"
            body="Approved partners will appear here."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {partners.slice(0, 3).map((p, i) => (
              <Reveal key={p.id} delay={i * 150}>
                <PartnerCard partner={p} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionTitle
          action={
            <Link
              href="/app/history"
              className="text-sm font-semibold text-[#48d87c]"
            >
              View all →
            </Link>
          }
        >
          Recent Washes
        </SectionTitle>
        {history.length === 0 ? (
          <EmptyState
            icon="🚿"
            title="No washes yet"
            body="Your completed washes will show up here."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-[#111a14] shadow-sm">
            {history.slice(0, 4).map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between border-b p-5 last:border-0"
              >
                <div>
                  <p className="font-bold">{w.partnerName}</p>
                  <p className="text-sm text-gray-400">{w.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{w.type}</p>
                  <p className="text-xs text-gray-500">{fmtDate(w.at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
