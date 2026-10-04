"use client";

/* /partner/ledger — the partner's own financial ledger: every wash earning,
 * fee, adjustment and settlement payout, with a running balance. */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  currentPartnerSession,
  fmtDate,
  fmtNaira,
  listPartnerLedger,
  type PartnerLedgerEntry,
} from "@/lib/db/store";

const KIND_LABEL: Record<string, string> = {
  wash_earning: "Wash completed",
  washsmart_fee: "WashSMART fee",
  adjustment: "Adjustment",
  settlement_payout: "Settlement paid",
};

export default function PartnerLedgerPage() {
  const [entries, setEntries] = useState<PartnerLedgerEntry[] | null>(null);

  useEffect(() => {
    (async () => {
      const p = await currentPartnerSession();
      if (!p) return;
      setEntries(await listPartnerLedger(p.id).catch(() => []));
    })();
  }, []);

  // Running balance: entries are newest-first, so accumulate in reverse.
  let balance = 0;
  const withBalance = [...(entries ?? [])]
    .reverse()
    .map((e) => {
      balance += e.amount;
      return { ...e, balance };
    })
    .reverse();

  return (
    <section className="mx-auto max-w-3xl py-8">
      <Link
        href="/partner/earnings"
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back
      </Link>
      <h1 className="text-3xl font-bold">Ledger</h1>
      <p className="mt-2 text-gray-400">
        Every wash earning, fee and payout — accounted for line by line.
      </p>

      {entries === null ? (
        <p className="mt-6 text-gray-400">Loading…</p>
      ) : withBalance.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-[#111a14] p-8 text-center">
          <p className="font-bold">No ledger entries yet</p>
          <p className="mt-2 text-sm text-gray-400">
            Verified washes will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl bg-[#111a14]">
          <div className="hidden grid-cols-[1fr_auto_auto] gap-4 border-b border-white/10 px-5 py-3 text-xs font-bold uppercase text-gray-500 sm:grid">
            <span>Entry</span>
            <span className="w-28 text-right">Amount</span>
            <span className="w-28 text-right">Balance</span>
          </div>
          {withBalance.map((e) => (
            <div
              key={e.id}
              className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-white/5 px-5 py-3.5 last:border-0 sm:grid-cols-[1fr_auto_auto] sm:gap-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {KIND_LABEL[e.kind] ?? e.kind}
                </p>
                <p className="text-xs text-gray-500">
                  {fmtDate(e.createdAt)} · {e.status.replace(/_/g, " ")}
                </p>
              </div>
              <p
                className={`w-28 text-right font-mono text-sm font-bold ${
                  e.amount >= 0 ? "text-[#48d87c]" : "text-red-300"
                }`}
              >
                {e.amount >= 0 ? "+" : "−"}
                {fmtNaira(Math.abs(e.amount))}
              </p>
              <p className="hidden w-28 text-right font-mono text-sm text-gray-300 sm:block">
                {fmtNaira(e.balance)}
              </p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs text-gray-500">
        Earnings accrue per verified wash and pay out in the monthly settlement —
        never per wash.
      </p>
    </section>
  );
}
