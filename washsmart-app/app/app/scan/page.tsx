"use client";

/* /app/scan — "My Wash QR": rotating time-boxed token (60s) drawn as a
 * real QR. The token is partner-agnostic — whichever partner scans it is
 * recorded at redemption time. An optional ?partner= only personalizes the
 * "present at …" line.
 */

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "@/components/qrcode";
import {
  TOKEN_TTL_MS,
  getMySubscription,
  getPartnerPublic,
  getWashCredentials,
} from "@/lib/db/store";
import type { Partner, Subscription } from "@/lib/db/types";

export default function ScanPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-xl px-5 py-8">
          <p className="text-gray-400">Loading…</p>
        </section>
      }
    >
      <ScanInner />
    </Suspense>
  );
}

function ScanInner() {
  const search = useSearchParams();
  const partnerId = search.get("partner");
  const [partner, setPartner] = useState<Partner | null | undefined>(undefined);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [issuedAt, setIssuedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);

  const mint = useCallback(async () => {
    const creds = await getWashCredentials();
    setToken(creds?.token ?? null);
    setCode(creds?.code ?? null);
    setIssuedAt(Date.now());
    setSubscription(await getMySubscription());
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      // Optional ?partner= only personalizes the "present at …" line.
      setPartner(partnerId ? ((await getPartnerPublic(partnerId)) ?? null) : null);
      mint();
    })();
  }, [partnerId, mint]);

  // Countdown ticker; auto-refresh the token when it expires.
  useEffect(() => {
    const id = window.setInterval(async () => {
      setNow(Date.now());
      setSubscription(await getMySubscription());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, TOKEN_TTL_MS - (now - issuedAt));
  const remainingSec = Math.ceil(remainingMs / 1000);

  useEffect(() => {
    if (token && remainingMs <= 0) mint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs]);

  // Refresh subscription when the tab regains focus (partner may have
  // redeemed a wash while this screen was open).
  useEffect(() => {
    const onFocus = async () => setSubscription(await getMySubscription());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const outOfWashes = (subscription?.washesRemaining ?? 0) <= 0;

  return (
    <section className="mx-auto max-w-xl px-5 py-8">
      <Link
        href="/app"
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back
      </Link>

      <div className="rounded-3xl bg-[#063c28] p-8 text-center text-white">
        {loading ? (
          <>
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
            <p className="mt-5 font-bold">Preparing your wash QR…</p>
          </>
        ) : outOfWashes ? (
          <>
            <h1 className="text-3xl font-bold">No washes left</h1>
            <p className="mt-3 text-white/70">
              You&apos;ve used all {subscription?.washesTotal} washes on your{" "}
              {subscription?.planName} Plan this month.
            </p>
            <Link
              href="/app/subscription"
              className="mt-8 block w-full rounded-full bg-[#2ed06a] py-3 transition-all duration-200 hover:bg-[#25b856] font-bold text-white"
            >
              View Plans
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-white/60">WASHSMART VERIFICATION</p>
            <h1 className="mt-2 text-3xl font-bold">My Wash QR</h1>

            <div className="mx-auto mt-6 w-fit rounded-2xl bg-white p-3">
              {token ? (
                <QRCode text={token} size={224} />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center">
                  <p className="text-gray-500">Loading…</p>
                </div>
              )}
            </div>

            <div className="mx-auto mt-4 flex max-w-xs items-center justify-between rounded-full bg-[#111a14]/10 px-4 py-2 text-sm">
              <span className="text-white/70">Refreshes in</span>
              <span className="font-mono font-bold text-[#65e28e]">
                0:{String(remainingSec).padStart(2, "0")}
              </span>
            </div>

            <p className="mt-4 text-sm text-white/70">
              {partner
                ? `Present this QR at ${partner.name}. The partner scans it to verify and deduct one wash.`
                : "Present this QR at any WashSMART partner. They scan it to verify and deduct one wash."}
            </p>
            <p className="mt-2 text-sm font-semibold text-[#65e28e]">
              {subscription?.washesRemaining}{" "}
              {subscription?.washesRemaining === 1 ? "wash" : "washes"}{" "}
              remaining
            </p>

            {code && (
              <div className="mx-auto mt-5 max-w-xs rounded-2xl bg-[#111a14]/10 px-4 py-3">
                <p className="text-xs text-white/70">
                  Partner&rsquo;s camera not working? Give them this code
                  instead:
                </p>
                <p className="mt-1 font-mono text-3xl font-bold tracking-[0.35em]">
                  {code.slice(0, 3)} {code.slice(3)}
                </p>
              </div>
            )}

          </>
        )}
      </div>
    </section>
  );
}
