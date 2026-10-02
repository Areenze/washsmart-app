"use client";

/* /partner/history — washes recorded at this partner. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui";
import {
  currentPartnerSession,
  fmtDate,
  fmtNaira,
  listPartnerTransactions,
} from "@/lib/db/store";
import type { WashTransaction } from "@/lib/db/types";

export default function PartnerHistoryPage() {
  const [txs, setTxs] = useState<WashTransaction[]>([]);

  useEffect(() => {
    (async () => {
      const p = await currentPartnerSession();
      if (p) setTxs(await listPartnerTransactions(p.id));
    })();
  }, []);

  return (
    <section className="mx-auto max-w-3xl py-8">
      <Link
        href="/partner/dashboard"
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back
      </Link>
      <h1 className="text-3xl font-bold">Wash History</h1>
      <p className="mt-2 text-gray-400">
        Every subscriber wash verified at your car wash.
      </p>

      {txs.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="🧾"
            title="No washes yet"
            body="Verified washes will be listed here with subscriber and payout details."
            action={
              <Link
                href="/partner/scan"
                className="inline-block rounded-xl bg-[#20a957] px-6 py-3 font-bold text-white"
              >
                Scan Customer QR
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl bg-[#111a14] shadow-sm">
          {txs.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between border-b p-5 last:border-0"
            >
              <div>
                <p className="font-bold">{t.subscriberName}</p>
                <p className="text-sm text-gray-400">{t.type}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-[#48d87c]">
                  {fmtNaira(t.payout)}
                </p>
                <p className="text-xs text-gray-500">{fmtDate(t.at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
