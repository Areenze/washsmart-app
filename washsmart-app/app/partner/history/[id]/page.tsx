"use client";

/* /partner/history/[id] — single wash transaction detail. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  currentPartnerSession,
  fmtDate,
  fmtNaira,
  getPartnerTransaction,
} from "@/lib/db/store";
import type { WashTransaction } from "@/lib/db/types";

export default function PartnerWashDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [tx, setTx] = useState<WashTransaction | null | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const p = await currentPartnerSession();
      if (!p || !id) {
        setTx(null);
        return;
      }
      setTx(await getPartnerTransaction(p.id, id).catch(() => null));
    })();
  }, [id]);

  if (tx === undefined) {
    return (
      <section className="mx-auto max-w-xl py-8">
        <p className="text-gray-400">Loading…</p>
      </section>
    );
  }

  if (!tx) {
    return (
      <section className="mx-auto max-w-xl py-8 text-center">
        <h1 className="text-2xl font-bold">Transaction not found</h1>
        <Link
          href="/partner/history"
          className="mt-6 inline-block rounded-full bg-[#14b8a6] px-6 py-3 font-bold text-white"
        >
          ← Back to History
        </Link>
      </section>
    );
  }

  const rows: [string, string][] = [
    ["Transaction ID", tx.id],
    ["Subscriber", tx.subscriberName],
    ["Partner", tx.partnerName],
    ["Date / time", fmtDate(tx.at)],
    ["Service", tx.type],
    ["Credit deducted", "1 wash"],
    ["Partner payout", fmtNaira(tx.payout)],
    ["Verification", "QR code scan"],
    ["Status", "Confirmed ✓"],
  ];

  return (
    <section className="mx-auto max-w-xl py-8">
      <Link
        href="/partner/history"
        className="mb-5 inline-block text-sm font-semibold text-[#2dd4bf]"
      >
        ← Back to History
      </Link>
      <h1 className="text-3xl font-bold">Wash Receipt</h1>

      <div className="mt-6 divide-y divide-white/10 rounded-2xl bg-[#111a14]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
            <span className="shrink-0 text-gray-400">{k}</span>
            <span
              className={`min-w-0 text-right font-semibold ${
                k === "Transaction ID" ? "truncate font-mono text-xs" : ""
              }`}
              title={v}
            >
              {v}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
