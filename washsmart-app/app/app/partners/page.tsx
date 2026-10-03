"use client";

/* /app/partners — partner finder (list + map placeholder).
 * Accepts ?q= to pre-filter by name or area (used by the landing hero
 * "Find a wash" search pill). */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PartnerCard from "@/components/partner-card";
import { EmptyState, Reveal } from "@/components/ui";
import { listApprovedPartners } from "@/lib/db/store";
import type { Partner } from "@/lib/db/types";

export default function PartnersPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-7xl px-5 py-8">
          <p className="text-gray-400">Loading…</p>
        </section>
      }
    >
      <PartnersInner />
    </Suspense>
  );
}

function PartnersInner() {
  const search = useSearchParams();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [q, setQ] = useState(search.get("q") ?? "");

  useEffect(() => {
    (async () => setPartners(await listApprovedPartners()))();
  }, []);

  const query = q.trim().toLowerCase();
  const filtered = query
    ? partners.filter((p) =>
        `${p.name} ${p.location}`.toLowerCase().includes(query)
      )
    : partners;

  return (
    <section className="mx-auto max-w-7xl px-5 py-8">
      <Link
        href="/app"
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back
      </Link>
      <h1 className="text-3xl font-bold">Find a WashSMART Partner</h1>
      <p className="mt-2 text-gray-400">
        Choose an approved car-wash center near you.
      </p>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="mt-6 flex max-w-xl items-center gap-2 rounded-full border border-white/10 bg-white/5 py-2 pl-5 pr-2"
      >
        <span aria-hidden className="text-lg">📍</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by area or partner name…"
          aria-label="Search partners by area or name"
          className="w-full bg-transparent py-1.5 text-sm text-[#e9f2ec] outline-none placeholder:text-gray-500"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-gray-300 transition-colors hover:bg-white/15"
          >
            Clear
          </button>
        )}
      </form>

      <div className="mt-6 rounded-3xl bg-[#20a957]/15 p-6">
        <div className="flex h-56 items-center justify-center rounded-2xl bg-[#152419] md:h-72">
          <div className="text-center">
            <div className="text-5xl">📍</div>
            <p className="mt-2 font-bold">WashSMART Partner Map</p>
            <p className="text-sm text-gray-300">
              {partners.length} approved partner{partners.length === 1 ? "" : "s"} near you ·
              live Google Maps integration in production.
            </p>
          </div>
        </div>
      </div>

      {query && (
        <p className="mt-6 text-sm text-gray-400">
          <span className="font-bold text-[#e9f2ec]">{filtered.length}</span>{" "}
          result{filtered.length === 1 ? "" : "s"} for{" "}
          <span className="font-bold text-[#e9f2ec]">“{q.trim()}”</span>
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="📍"
            title={query ? "No partners match your search" : "No partners yet"}
            body={
              query
                ? "Try a different area or partner name — new partners join regularly."
                : "Newly approved partners will appear here automatically."
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {filtered.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i, 5) * 75}>
              <PartnerCard partner={p} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}
