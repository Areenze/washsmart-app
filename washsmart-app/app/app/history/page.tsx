"use client";

/* /app/history — subscriber wash history. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState, SectionTitle } from "@/components/ui";
import { fmtDate, listWashHistory } from "@/lib/db/store";
import type { WashTransaction } from "@/lib/db/types";

export default function HistoryPage() {
  const [history, setHistory] = useState<WashTransaction[]>([]);

  useEffect(() => {
    (async () => setHistory(await listWashHistory()))();
  }, []);

  return (
    <section className="mx-auto max-w-3xl px-5 py-8">
      <Link
        href="/app"
        className="mb-5 inline-block text-sm font-semibold text-[#66dca4]"
      >
        ← Back
      </Link>
      <SectionTitle>Wash History</SectionTitle>

      {history.length === 0 ? (
        <EmptyState
          icon="🚿"
          title="No washes yet"
          body="Every wash redeemed with your subscription will appear here."
          action={
            <Link
              href="/app/partners"
              className="inline-block rounded-full bg-[#34d186] px-6 py-3 transition-all duration-200 hover:bg-[#27ab6c] font-bold text-white"
            >
              Find a Partner
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-[#111a14] shadow-sm">
          {history.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between border-b p-5 last:border-0"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#34d186]/10 text-xl">
                  🚗
                </div>
                <div>
                  <p className="font-bold">{w.partnerName}</p>
                  <p className="text-sm text-gray-400">{w.location}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">{w.type}</p>
                <p className="text-xs text-gray-500">{fmtDate(w.at)}</p>
                <Link
                  href={`/app/support/new?wash=${w.id}`}
                  className="mt-1 inline-block text-xs font-bold text-[#66dca4]"
                >
                  Report a problem
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
