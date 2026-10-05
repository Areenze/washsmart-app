"use client";

/* /app/support/[id] — my ticket detail. */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { currentUserId } from "@/lib/db/store";
import { getTicket, categoryLabel, type Ticket } from "@/lib/db/support";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-yellow-500/15 text-yellow-400",
  investigating: "bg-blue-500/15 text-blue-400",
  resolved: "bg-green-500/15 text-green-400",
  closed: "bg-white/10 text-gray-400",
};

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    (async () => {
      const uid = await currentUserId().catch(() => null);
      if (!uid) {
        setDenied(true);
        return;
      }
      const t = await getTicket(id).catch(() => null);
      if (!t || t.subscriberId !== uid) setDenied(true);
      else setTicket(t);
    })();
  }, [id]);

  if (denied)
    return (
      <section className="mx-auto max-w-2xl px-5 py-8">
        <p className="text-gray-400">This report isn&apos;t available.</p>
      </section>
    );
  if (!ticket) return <p className="px-5 py-8 text-gray-400">Loading…</p>;

  return (
    <section className="mx-auto max-w-2xl px-5 py-8">
      <Link
        href="/app/support"
        className="mb-5 inline-block text-sm font-semibold text-[#66dca4]"
      >
        ← Back
      </Link>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{ticket.subject}</h1>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
            STATUS_STYLE[ticket.status] ?? ""
          }`}
        >
          {ticket.status}
        </span>
      </div>
      <p className="mt-2 text-sm text-gray-400">
        {categoryLabel(ticket.category)}
        {ticket.partnerName ? ` · ${ticket.partnerName}` : ""}
      </p>
      <div className="mt-6 rounded-2xl bg-[#111a14] p-5">
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {ticket.description || "No details provided."}
        </p>
      </div>
      <p className="mt-4 text-xs text-gray-500">
        Reported {new Date(ticket.createdAt).toLocaleString("en-NG")}.
        {ticket.resolvedAt &&
          ` Resolved ${new Date(ticket.resolvedAt).toLocaleString("en-NG")}.`}
      </p>
    </section>
  );
}
