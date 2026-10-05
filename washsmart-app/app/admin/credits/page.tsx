"use client";

/* /admin/credits — the credit ledger: issued / redeemed / remaining / expired. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/db/store";
import { adminCreditOverview, type CreditOverview } from "@/lib/db/admin";

const tone = (s: string) =>
  s === "active" ? "green" : s === "expired" ? "amber" : "gray";

export default function AdminCreditsPage() {
  const [data, setData] = useState<CreditOverview | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setData(await adminCreditOverview());
      } catch {
        setData(null);
      }
    })();
  }, []);

  if (data === null) return <p className="text-gray-400">Loading…</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold">Wash Credits</h1>
      <p className="mt-1 text-gray-400">
        Where every credit came from — and where it went.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Credits issued", value: String(data.issued) },
          { label: "Credits redeemed", value: String(data.redeemed) },
          { label: "Credits remaining", value: String(data.remaining) },
          { label: "Credits expired", value: String(data.expired) },
        ].map((c) => (
          <div key={c.label} className="rounded-3xl bg-[#111a14] p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{c.label}</p>
            <p className="mt-2 text-3xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-widest text-gray-500">
        Credit ledger by subscription
      </h2>
      {data.rows.length === 0 ? (
        <EmptyState icon="🎟️" title="No credits yet" body="Issued credits will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-[#111a14] shadow-sm">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-widest text-gray-500">
                <th className="px-5 py-4">Subscriber</th>
                <th className="px-5 py-4">Plan</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Issued</th>
                <th className="px-5 py-4 text-right">Redeemed</th>
                <th className="px-5 py-4 text-right">Remaining</th>
                <th className="px-5 py-4">Renews</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-4">
                    <Link href={`/admin/subscribers/${r.subscriberId}`} className="font-bold text-[#66dca4]">
                      {r.subscriberName}
                    </Link>
                  </td>
                  <td className="px-5 py-4">{r.planName}</td>
                  <td className="px-5 py-4">
                    <Badge tone={tone(r.status) as "green" | "amber" | "gray"}>
                      {r.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">{r.issued}</td>
                  <td className="px-5 py-4 text-right text-gray-400">{r.redeemed}</td>
                  <td className="px-5 py-4 text-right font-bold">{r.remaining}</td>
                  <td className="px-5 py-4 text-gray-400">{r.renewsAt ? fmtDate(r.renewsAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
