"use client";

/* /admin/requests — subscriber coverage requests inbox. */

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui";
import {
  deleteLocationRequest,
  fmtDate,
  listLocationRequests,
} from "@/lib/db/store";
import type { LocationRequest } from "@/lib/db/types";

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<LocationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setRequests(await listLocationRequests());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const remove = async (id: string) => {
    if (!window.confirm("Delete this coverage request?")) return;
    await deleteLocationRequest(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">Coverage Requests</h1>
      <p className="mt-1 text-gray-400">
        Subscribers asking for WashSMART in their neighborhood — expand where
        they ask you to.
      </p>

      {loading ? (
        <p className="mt-6 text-gray-400">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="📍"
            title="No coverage requests"
            body="Requests from the “Don't see a WashSMART location in your area?” form will appear here."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#111a14] p-5 shadow-sm"
            >
              <div>
                <p className="font-bold">{r.area}</p>
                <p className="text-sm text-gray-400">{r.email}</p>
                <p className="mt-1 text-xs text-gray-500">
                  requested {fmtDate(r.createdAt)}
                </p>
              </div>
              <button
                onClick={() => remove(r.id)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-gray-400 transition-colors hover:border-red-400/50 hover:text-red-400"
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
