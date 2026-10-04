"use client";

/* /partner/dashboard — TODAY washes, estimated earnings, subscribers
 * served, [SCAN CUSTOMER QR], recent activity. */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  currentPartnerSession,
  fmtDate,
  fmtNaira,
  getPendingSettlement,
  listPartnerTransactions,
  partnerStats,
  type PartnerStats,
} from "@/lib/db/store";
import type { Partner, WashTransaction } from "@/lib/db/types";

export default function PartnerDashboard() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [recent, setRecent] = useState<WashTransaction[]>([]);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    (async () => {
      const p = await currentPartnerSession();
      if (!p) return;
      setPartner(p);
      setStats(await partnerStats(p.id));
      setRecent((await listPartnerTransactions(p.id)).slice(0, 5));
      setPending(await getPendingSettlement(p.id).then((s) => s?.payable ?? 0).catch(() => 0));
    })();
  }, []);

  if (!partner || !stats) {
    return <p className="py-8 text-gray-400">Loading…</p>;
  }

  const cards: { label: string; value: string; accent?: boolean }[] = [
    { label: "Today's washes", value: String(stats.todayWashes) },
    { label: "Today's earnings", value: fmtNaira(stats.todayEarnings), accent: true },
    { label: "This month's washes", value: String(stats.monthWashes) },
    { label: "This month's earnings", value: fmtNaira(stats.monthEarnings), accent: true },
    { label: "Pending settlement", value: fmtNaira(pending), accent: true },
    { label: "Total washes", value: String(stats.totalWashes) },
  ];

  return (
    <section className="py-8">
      <p className="text-sm text-gray-400">APPROVED PARTNER</p>
      <h1 className="mt-1 text-3xl font-bold">Welcome, {partner.name}</h1>
      <p className="text-gray-400">{partner.location}</p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-[#0c3a38] p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
              {c.label}
            </p>
            <p className={`mt-1 text-2xl font-bold ${c.accent ? "text-[#5eead4]" : ""}`}>
              {c.value}
            </p>
          </div>
        ))}
      </div>
      <Link
        href="/partner/scan"
        className="mt-4 block w-full rounded-xl bg-[#14b8a6] py-4 text-center text-lg font-bold text-white"
      >
        📷 SCAN CUSTOMER QR
      </Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <div className="rounded-2xl bg-[#111a14] p-6">
          <h2 className="text-xl font-bold">All-time totals</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#0a0f0c] p-4">
              <p className="text-sm text-gray-400">Total washes</p>
              <p className="mt-1 text-2xl font-bold">{stats.totalWashes}</p>
            </div>
            <div className="rounded-xl bg-[#0a0f0c] p-4">
              <p className="text-sm text-gray-400">Total earnings</p>
              <p className="mt-1 text-2xl font-bold text-[#2dd4bf]">
                {fmtNaira(stats.totalEarnings)}
              </p>
            </div>
          </div>
          <Link
            href="/partner/earnings"
            className="mt-4 inline-block text-sm font-semibold text-[#2dd4bf]"
          >
            View earnings →
          </Link>
        </div>

        <div className="rounded-2xl bg-[#111a14] p-6">
          <h2 className="text-xl font-bold">Recent activity</h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-gray-400">
              No washes recorded yet — scan your first customer QR above.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {recent.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 border-b pb-3 last:border-0"
                >
                  <div className="h-3 w-3 shrink-0 rounded-full bg-[#14b8a6]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      Wash confirmed — {t.subscriberName}
                    </p>
                    <p className="text-xs text-gray-500">{fmtDate(t.at)}</p>
                  </div>
                  <span className="text-sm font-bold text-[#2dd4bf]">
                    {fmtNaira(t.payout)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
