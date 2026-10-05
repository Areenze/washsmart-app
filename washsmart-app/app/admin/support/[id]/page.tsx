"use client";

/* /admin/support/[id] — ticket detail: linked records, status, priority,
 * internal notes. All changes are audit-logged. */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ui";
import {
  adminUpdateTicket,
  categoryLabel,
  getTicket,
  type Ticket,
} from "@/lib/db/support";

const STATUSES = ["open", "investigating", "resolved", "closed"];

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  const load = async () => {
    const t = await getTicket(id).catch(() => null);
    setTicket(t);
    setNotes(t?.internalNotes ?? "");
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setStatus = async (status: string) => {
    setPendingStatus(status);
  };

  const runSetStatus = async () => {
    if (!pendingStatus) return;
    setSaving(true);
    try {
      await adminUpdateTicket(id, { status: pendingStatus });
      setPendingStatus(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const setPriority = async (priority: string) => {
    setSaving(true);
    try {
      await adminUpdateTicket(id, { priority });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      await adminUpdateTicket(id, { internalNotes: notes });
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (!ticket) return <p className="text-gray-400">Loading…</p>;

  return (
    <section className="max-w-3xl">
      <Link
        href="/admin/support"
        className="mb-5 inline-block text-sm font-semibold text-[#66dca4]"
      >
        ← Tickets
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{ticket.subject}</h1>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
          {categoryLabel(ticket.category)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#111a14] p-4">
          <p className="text-xs uppercase text-gray-500">Subscriber</p>
          <Link
            href={`/admin/subscribers/${ticket.subscriberId}`}
            className="font-bold text-[#66dca4] hover:underline"
          >
            {ticket.subscriberName}
          </Link>
        </div>
        <div className="rounded-2xl bg-[#111a14] p-4">
          <p className="text-xs uppercase text-gray-500">Partner</p>
          {ticket.partnerId ? (
            <Link
              href={`/admin/partners/${ticket.partnerId}`}
              className="font-bold text-[#66dca4] hover:underline"
            >
              {ticket.partnerName ?? ticket.partnerId}
            </Link>
          ) : (
            <p className="text-gray-500">—</p>
          )}
        </div>
        <div className="rounded-2xl bg-[#111a14] p-4">
          <p className="text-xs uppercase text-gray-500">Opened</p>
          <p className="font-bold">
            {new Date(ticket.createdAt).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-[#111a14] p-5">
        <p className="text-xs uppercase text-gray-500">Subscriber&apos;s report</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
          {ticket.description || "No details provided."}
        </p>
      </div>

      <div className="mt-4 rounded-2xl bg-[#111a14] p-5">
        <p className="text-xs uppercase text-gray-500">Workflow</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              disabled={saving || ticket.status === s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold capitalize disabled:opacity-40 ${
                ticket.status === s
                  ? "bg-[#34d186] text-white"
                  : "bg-white/5 text-gray-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-gray-400">Priority:</span>
          {["low", "normal", "high"].map((p) => (
            <button
              key={p}
              disabled={saving || ticket.priority === p}
              onClick={() => setPriority(p)}
              className={`rounded-full px-3 py-1 text-xs font-bold capitalize disabled:opacity-40 ${
                ticket.priority === p
                  ? p === "high"
                    ? "bg-red-500/20 text-red-400"
                    : "bg-white/10 text-white"
                  : "bg-white/5 text-gray-400"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-[#111a14] p-5">
        <p className="text-xs uppercase text-gray-500">
          Internal notes <span className="normal-case">(never shown to the subscriber)</span>
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#0a0f0c] px-4 py-3 text-sm"
          placeholder="What did we find? What did we do about it?"
        />
        <button
          onClick={saveNotes}
          disabled={saving}
          className="mt-2 rounded-full bg-[#34d186] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          Save notes
        </button>
      </div>

      <ConfirmDialog
        open={pendingStatus !== null}
        title={`Move to "${pendingStatus}"?`}
        body="The subscriber sees the new status on their report."
        confirmLabel="Move"
        onConfirm={runSetStatus}
        onCancel={() => setPendingStatus(null)}
      />
    </section>
  );
}
