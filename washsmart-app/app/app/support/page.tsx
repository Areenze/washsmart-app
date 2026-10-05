"use client";

/* /app/support — my support tickets. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { currentUserId } from "@/lib/db/store";
import { listMyTickets, categoryLabel, type Ticket } from "@/lib/db/support";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-yellow-500/15 text-yellow-400",
  investigating: "bg-blue-500/15 text-blue-400",
  resolved: "bg-green-500/15 text-green-400",
  closed: "bg-white/10 text-gray-400",
};

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);

  useEffect(() => {
    (async () => {
      const uid = await currentUserId().catch(() => null);
      if (!uid) {
        setTickets([]);
        return;
      }
      setTickets(await listMyTickets(uid).catch(() => []));
    })();
  }, []);

  if (tickets === null) return <p className="px-5 py-8 text-gray-400">Loading…</p>;

  return (
    <section className="mx-auto max-w-2xl px-5 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Support</h1>
        <Link
          href="/app/support/new"
          className="rounded-full bg-[#34d186] px-5 py-2 text-sm font-bold text-white"
        >
          New report
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="🎧"
            title="No reports yet"
            body="If a wash goes wrong or something looks off with your account, report it here and our team will look into it."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/app/support/${t.id}`}
              className="block rounded-2xl bg-[#111a14] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold">{t.subject}</p>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    STATUS_STYLE[t.status] ?? ""
                  }`}
                >
                  {t.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-400">
                {categoryLabel(t.category)}
                {t.partnerName ? ` · ${t.partnerName}` : ""} ·{" "}
                {new Date(t.createdAt).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
