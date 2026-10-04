"use client";

/* /admin/payments — every payment with provider references. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/db/store";
import { adminListPayments, ngn, type AdminPaymentRow } from "@/lib/db/admin";

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<AdminPaymentRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await adminListPayments(q, 150));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = rows.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="mt-1 text-gray-400">
            {rows.length} payment{rows.length === 1 ? "" : "s"} · {ngn(total)} total
          </p>
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
            placeholder="Search name, reference, plan…"
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
          <EmptyState icon="💳" title="No payments found" body="Completed payments will appear here." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl bg-[#111a14] shadow-sm">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-widest text-gray-500">
                <th className="px-5 py-4">Subscriber</th>
                <th className="px-5 py-4 text-right">Amount</th>
                <th className="px-5 py-4">Plan</th>
                <th className="px-5 py-4">Method</th>
                <th className="px-5 py-4">Reference</th>
                <th className="px-5 py-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-4">
                    <Link href={`/admin/subscribers/${r.subscriberId}`} className="font-bold text-[#48d87c]">
                      {r.subscriberName}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-right font-bold">{ngn(r.amount)}</td>
                  <td className="px-5 py-4">{r.planName}</td>
                  <td className="px-5 py-4 text-gray-300">{r.method}</td>
                  <td className="px-5 py-4 font-mono text-xs text-gray-500">{r.reference}</td>
                  <td className="px-5 py-4 text-gray-400">{fmtDate(r.paidAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
