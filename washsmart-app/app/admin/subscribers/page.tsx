"use client";

/* /admin/subscribers — every subscriber with plan, credits, renewal. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/db/store";
import {
  adminListSubscribers,
  type AdminSubscriberRow,
} from "@/lib/db/admin";

const tone = (s: string | null) =>
  s === "active" ? "green" : s === "expired" ? "amber" : "gray";

export default function AdminSubscribersPage() {
  const [rows, setRows] = useState<AdminSubscriberRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (query: string) => {
    setLoading(true);
    try {
      setRows(await adminListSubscribers(query));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Subscribers</h1>
          <p className="mt-1 text-gray-400">
            {rows.length} subscriber{rows.length === 1 ? "" : "s"}
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(q);
          }}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-2 pl-4 pr-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone…"
            className="w-56 bg-transparent text-sm outline-none placeholder:text-gray-500"
          />
          <button
            type="submit"
            className="rounded-full bg-[#20a957] px-4 py-1.5 text-xs font-bold text-white"
          >
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <p className="mt-6 text-gray-400">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon="👥" title="No subscribers found" body="Try a different search." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl bg-[#111a14] shadow-sm">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-widest text-gray-500">
                <th className="px-5 py-4">Subscriber</th>
                <th className="px-5 py-4">Phone</th>
                <th className="px-5 py-4">Plan</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Credits</th>
                <th className="px-5 py-4 text-right">Used</th>
                <th className="px-5 py-4">Renewal</th>
                <th className="px-5 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-4">
                    <p className="font-bold">
                      {r.name}
                      {r.isAdmin && (
                        <span className="ml-2 rounded-full bg-[#f5b301]/15 px-2 py-0.5 text-[10px] font-bold text-[#f5b301]">
                          STAFF
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{r.email}</p>
                  </td>
                  <td className="px-5 py-4 text-gray-300">{r.phone}</td>
                  <td className="px-5 py-4">{r.planName ?? "—"}</td>
                  <td className="px-5 py-4">
                    {r.planStatus ? (
                      <Badge tone={tone(r.planStatus) as "green" | "amber" | "gray"}>
                        {r.planStatus.toUpperCase()}
                      </Badge>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right font-bold">{r.washesRemaining}</td>
                  <td className="px-5 py-4 text-right text-gray-400">
                    {r.washesTotal - r.washesRemaining}
                  </td>
                  <td className="px-5 py-4 text-gray-400">
                    {r.renewsAt ? fmtDate(r.renewsAt) : "—"}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/subscribers/${r.id}`}
                      className="font-bold text-[#48d87c]"
                    >
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
