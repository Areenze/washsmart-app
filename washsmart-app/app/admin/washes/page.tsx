"use client";

/* /admin/washes — every redeemed wash across the network. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/db/store";
import { adminListWashes, ngn, type AdminWashRow } from "@/lib/db/admin";

export default function AdminWashesPage() {
  const [rows, setRows] = useState<AdminWashRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await adminListWashes(q, 150));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Washes</h1>
          <p className="mt-1 text-gray-400">Every redeemed credit — who washed where.</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-2 pl-4 pr-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search subscriber, partner, ID…"
            className="w-56 bg-transparent text-sm outline-none placeholder:text-gray-500"
          />
          <button type="submit" className="rounded-full bg-[#20a957] px-4 py-1.5 text-xs font-bold text-white">
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <p className="mt-6 text-gray-400">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon="🚗" title="No washes found" body="Redeemed washes will appear here." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl bg-[#111a14] shadow-sm">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-widest text-gray-500">
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Subscriber</th>
                <th className="px-5 py-4">Partner</th>
                <th className="px-5 py-4">Service</th>
                <th className="px-5 py-4 text-right">Payout</th>
                <th className="px-5 py-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-4 font-mono text-xs text-gray-500">
                    {r.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-5 py-4">
                    <Link href={`/admin/subscribers/${r.subscriberId}`} className="font-bold text-[#48d87c]">
                      {r.subscriberName}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <Link href={`/admin/partners/${r.partnerId}`} className="font-bold text-[#48d87c]">
                      {r.partnerName}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-gray-300">{r.type}</td>
                  <td className="px-5 py-4 text-right">{ngn(r.payout)}</td>
                  <td className="px-5 py-4 text-gray-400">{fmtDate(r.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
