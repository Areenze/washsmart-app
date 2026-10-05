"use client";

/* /admin/partners — the partner network: status, washes, earnings, rating. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { adminListPartners, ngn, type AdminPartnerRow } from "@/lib/db/admin";

const tone = (s: string) =>
  s === "approved" ? "green" : s === "suspended" ? "red" : "amber";

export default function AdminPartnersPage() {
  const [rows, setRows] = useState<AdminPartnerRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await adminListPartners(q, status));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Partners</h1>
          <p className="mt-1 text-gray-400">
            {rows.length} partner{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-2">
            {(["all", "approved", "pending", "suspended"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatus(f)}
                className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${
                  status === f
                    ? "bg-[#20a957] text-white"
                    : "bg-[#111a14] text-gray-400"
                }`}
              >
                {f}
              </button>
            ))}
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
              placeholder="Search name or area…"
              className="w-44 bg-transparent text-sm outline-none placeholder:text-gray-500"
            />
            <button
              type="submit"
              className="rounded-full bg-[#20a957] px-4 py-1.5 text-xs font-bold text-white"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-gray-400">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon="🏪" title="No partners found" body="Try a different search or filter." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl bg-[#111a14] shadow-sm">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-widest text-gray-500">
                <th className="px-5 py-4">Partner</th>
                <th className="px-5 py-4">Location</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Washes</th>
                <th className="px-5 py-4 text-right">Earnings</th>
                <th className="px-5 py-4 text-right">Rating</th>
                <th className="px-5 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-4">
                    <p className="font-bold">{r.name}</p>
                    <p className="text-xs text-gray-500">{r.phone}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-300">{r.area}</td>
                  <td className="px-5 py-4">
                    <Badge tone={tone(r.status) as "green" | "amber" | "red"}>
                      {r.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right font-bold">{r.washes}</td>
                  <td className="px-5 py-4 text-right">{ngn(r.earnings)}</td>
                  <td className="px-5 py-4 text-right">
                    ⭐ {r.rating.toFixed(1)}{" "}
                    <span className="text-xs text-gray-500">({r.reviewCount})</span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/admin/partners/${r.id}`} className="font-bold text-[#48d87c]">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
