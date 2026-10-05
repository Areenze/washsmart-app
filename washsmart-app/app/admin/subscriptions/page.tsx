"use client";

/* /admin/subscriptions — every subscription by status. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/db/store";
import {
  adminListSubscriptions,
  ngn,
  type AdminSubscriptionRow,
} from "@/lib/db/admin";

const tone = (s: string) =>
  s === "active" ? "green" : s === "expired" ? "amber" : "gray";

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<AdminSubscriptionRow[]>([]);
  const [status, setStatus] = useState("active");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setRows(await adminListSubscriptions(status));
      } finally {
        setLoading(false);
      }
    })();
  }, [status]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <p className="mt-1 text-gray-400">
            {rows.length} {status} subscription{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          {(["active", "expired", "cancelled", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${
                status === f ? "bg-[#34d186] text-white" : "bg-[#111a14] text-gray-400"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-gray-400">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon="🎟️" title={`No ${status} subscriptions`} body="Subscriptions will appear here." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl bg-[#111a14] shadow-sm">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-widest text-gray-500">
                <th className="px-5 py-4">Subscriber</th>
                <th className="px-5 py-4">Plan</th>
                <th className="px-5 py-4 text-right">Amount</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Credits</th>
                <th className="px-5 py-4">Started</th>
                <th className="px-5 py-4">Renews</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-4">
                    <Link href={`/admin/subscribers/${r.subscriberId}`} className="font-bold text-[#66dca4]">
                      {r.subscriberName}
                    </Link>
                  </td>
                  <td className="px-5 py-4">{r.planName}</td>
                  <td className="px-5 py-4 text-right">{ngn(r.amount)}</td>
                  <td className="px-5 py-4">
                    <Badge tone={tone(r.status) as "green" | "amber" | "gray"}>
                      {r.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {r.washesRemaining}<span className="text-gray-500">/{r.washesTotal}</span>
                  </td>
                  <td className="px-5 py-4 text-gray-400">{fmtDate(r.startedAt)}</td>
                  <td className="px-5 py-4 text-gray-400">{fmtDate(r.renewsAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
