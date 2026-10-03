"use client";

/* /partner/earnings — Earnings & Settlements.
 * Partners are NOT paid per wash. Verified washes accrue on the WashSMART
 * ledger, then each monthly settlement nets them out (gross − commission ±
 * adjustments) and pays the partner by bank transfer. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import {
  currentPartnerSession,
  fmtDate,
  fmtNaira,
  getPendingSettlement,
  lifetimeSettled,
  listSettlements,
} from "@/lib/db/store";
import type {
  Partner,
  PendingSettlement,
  Settlement,
} from "@/lib/db/types";

function fmtSigned(n: number): string {
  if (n > 0) return "+" + fmtNaira(n);
  if (n < 0) return "−" + fmtNaira(Math.abs(n));
  return fmtNaira(0);
}

const MONEY_FLOW: { title: string; body: string }[] = [
  {
    title: "Subscriber pays",
    body: "Customer buys a WashSMART plan (e.g. ₦12,000 Standard · 6 washes) — payment confirmed via Paystack.",
  },
  {
    title: "Wash is redeemed",
    body: "Subscriber scans their QR at your wash. Every redemption is written to the Wash Transaction Database.",
  },
  {
    title: "Earning accrues on your ledger",
    body: "Each verified wash adds one ledger line at your agreed settlement rate. Nothing is paid out yet.",
  },
  {
    title: "Monthly settlement",
    body: "WashSMART verifies the month's washes, checks for duplicate or fraudulent QR redemptions, applies refunds/disputes, deducts the WashSMART commission and produces your settlement statement.",
  },
  {
    title: "WashSMART pays you",
    body: "Settlement approved → bank transfer to your registered account. Paystack moves the money; WashSMART decides the amount.",
  },
];

const WHY_MONTHLY = [
  "Verify every completed wash before money moves",
  "Detect duplicate or fraudulent QR redemptions",
  "Account for refunds and disputes",
  "Calculate WashSMART's commission transparently",
  "Produce one clean settlement statement per cycle",
];

function BreakdownRow({
  label,
  value,
  strong,
  negative,
}: {
  label: string;
  value: string;
  strong?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <p className={strong ? "font-bold" : "text-white/70"}>{label}</p>
      <p
        className={
          strong
            ? "text-lg font-bold text-[#65e28e]"
            : negative
              ? "font-semibold text-red-300"
              : "font-semibold"
        }
      >
        {value}
      </p>
    </div>
  );
}

export default function EarningsPage() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [pending, setPending] = useState<PendingSettlement | null>(null);
  const [past, setPast] = useState<Settlement[]>([]);
  const [lifetime, setLifetime] = useState({ washes: 0, paid: 0 });

  useEffect(() => {
    (async () => {
      const p = await currentPartnerSession();
      if (!p) return;
      setPartner(p);
      setPending(await getPendingSettlement(p.id));
      setPast(await listSettlements(p.id));
      setLifetime(await lifetimeSettled(p.id));
    })();
  }, []);

  if (!partner || !pending) {
    return <p className="py-8 text-gray-400">Loading…</p>;
  }

  return (
    <section className="mx-auto max-w-3xl py-8">
      <Link
        href="/partner/dashboard"
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back
      </Link>
      <h1 className="text-3xl font-bold">Earnings &amp; Settlements</h1>
      <p className="mt-2 text-gray-400">
        Verified washes accrue on your ledger and pay out in a monthly
        settlement — never per wash.
      </p>

      {/* Pending settlement — the live current cycle */}
      <Card className="mt-6 bg-[#063c28] text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-white/60">
              PENDING SETTLEMENT · {pending.period.toUpperCase()}
            </p>
            <p className="mt-1 text-4xl font-bold text-[#65e28e]">
              {fmtNaira(pending.payable)}
            </p>
            <p className="mt-1 text-sm text-white/60">amount payable</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#f5b942]/20 px-3 py-1 text-xs font-bold text-[#f5b942]">
            ⏳ Pending
          </span>
        </div>

        <div className="mt-4 divide-y divide-white/10 border-t border-white/10">
          <BreakdownRow
            label="Completed washes"
            value={String(pending.washes)}
          />
          <BreakdownRow
            label={`Gross earnings (${pending.washes} × ${fmtNaira(pending.rate)})`}
            value={fmtNaira(pending.gross)}
          />
          <BreakdownRow
            label="WashSMART fees"
            value={fmtSigned(-pending.washsmartFee)}
            negative
          />
          <BreakdownRow
            label="Adjustments"
            value={fmtSigned(pending.adjustments)}
            negative={pending.adjustments < 0}
          />
          <div className="flex items-center justify-between py-3">
            <p className="font-bold">Amount payable</p>
            <p className="text-xl font-bold text-[#65e28e]">
              {fmtNaira(pending.payable)}
            </p>
          </div>
        </div>

        <p className="mt-2 text-sm text-white/60">
          Settlement date:{" "}
          <span className="font-bold text-white">
            {fmtDate(pending.settlementDate)}
          </span>
        </p>
        <Link
          href="/partner/settlements/current"
          className="mt-4 block rounded-full bg-[#2ed06a] py-3 transition-all duration-200 hover:bg-[#25b856] text-center font-bold text-white"
        >
          View Statement
        </Link>
        {pending.washes === 0 && (
          <p className="mt-3 text-center text-xs text-white/50">
            No verified washes this cycle yet — new scans will appear here
            automatically.
          </p>
        )}
      </Card>

      {/* Past settlements */}
      <h2 className="mt-10 text-xl font-bold">Past settlements</h2>
      {past.length === 0 ? (
        <Card className="mt-4">
          <p className="text-gray-400">
            No closed settlements yet. Your first payout will appear here after
            the monthly cycle runs.
          </p>
        </Card>
      ) : (
        <div className="mt-4 space-y-4">
          {past.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#48d87c]">
                    ✓ Settlement Paid
                  </p>
                  <p className="mt-1 text-3xl font-bold">
                    {fmtNaira(s.payable)}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Paid to {s.bankName} •••• {s.bankLast4}
                  </p>
                  <p className="text-sm text-gray-400">
                    Reference:{" "}
                    <span className="font-mono font-bold text-gray-200">
                      {s.id}
                    </span>
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#20a957]/10 px-3 py-1 text-xs font-bold text-[#48d87c]">
                  Paid
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4 text-center">
                <div>
                  <p className="text-xs text-gray-500">Period</p>
                  <p className="text-sm font-bold">{s.period}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Washes</p>
                  <p className="text-sm font-bold">{s.washes}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Paid on</p>
                  <p className="text-sm font-bold">{fmtDate(s.paidAt!)}</p>
                </div>
              </div>
              <Link
                href={`/partner/settlements/${s.id}`}
                className="mt-4 block rounded-xl border-2 border-[#20a957]/50 py-2.5 text-center text-sm font-bold text-[#48d87c]"
              >
                View Statement
              </Link>
            </Card>
          ))}
        </div>
      )}

      {/* Lifetime strip */}
      <Card className="mt-6">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">LIFETIME SETTLED WASHES</p>
            <p className="mt-1 text-2xl font-bold">{lifetime.washes}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">LIFETIME PAID OUT</p>
            <p className="mt-1 text-2xl font-bold text-[#48d87c]">
              {fmtNaira(lifetime.paid)}
            </p>
          </div>
        </div>
      </Card>

      {/* How the money flows */}
      <h2 className="mt-10 text-xl font-bold">How WashSMART pays you</h2>
      <Card className="mt-4">
        <ol className="relative space-y-6 border-l-2 border-[#20a957]/30 pl-6">
          {MONEY_FLOW.map((step, i) => (
            <li key={step.title} className="relative">
              <span className="absolute -left-[34px] flex h-6 w-6 items-center justify-center rounded-full bg-[#168846] text-xs font-bold text-white">
                {i + 1}
              </span>
              <p className="font-bold">{step.title}</p>
              <p className="mt-0.5 text-sm text-gray-400">{step.body}</p>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="mt-4 bg-[#20a957]/10">
        <p className="font-bold text-[#48d87c]">
          Why monthly settlements — not instant payout
        </p>
        <ul className="mt-3 space-y-2">
          {WHY_MONTHLY.map((w) => (
            <li key={w} className="flex gap-2 text-sm text-gray-300">
              <span className="text-[#48d87c]">✓</span> {w}
            </li>
          ))}
        </ul>
      </Card>

      <p className="mt-6 text-xs text-gray-500">
        Demo figures — production settlements are calculated by WashSMART and
        paid via Paystack transfers to your registered bank account.
      </p>
    </section>
  );
}
