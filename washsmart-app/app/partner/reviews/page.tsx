"use client";

/* /partner/reviews — what subscribers say about this wash center.
 * Read-only: partners can never edit or remove reviews. */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  currentPartnerSession,
  fmtDate,
  listPartnerReviews,
  type Review,
} from "@/lib/db/store";

function Stars({ n }: { n: number }) {
  return (
    <span className="text-sm tracking-tight text-amber-400" aria-label={`${n} out of 5 stars`}>
      {"★".repeat(n)}
      <span className="text-gray-600">{"★".repeat(5 - n)}</span>
    </span>
  );
}

export default function PartnerReviewsPage() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [partnerName, setPartnerName] = useState("");

  useEffect(() => {
    (async () => {
      const p = await currentPartnerSession();
      if (!p) return;
      setPartnerName(p.name);
      setReviews(await listPartnerReviews(p.id).catch(() => []));
    })();
  }, []);

  const avg =
    reviews && reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  return (
    <section className="mx-auto max-w-3xl py-8">
      <Link
        href="/partner/dashboard"
        className="mb-5 inline-block text-sm font-semibold text-[#2dd4bf]"
      >
        ← Back
      </Link>
      <h1 className="text-3xl font-bold">Customer Reviews</h1>
      <p className="mt-2 text-gray-400">
        What subscribers say about {partnerName || "your wash center"}.
      </p>

      {reviews === null ? (
        <p className="mt-6 text-gray-400">Loading…</p>
      ) : reviews.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-[#111a14] p-8 text-center">
          <p className="font-bold">No reviews yet</p>
          <p className="mt-2 text-sm text-gray-400">
            Subscribers can rate their wash after redeeming — reviews will show
            up here.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-center gap-4 rounded-2xl bg-[#111a14] p-5">
            <p className="text-4xl font-bold">{avg.toFixed(1)}</p>
            <div>
              <Stars n={Math.round(avg)} />
              <p className="mt-1 text-sm text-gray-400">
                {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-2xl bg-[#111a14] p-5">
                <div className="flex items-center justify-between gap-3">
                  <Stars n={r.rating} />
                  <p className="text-xs text-gray-500">{fmtDate(r.createdAt)}</p>
                </div>
                {r.body && <p className="mt-2 text-sm">{r.body}</p>}
                <p className="mt-2 text-xs text-gray-500">
                  — {r.subscriberName}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
