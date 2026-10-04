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
  const [filter, setFilter] = useState<"today" | "all">("today");

  useEffect(() => {
    (async () => {
      const p = await currentPartnerSession();
      if (p) setTxs(await listPartnerTransactions(p.id));
    })();
  }, []);

  const today = new Date().toDateString();
  const shown =
    filter === "today"
      ? txs.filter((t) => new Date(t.at).toDateString() === today)
      : txs;

  return (
    <section className="mx-auto max-w-3xl py-8">
      <Link
        href="/partner/dashboard"
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Wash History</h1>
          <p className="mt-2 text-gray-400">
            Every subscriber wash verified at your car wash.
          </p>
        </div>
        <div className="flex rounded-full bg-[#111a14] p-1 text-sm font-bold">
          {(["today", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 ${
                filter === f ? "bg-[#20a957] text-white" : "text-gray-400"
              }`}
            >
              {f === "today" ? "Today" : "All"}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="🧾"
            title={filter === "today" ? "No washes today yet" : "No washes yet"}
            body="Verified washes will be listed here with subscriber and payout details."
            action={
              <Link
                href="/partner/scan"
                className="inline-block rounded-full bg-[#20a957] px-6 py-3 transition-all duration-200 hover:bg-[#1a8a47] font-bold text-white"
              >
                Scan Customer QR
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl bg-[#111a14] shadow-sm">
          {shown.map((t) => (
            <Link
              key={t.id}
              href={`/partner/history/${t.id}`}
              className="flex items-center justify-between gap-3 border-b p-5 last:border-0 transition-colors hover:bg-white/[0.03]"
            >
              <div className="min-w-0">
                <p className="truncate font-bold">{t.subscriberName}</p>
                <p className="text-sm text-gray-400">
                  {t.type} · {fmtDate(t.at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-right">
                <div>
                  <p className="text-sm font-bold text-[#48d87c]">
                    {fmtNaira(t.payout)}
                  </p>
                  <p className="text-xs text-gray-500">View →</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
