"use client";

/* /app/partners — partner finder (list + map placeholder). */

import { useEffect, useState } from "react";
import Link from "next/link";
import PartnerCard from "@/components/partner-card";
import { EmptyState } from "@/components/ui";
import { listApprovedPartners } from "@/lib/db/store";
import type { Partner } from "@/lib/db/types";

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    (async () => setPartners(await listApprovedPartners()))();
  }, []);

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

      {partners.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="📍"
            title="No partners yet"
            body="Newly approved partners will appear here automatically."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {partners.map((p) => (
            <PartnerCard key={p.id} partner={p} />
          ))}
        </div>
      )}
    </section>
  );
}
