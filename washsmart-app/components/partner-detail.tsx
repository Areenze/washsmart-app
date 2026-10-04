"use client";

/* PartnerDetail — the full public partner detail (info, services, photos,
 * reviews). Rendered inside the app shell at /app/partners/[id] and inside
 * the public shell at /find-a-wash/[id]; backHref decides where ← Back goes.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { PartnerReviews } from "@/components/partner-reviews";
import { getPartner } from "@/lib/db/store";
import type { Partner } from "@/lib/db/types";

export default function PartnerDetail({
  partnerId,
  backHref,
}: {
  partnerId: string;
  backHref: string;
}) {
  const [partner, setPartner] = useState<Partner | null | undefined>(undefined);

  useEffect(() => {
    (async () => setPartner((await getPartner(partnerId)) ?? null))();
  }, [partnerId]);

  if (partner === undefined) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-8">
        <p className="text-gray-400">Loading…</p>
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
              href={backHref}
              className="inline-block rounded-full bg-[#20a957] px-6 py-3 transition-all duration-200 hover:bg-[#1a8a47] font-bold text-white"
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
        href={backHref}
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back
      </Link>

      <div className="rounded-3xl bg-[#111a14] p-7 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{partner.name}</h1>
            <p className="mt-1 text-gray-400">{partner.location}</p>
          </div>
          <Badge>Approved</Badge>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span>
            ⭐ {partner.rating.toFixed(1)}{" "}
            <span className="text-gray-500">({partner.reviews} reviews)</span>
          </span>
          <span>{partner.distance} away</span>
          <span
            className={
              partner.status === "Open"
                ? "font-semibold text-green-400"
                : "text-gray-500"
            }
          >
            {partner.status}
          </span>
        </div>

        <div className="mt-6 space-y-3 border-t pt-6 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Opening hours</span>
            <span className="font-semibold">{partner.hours}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Phone</span>
            <a
              href={`tel:${partner.phone.replace(/\s/g, "")}`}
              className="font-semibold text-[#48d87c]"
            >
              {partner.phone}
            </a>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Address</span>
            <span className="text-right font-semibold">{partner.address}</span>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-sm font-bold text-gray-400">SERVICES</p>
          <div className="flex flex-wrap gap-2">
            {partner.services.map((s) => (
              <span
                key={s}
                className="rounded-full bg-[#20a957]/10 px-3 py-1.5 text-sm font-semibold text-[#48d87c]"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        {partner.photos.length > 0 && (
          <div className="mt-6">
            <p className="mb-3 text-sm font-bold text-gray-400">PHOTOS</p>
            <div className="grid grid-cols-3 gap-2">
              {partner.photos.map((u, i) => (
                <a key={i} href={u} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={u}
                    alt={`${partner.name} photo ${i + 1}`}
                    className="h-24 w-full rounded-xl object-cover transition-transform hover:scale-105"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {partner.status === "Open" ? (
            <Link
              href={`/app/scan?partner=${partner.id}`}
              className="flex-1 rounded-full bg-[#20a957] py-3 transition-all duration-200 hover:bg-[#1a8a47] text-center font-bold text-white"
            >
              Scan & Wash Here
            </Link>
          ) : (
            <span className="flex-1 cursor-not-allowed rounded-full bg-white/15 py-3 text-center font-bold text-white">
              Currently Closed
            </span>
          )}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-full border border-[#20a957] py-3 transition-all duration-200 hover:bg-[#20a957]/10 text-center font-bold text-[#48d87c]"
          >
            Get Directions
          </a>
        </div>
      </div>

      <PartnerReviews partnerId={partner.id} />
    </section>
  );
}
