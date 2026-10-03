"use client";

/* /app/scan — "My Wash QR": rotating time-boxed token (60s) drawn as a
 * real QR. If no partner is chosen (?partner=), ask the subscriber to pick
 * one first. The raw token is shown for the demo handoff to the partner
 * scanner; in production the partner scans the QR directly.
 */

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "@/components/qrcode";
import { EmptyState } from "@/components/ui";
import {
  TOKEN_TTL_MS,
  getMySubscription,
  getPartner,
  getQRToken,
  listApprovedPartners,
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
  const [partners, setPartners] = useState<Partner[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [issuedAt, setIssuedAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);

  const mint = useCallback(async () => {
    const t = await getQRToken();
    setToken(t);
    setIssuedAt(Date.now());
    setSubscription(await getMySubscription());
  }, []);

  useEffect(() => {
    (async () => {
      setPartners(await listApprovedPartners());
      setPartner(partnerId ? ((await getPartner(partnerId)) ?? null) : null);
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

  const copyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const outOfWashes = (subscription?.washesRemaining ?? 0) <= 0;

  return (
    <section className="mx-auto max-w-xl px-5 py-8">
      <Link
        href="/app"
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back
      </Link>

      {!partnerId && (
        <div className="rounded-3xl bg-[#111a14] p-7 shadow-sm">
          <h1 className="text-2xl font-bold">Choose a partner</h1>
          <p className="mt-2 text-sm text-gray-400">
            Pick the car wash you're visiting to generate your wash QR.
          </p>
          <div className="mt-5 space-y-2">
            {partners
              .filter((p) => p.status === "Open")
              .map((p) => (
                <Link
                  key={p.id}
                  href={`/app/scan?partner=${p.id}`}
                  className="block rounded-xl border border-white/10 px-4 py-3 font-semibold hover:border-[#20a957]"
                >
                  {p.name}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    {p.location}
                  </span>
                </Link>
              ))}
          </div>
        </div>
      )}

      {partnerId && partner === null && (
        <EmptyState
          icon="🔍"
          title="Partner not found"
          body="Pick a partner from the list to generate your QR."
          action={
            <Link
              href="/app/scan"
              className="inline-block rounded-full bg-[#20a957] px-6 py-3 transition-all duration-200 hover:bg-[#1a8a47] font-bold text-white"
            >
              Choose Partner
            </Link>
          }
        />
      )}

      {partner && (
        <div className="rounded-3xl bg-[#063c28] p-8 text-center text-white">
          {outOfWashes ? (
            <>
              <h1 className="text-3xl font-bold">No washes left</h1>
              <p className="mt-3 text-white/70">
                You've used all {subscription?.washesTotal} washes on your{" "}
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
              <p className="mt-2 text-sm text-white/60">{partner.name}</p>

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
                Present this QR at {partner.name}. The partner scans it to
                verify and deduct one wash.
              </p>
              <p className="mt-2 text-sm font-semibold text-[#65e28e]">
                {subscription?.washesRemaining}{" "}
                {subscription?.washesRemaining === 1 ? "wash" : "washes"}{" "}
                remaining
              </p>

              <div className="mt-5 rounded-2xl bg-[#111a14]/5 p-4 text-left">
                <p className="text-xs font-semibold text-white/50">
                  Demo token (for the partner scanner)
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-[#65e28e]">
                  {token ?? "—"}
                </p>
                <button
                  onClick={copyToken}
                  className="mt-2 rounded-lg border border-white/30 px-3 py-1.5 text-xs font-bold"
                >
                  {copied ? "Copied ✓" : "Copy token"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
