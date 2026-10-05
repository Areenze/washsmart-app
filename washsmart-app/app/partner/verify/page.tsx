"use client";

/* /partner/verify?token=… — verification checklist, then [APPROVE WASH].
 * Checks: QR valid → subscription active → washes remaining → not used.
 * Approval decrements the subscriber's washes and records the transaction.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  currentPartnerSession,
  currentUserId,
  inspectToken,
  redeemWash,
  type PartnerStats,
  partnerStats,
} from "@/lib/db/store";
import { notifySoon } from "@/lib/db/notifications";
import type { RedeemFailure, Subscription, WashTransaction } from "@/lib/db/types";

const FAILURE_COPY: Record<RedeemFailure, string> = {
  "bad-token": "This QR code isn't a valid WashSMART token.",
  "expired-token": "This QR code has expired. Ask the subscriber to refresh it.",
  "unknown-subscription": "No subscription matches this QR code.",
  "inactive-subscription": "This subscription is no longer active.",
  "no-washes-left": "The subscriber has used all their washes this month.",
  "already-used": "This QR code was already scanned. Ask for a fresh one.",
};

type Phase = "checking" | "checklist" | "approving" | "approved" | "rejected";

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <section className="py-8">
          <p className="text-gray-400">Loading…</p>
        </section>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}

function VerifyInner() {
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const [phase, setPhase] = useState<Phase>("checking");
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [failure, setFailure] = useState<RedeemFailure | null>(null);
  const [tx, setTx] = useState<WashTransaction | null>(null);
  const [washesLeft, setWashesLeft] = useState(0);
  const [stats, setStats] = useState<PartnerStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.setTimeout(async () => {
      const check = await inspectToken(token);
      if (cancelled) return;
      if (check.ok) {
        setSubscription(check.subscription);
        setPhase("checklist");
      } else {
        setFailure(check.failure);
        setPhase("rejected");
      }
    }, 900);
    return () => {
      cancelled = true;
    };
  }, [token]);

  const approve = async () => {
    const partner = await currentPartnerSession();
    if (!partner) return;
    setPhase("approving");
    window.setTimeout(async () => {
      const res = await redeemWash(token, partner.id);
      if (res.ok) {
        setTx(res.transaction);
        setWashesLeft(res.washesRemaining);
        setStats(await partnerStats(partner.id));
        setPhase("approved");
        const uid = await currentUserId().catch(() => null);
        if (uid) {
          notifySoon(
            uid,
            "wash_redeemed",
            "Wash confirmed ✓",
            `1 wash redeemed at ${partner.name}. ${res.washesRemaining} credit${res.washesRemaining === 1 ? "" : "s"} left on the subscriber's plan.`,
            "/partner/history",
            "partner"
          );
        }
      } else {
        setFailure(res.reason);
        setPhase("rejected");
      }
    }, 1000);
  };

  return (
    <section className="mx-auto max-w-xl py-8">
      <Link
        href="/partner/scan"
        className="mb-5 inline-block text-sm font-semibold text-[#66dca4]"
      >
        ← Back to Scanner
      </Link>

      {phase === "checking" && (
        <div className="rounded-3xl bg-[#111a14] p-12 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#34d186]" />
          <p className="mt-5 font-bold">Verifying QR code…</p>
        </div>
      )}

      {phase === "checklist" && subscription && (
        <div className="rounded-3xl bg-[#111a14] p-8 shadow-sm">
          <h1 className="text-2xl font-bold">Verification Checklist</h1>
          <div className="mt-5 space-y-3">
            {[
              "QR code is valid",
              "Subscription is active",
              `Washes remaining (${subscription.washesRemaining} of ${subscription.washesTotal})`,
              "QR not already used",
            ].map((label) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl bg-[#34d186]/10 px-4 py-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#34d186] font-bold text-white">
                  ✓
                </span>
                <span className="text-sm font-semibold">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-[#0a0f0c] p-5">
            <div className="flex items-center justify-between gap-3 py-1 text-sm">
              <span className="shrink-0 text-gray-400">Plan</span>
              <span className="min-w-0 truncate text-right font-bold">
                {subscription.planName} · {subscription.washesTotal} washes / 30 days
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-1 text-sm">
              <span className="shrink-0 text-gray-400">Subscriber</span>
              <span className="min-w-0 truncate text-right font-bold" title={subscription.email}>
                {subscription.email}
              </span>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              href="/partner/scan"
              className="flex-1 rounded-full border border-white/10 py-3 transition-all duration-200 hover:border-white/25 text-center font-bold text-gray-400"
            >
              Cancel
            </Link>
            <button
              onClick={approve}
              className="flex-1 rounded-full bg-[#34d186] py-3 transition-all duration-200 hover:bg-[#27ab6c] font-bold text-white"
            >
              Approve Wash
            </button>
          </div>
        </div>
      )}

      {phase === "approving" && (
        <div className="rounded-3xl bg-[#111a14] p-12 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#34d186]" />
          <p className="mt-5 font-bold">Recording wash…</p>
        </div>
      )}

      {phase === "approved" && tx && (
        <div className="rounded-3xl bg-[#063c28] p-8 text-center text-white">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#40d48d] text-4xl">
            ✓
          </div>
          <h1 className="mt-5 text-3xl font-bold">Wash Approved</h1>
          <p className="mt-3 text-white/70">
            {tx.subscriberName} · {tx.type}
          </p>
          <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#111a14]/10 p-4">
              <p className="text-xs text-white/60">Subscriber washes left</p>
              <p className="mt-1 text-2xl font-bold text-[#65e28e]">{washesLeft}</p>
            </div>
            <div className="rounded-2xl bg-[#111a14]/10 p-4">
              <p className="text-xs text-white/60">Your washes today</p>
              <p className="mt-1 text-2xl font-bold">{stats?.todayWashes ?? "—"}</p>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/partner/scan"
              className="flex-1 rounded-full bg-[#40d48d] py-3 transition-all duration-200 hover:bg-[#25b856] text-center font-bold text-white"
            >
              Scan Next Customer
            </Link>
            <Link
              href="/partner/dashboard"
              className="flex-1 rounded-xl border border-white/40 py-3 text-center font-bold"
            >
              Dashboard
            </Link>
          </div>
        </div>
      )}

      {phase === "rejected" && failure && (
        <div className="rounded-3xl bg-[#111a14] p-8 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-500/15 text-4xl">
            ✕
          </div>
          <h1 className="mt-5 text-2xl font-bold">Cannot Approve Wash</h1>
          <p className="mx-auto mt-3 max-w-sm text-sm text-gray-400">
            {FAILURE_COPY[failure]}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/partner/scan"
              className="flex-1 rounded-full bg-[#34d186] py-3 transition-all duration-200 hover:bg-[#27ab6c] text-center font-bold text-white"
            >
              Scan Again
            </Link>
            <Link
              href="/partner/dashboard"
              className="flex-1 rounded-full border border-white/10 py-3 transition-all duration-200 hover:border-white/25 text-center font-bold text-gray-400"
            >
              Dashboard
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
