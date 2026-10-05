"use client";

/* /admin/reviews — every subscriber review across the network.
 * Quality control feed: low ratings surface partner problems early. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/db/store";
import { adminListReviews, type AdminReviewRow } from "@/lib/db/admin";

export default function AdminReviewsPage() {
  const [rows, setRows] = useState<AdminReviewRow[]>([]);
  const [filter, setFilter] = useState<"all" | "low">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setRows(await adminListReviews(150));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const visible = filter === "low" ? rows.filter((r) => r.rating <= 2) : rows;
  const avg =
    rows.length > 0
      ? rows.reduce((s, r) => s + r.rating, 0) / rows.length
      : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Reviews</h1>
          <p className="mt-1 text-gray-400">
            {rows.length} review{rows.length === 1 ? "" : "s"}
            {rows.length > 0 && ` · network average ${avg.toFixed(1)} ⭐`}
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "low"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                filter === f ? "bg-[#20a957] text-white" : "bg-[#111a14] text-gray-400"
              }`}
            >
              {f === "low" ? "⚠️ Low ratings" : "All"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-gray-400">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="⭐"
            title={filter === "low" ? "No low ratings" : "No reviews yet"}
            body={filter === "low" ? "Every partner is rated 3 stars or above." : "Subscriber reviews will appear here."}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {visible.map((r) => (
            <div key={r.id} className="rounded-2xl bg-[#111a14] p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-[#f5b301]">{"★".repeat(r.rating)}</span>
                  <span className="text-white/20">{"★".repeat(5 - r.rating)}</span>
                  <span className="ml-2 text-sm text-gray-400">{r.subscriberName}</span>
                </div>
                <span className="text-xs text-gray-500">{fmtDate(r.at)}</span>
              </div>
              <p className="mt-2 text-sm">
                <Link href={`/admin/partners/${r.partnerId}`} className="font-bold text-[#48d87c]">
                  {r.partnerName}
                </Link>
              </p>
              {r.body && <p className="mt-1 text-sm text-gray-300">{r.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
