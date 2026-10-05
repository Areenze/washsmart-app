"use client";

/* /app/support/new — file a support ticket. Prefills from a wash when
 * opened with ?wash=<id>. */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { currentUserId } from "@/lib/db/store";
import { getSupabase } from "@/lib/db/supabase";
import { createTicket, TICKET_CATEGORIES } from "@/lib/db/support";

interface WashInfo {
  id: string;
  partnerId: string;
  partnerName: string;
  at: string;
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={<p className="px-5 py-8 text-gray-400">Loading…</p>}>
      <NewTicketForm />
    </Suspense>
  );
}

function NewTicketForm() {
  const params = useSearchParams();
  const router = useRouter();
  const [wash, setWash] = useState<WashInfo | null>(null);
  const [category, setCategory] = useState("wash_quality");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const washId = params.get("wash");
    if (!washId) return;
    (async () => {
      const { data } = await getSupabase()
        .from("wash_transactions")
        .select("id,partner_id,redeemed_at,partner:partners(name)")
        .eq("id", washId)
        .maybeSingle();
      if (data) {
        setWash({
          id: (data as any).id,
          partnerId: (data as any).partner_id,
          partnerName: (data as any).partner?.name ?? "Unknown partner",
          at: (data as any).redeemed_at,
        });
      }
    })();
  }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!subject.trim()) {
      setError("Give your report a short subject.");
      return;
    }
    const uid = await currentUserId().catch(() => null);
    if (!uid) {
      router.push("/app/login?next=/app/support/new");
      return;
    }
    setBusy(true);
    try {
      const t = await createTicket({
        subscriberId: uid,
        partnerId: wash?.partnerId ?? null,
        washId: wash?.id ?? null,
        category,
        subject,
        description,
      });
      router.push(`/app/support/${t.id}`);
    } catch (err: any) {
      setError(err?.message ?? "Could not send your report. Try again.");
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl px-5 py-8">
      <Link
        href="/app/support"
        className="mb-5 inline-block text-sm font-semibold text-[#66dca4]"
      >
        ← Back
      </Link>
      <h1 className="text-3xl font-bold">Report a problem</h1>
      {wash && (
        <p className="mt-2 text-sm text-gray-400">
          About your wash at <span className="font-bold text-white">{wash.partnerName}</span>{" "}
          on {new Date(wash.at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
        </p>
      )}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-bold" htmlFor="cat">
            What happened?
          </label>
          <select
            id="cat"
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
          <label className="mb-1 block text-sm font-bold" htmlFor="subj">
            Subject
          </label>
          <input
            id="subj"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Partner refused to redeem my QR"
            className="w-full rounded-xl border border-white/10 bg-[#111a14] px-4 py-3"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold" htmlFor="desc">
            Details
          </label>
          <textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Tell us what happened, when, and who was involved…"
            className="w-full rounded-xl border border-white/10 bg-[#111a14] px-4 py-3"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-[#34d186] py-3 font-bold text-white transition-all duration-200 hover:bg-[#27ab6c] disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send report"}
        </button>
      </form>
    </section>
  );
}
