"use client";

/* /partner/support — the partner's own support tickets. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { currentPartnerSession } from "@/lib/db/store";
import {
  categoryLabel,
  listMyTickets,
  type Ticket,
} from "@/lib/db/support";
import { currentUserId } from "@/lib/db/store";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-300",
  investigating: "bg-blue-500/15 text-blue-300",
  resolved: "bg-[#34d186]/15 text-[#66dca4]",
  closed: "bg-gray-500/15 text-gray-400",
};

export default function PartnerSupportPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);

  useEffect(() => {
    (async () => {
      const [p, uid] = await Promise.all([
        currentPartnerSession(),
        currentUserId().catch(() => null),
      ]);
      if (!p || !uid) {
        setTickets([]);
        return;
      }
      const all = await listMyTickets(uid).catch(() => []);
      // Only tickets this partner filed for their own car wash.
      setTickets(all.filter((t) => t.partnerId === p.id));
    })();
  }, []);

  return (
    <section className="mx-auto max-w-3xl py-8">
      <Link
        href="/partner/dashboard"
        className="mb-5 inline-block text-sm font-semibold text-[#66dca4]"
      >
        ← Back
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Support</h1>
          <p className="mt-2 text-gray-400">
            Tickets you filed with the WashSMART team.
          </p>
        </div>
        <Link
          href="/partner/support/new"
          className="rounded-full bg-[#40d48d] px-5 py-2.5 font-bold text-white"
        >
          + New Ticket
        </Link>
      </div>

      {tickets === null ? (
        <p className="mt-6 text-gray-400">Loading…</p>
      ) : tickets.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-[#111a14] p-8 text-center">
          <p className="font-bold">No tickets yet</p>
          <p className="mt-2 text-sm text-gray-400">
            Redemption problems, payout questions, technical issues — file them
            here and we'll respond.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="rounded-2xl bg-[#111a14] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">{t.subject}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {categoryLabel(t.category)} ·{" "}
                    {new Date(t.createdAt).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    STATUS_STYLE[t.status] ?? STATUS_STYLE.open
                  }`}
                >
                  {t.status}
                </span>
              </div>
              {t.description && (
                <p className="mt-2 text-sm text-gray-300">{t.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
