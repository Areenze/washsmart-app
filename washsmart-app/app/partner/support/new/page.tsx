"use client";

/* /partner/support/new — partner files a support ticket. */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { currentPartnerSession, currentUserId } from "@/lib/db/store";
import { createTicket, TICKET_CATEGORIES } from "@/lib/db/support";

export default function NewPartnerTicketPage() {
  const router = useRouter();
  const [partnerId, setPartnerId] = useState("");
  const [category, setCategory] = useState("qr_problem");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await currentPartnerSession();
      if (p) setPartnerId(p.id);
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!subject.trim()) {
      setError("Please give the issue a short subject.");
      return;
    }
    setBusy(true);
    try {
      const uid = await currentUserId();
      if (!uid || !partnerId) throw new Error("Session expired. Please sign in again.");
      await createTicket({
        subscriberId: uid,
        partnerId,
        category,
        subject,
        description,
      });
      router.push("/partner/support");
    } catch (err: any) {
      setError(err.message ?? "Could not file the ticket.");
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl py-8">
      <Link
        href="/partner/support"
        className="mb-5 inline-block text-sm font-semibold text-[#2dd4bf]"
      >
        ← Back
      </Link>
      <h1 className="text-3xl font-bold">Contact WashSMART</h1>
      <p className="mt-2 text-gray-400">
        Report a redemption, payout or technical problem — the WashSMART team
        will pick it up.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="pcat">
            Issue type
          </label>
          <select
            id="pcat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#111a14] px-4 py-3"
          >
            {TICKET_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="psubj">
            Subject
          </label>
          <input
            id="psubj"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Subscriber QR wouldn't scan"
            className="w-full rounded-xl border border-white/10 bg-[#111a14] px-4 py-3"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="pdesc">
            Details
          </label>
          <textarea
            id="pdesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="What happened, when, and which subscriber if relevant…"
            className="w-full rounded-xl border border-white/10 bg-[#111a14] px-4 py-3"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[#14b8a6] py-4 font-bold text-white disabled:opacity-60"
        >
          {busy ? "Filing…" : "File Ticket"}
        </button>
      </form>
    </section>
  );
}
