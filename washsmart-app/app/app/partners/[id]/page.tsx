"use client";

/* /app/partners/[id] — partner detail. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, EmptyState } from "@/components/ui";
import { getPartner } from "@/lib/db/store";
import type { Partner } from "@/lib/db/types";

export default function PartnerDetailPage() {
  const params = useParams<{ id: string }>();
  const [partner, setPartner] = useState<Partner | null | undefined>(undefined);

  useEffect(() => {
    (async () => setPartner((await getPartner(params.id)) ?? null))();
  }, [params.id]);

  if (partner === undefined) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-8">
        <p className="text-gray-500">Loading…</p>
      </section>
    );
  }

  if (partner === null) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-8">
        <EmptyState
          icon="🔍"
          title="Partner not found"
          body="This partner doesn't exist or isn't approved yet."
          action={
            <Link
              href="/app/partners"
              className="inline-block rounded-xl bg-[#20a957] px-6 py-3 font-bold text-white"
            >
              Back to Partners
            </Link>
          }
        />
      </section>
    );
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    partner.name + " " + partner.location
  )}`;

  return (
    <section className="mx-auto max-w-3xl px-5 py-8">
      <Link
        href="/app/partners"
        className="mb-5 inline-block text-sm font-semibold text-[#168846]"
      >
        ← Back
      </Link>

      <div className="rounded-3xl bg-white p-7 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{partner.name}</h1>
            <p className="mt-1 text-gray-500">{partner.location}</p>
          </div>
          <Badge>Approved</Badge>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span>
            ⭐ {partner.rating.toFixed(1)}{" "}
            <span className="text-gray-400">({partner.reviews} reviews)</span>
          </span>
          <span>{partner.distance} away</span>
          <span
            className={
              partner.status === "Open"
                ? "font-semibold text-green-600"
                : "text-gray-400"
            }
          >
            {partner.status}
          </span>
        </div>

        <div className="mt-6 space-y-3 border-t pt-6 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Opening hours</span>
            <span className="font-semibold">{partner.hours}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Phone</span>
            <a
              href={`tel:${partner.phone.replace(/\s/g, "")}`}
              className="font-semibold text-[#168846]"
            >
              {partner.phone}
            </a>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Address</span>
            <span className="text-right font-semibold">{partner.address}</span>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-sm font-bold text-gray-500">SERVICES</p>
          <div className="flex flex-wrap gap-2">
            {partner.services.map((s) => (
              <span
                key={s}
                className="rounded-full bg-[#edf8f1] px-3 py-1.5 text-sm font-semibold text-[#168846]"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {partner.status === "Open" ? (
            <Link
              href={`/app/scan?partner=${partner.id}`}
              className="flex-1 rounded-xl bg-[#20a957] py-3 text-center font-bold text-white"
            >
              Scan & Wash Here
            </Link>
          ) : (
            <span className="flex-1 cursor-not-allowed rounded-xl bg-gray-300 py-3 text-center font-bold text-white">
              Currently Closed
            </span>
          )}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-xl border border-[#20a957] py-3 text-center font-bold text-[#168846]"
          >
            Get Directions
          </a>
        </div>
      </div>
    </section>
  );
}
