"use client";

/* /admin/support — ticket queue. */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  adminListTickets,
  categoryLabel,
  TICKET_STATUSES,
  type Ticket,
} from "@/lib/db/support";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-yellow-500/15 text-yellow-400",
  investigating: "bg-blue-500/15 text-blue-400",
  resolved: "bg-green-500/15 text-green-400",
  closed: "bg-white/10 text-gray-400",
};

const PRIO_STYLE: Record<string, string> = {
  high: "bg-red-500/15 text-red-400",
  normal: "bg-white/10 text-gray-400",
  low: "bg-white/5 text-gray-500",
};

export default function AdminSupportPage() {
  const [filter, setFilter] = useState("all");
  const [tickets, setTickets] = useState<Ticket[] | null>(null);

  useEffect(() => {
    setTickets(null);
    (async () =>
      setTickets(await adminListTickets(filter).catch(() => [])))();
  }, [filter]);

  return (
    <section>
      <h1 className="text-2xl font-bold">Support tickets</h1>
      <p className="mt-1 text-sm text-gray-400">
        Complaints and reports from subscribers. Resolve them here.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {["all", ...TICKET_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold capitalize ${
              filter === s
                ? "bg-[#20a957] text-white"
                : "bg-[#111a14] text-gray-400"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {tickets === null ? (
        <p className="mt-6 text-gray-400">Loading…</p>
      ) : tickets.length === 0 ? (
        <p className="mt-6 text-gray-400">No tickets in this state.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl bg-[#111a14]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Subscriber</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Opened</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/support/${t.id}`}
                      className="font-bold text-[#48d87c] hover:underline"
                    >
                      {t.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    <Link
                      href={`/admin/subscribers/${t.subscriberId}`}
                      className="hover:underline"
                    >
                      {t.subscriberName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {categoryLabel(t.category)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_STYLE[t.status]}`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PRIO_STYLE[t.priority]}`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(t.createdAt).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
