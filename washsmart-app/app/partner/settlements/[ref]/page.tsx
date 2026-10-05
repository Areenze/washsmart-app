"use client";

/* /partner/settlements/[ref] — settlement statement.
 * "current" renders the live pending cycle; otherwise a closed settlement
 * with its full ledger audit trail. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui";
import {
  currentPartnerSession,
  fmtDate,
  fmtNaira,
  getPendingSettlement,
  getSettlement,
  ledgerForSettlement,
  pendingLedger,
} from "@/lib/db/store";
import type { LedgerEntry, Partner } from "@/lib/db/types";

function lineStyle(kind: LedgerEntry["kind"]): string {
  switch (kind) {
    case "wash_earning":
      return "text-[#48d87c]";
    case "settlement_payout":
      return "text-gray-200";
    default:
      return "text-red-400";
  }
}

function fmtLine(e: LedgerEntry): string {
  const abs = fmtNaira(Math.abs(e.amount));
  if (e.amount > 0) return "+" + abs;
  if (e.amount < 0) return "−" + abs;
  return abs;
}

interface StatementData {
  title: string;
  subtitle: string;
  status: "pending" | "paid";
  washes: number;
  gross: number;
  fee: number;
  adjustments: number;
  payable: number;
  bankLine: string;
  refLine: string;
  lines: LedgerEntry[];
  note?: string;
}

export default function SettlementStatementPage() {
  const params = useParams<{ ref: string }>();
  const ref = params.ref;
  const [partner, setPartner] = useState<Partner | null>(null);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<StatementData | null>(null);

  useEffect(() => {
    (async () => {
      setPartner((await currentPartnerSession()) ?? null);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!partner) return;
    let cancelled = false;
    (async () => {
      if (ref === "current") {
        const p = await getPendingSettlement(partner.id);
        if (cancelled) return;
        setData({
          title: `Pending Statement — ${p.period}`,
          subtitle: `Payout scheduled for ${fmtDate(p.settlementDate)}`,
          status: "pending",
          washes: p.washes,
          gross: p.gross,
          fee: p.washsmartFee,
          adjustments: p.adjustments,
          payable: p.payable,
          bankLine: `To be paid to ${partner.bankName} •••• ${partner.bankLast4}`,
          refLine: "Reference issued at payout",
          lines: await pendingLedger(partner.id),
        });
        return;
      }
      const s = await getSettlement(ref, partner.id);
      if (cancelled) return;
      if (!s) {
        setData(null);
        return;
      }
      setData({
        title: `Statement — ${s.period}`,
        subtitle: `Paid ${fmtDate(s.paidAt!)} · Reference ${s.id}`,
        status: "paid",
        washes: s.washes,
        gross: s.gross,
        fee: s.washsmartFee,
        adjustments: s.adjustments,
        payable: s.payable,
        bankLine: `Paid to ${s.bankName} •••• ${s.bankLast4}`,
        refLine: `Reference: ${s.id}`,
        lines: await ledgerForSettlement(partner.id, s.id),
        note: s.note,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [partner, ref]);

  if (!ready) return <p className="py-8 text-gray-400">Loading…</p>;
  if (!partner) return <p className="py-8 text-gray-400">Loading…</p>;
  if (!data) {
    return (
      <section className="mx-auto max-w-3xl py-8">
        <Link
          href="/partner/earnings"
          className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
        >
          ← Back to Earnings
        </Link>
        <Card>
          <p className="font-bold">Statement not found</p>
          <p className="mt-1 text-sm text-gray-400">
            This settlement doesn't belong to {partner.name} or doesn't exist.
          </p>
        </Card>
      </section>
    );
  }

  const washLines = data.lines.filter((l) => l.kind === "wash_earning");
  const otherLines = data.lines.filter((l) => l.kind !== "wash_earning");

  return (
    <section className="mx-auto max-w-3xl py-8">
      <Link
        href="/partner/earnings"
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back to Earnings
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Settlement Statement</h1>
          <p className="mt-1 text-gray-400">{data.title}</p>
          <p className="text-sm text-gray-500">{data.subtitle}</p>
        </div>
        <span
          className={
            data.status === "paid"
              ? "shrink-0 rounded-full bg-[#20a957]/10 px-3 py-1 text-xs font-bold text-[#48d87c]"
              : "shrink-0 rounded-full bg-[#f5b942]/20 px-3 py-1 text-xs font-bold text-[#f5b942]"
          }
        >
          {data.status === "paid" ? "✓ Paid" : "⏳ Pending"}
        </span>
      </div>

      <Card className="mt-6 bg-[#063c28] text-white">
        <div className="divide-y divide-white/10">
          <div className="flex justify-between py-2">
            <p className="text-white/70">Completed washes</p>
            <p className="font-semibold">{data.washes}</p>
          </div>
          <div className="flex justify-between py-2">
            <p className="text-white/70">Gross earnings</p>
            <p className="font-semibold">{fmtNaira(data.gross)}</p>
          </div>
          <div className="flex justify-between py-2">
            <p className="text-white/70">WashSMART fees</p>
            <p className="font-semibold text-red-300">
              {data.fee === 0 ? fmtNaira(0) : "−" + fmtNaira(data.fee)}
            </p>
          </div>
          <div className="flex justify-between py-2">
            <p className="text-white/70">Adjustments</p>
            <p className="font-semibold">
              {data.adjustments === 0
                ? fmtNaira(0)
                : (data.adjustments < 0 ? "−" : "+") +
                  fmtNaira(Math.abs(data.adjustments))}
            </p>
          </div>
          <div className="flex justify-between py-3">
            <p className="font-bold">Amount payable</p>
            <p className="text-xl font-bold text-[#65e28e]">
              {fmtNaira(data.payable)}
            </p>
          </div>
        </div>
        <p className="mt-2 border-t border-white/10 pt-3 text-sm text-white/60">
          {data.bankLine}
        </p>
        <p className="text-sm text-white/60">{data.refLine}</p>
        {data.note && (
          <p className="mt-2 rounded-xl bg-[#111a14]/10 p-3 text-sm text-white/80">
            Note: {data.note}
          </p>
        )}
      </Card>

      <h2 className="mt-8 text-xl font-bold">
        Ledger — audit trail{" "}
        <span className="text-sm font-normal text-gray-500">
          ({data.lines.length} lines)
        </span>
      </h2>
      {data.lines.length === 0 ? (
        <Card className="mt-4">
          <p className="text-gray-400">
            No ledger lines yet. Verified washes will appear here as they are
            scanned.
          </p>
        </Card>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl bg-[#111a14] shadow-sm">
          {otherLines.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between gap-3 border-b bg-[#0a0f0c] p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{l.label}</p>
                <p className="font-mono text-xs text-gray-500">{l.ref}</p>
              </div>
              <p className={`shrink-0 font-bold ${lineStyle(l.kind)}`}>
                {fmtLine(l)}
              </p>
            </div>
          ))}
          {washLines.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between gap-3 border-b p-4 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{l.label}</p>
                <p className="text-xs text-gray-500">
                  {fmtDate(l.at)} ·{" "}
                  <span className="font-mono">{l.ref.slice(0, 18)}</span>
                </p>
              </div>
              <p className={`shrink-0 font-bold ${lineStyle(l.kind)}`}>
                {fmtLine(l)}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-gray-500">
        Every naira is traceable: wash earnings (+) accrue per verified QR
        redemption, WashSMART commission and adjustments (−) are applied at
        settlement, and the payout (−) zeroes the cycle.
      </p>
    </section>
  );
}
