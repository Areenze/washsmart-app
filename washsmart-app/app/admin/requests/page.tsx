"use client";

/* /admin/requests — subscriber coverage requests + pre-launch waitlist inbox.
 * The waitlist section doubles as a demand map: expand where signups ask. */

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog, EmptyState } from "@/components/ui";
import {
  deleteLocationRequest,
  deleteWaitlistSignup,
  fmtDate,
  listLocationRequests,
  listWaitlistSignups,
} from "@/lib/db/store";
import type { LocationRequest, WaitlistSignup } from "@/lib/db/types";

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<LocationRequest[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistSignup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissTarget, setDismissTarget] = useState<LocationRequest | null>(null);
  const [dismissWaitlistTarget, setDismissWaitlistTarget] =
    useState<WaitlistSignup | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [reqs, wl] = await Promise.all([
          listLocationRequests(),
          listWaitlistSignups(),
        ]);
        setRequests(reqs);
        setWaitlist(wl);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const removeRequest = async () => {
    if (!dismissTarget) return;
    await deleteLocationRequest(dismissTarget.id);
    setRequests((prev) => prev.filter((r) => r.id !== dismissTarget.id));
    setDismissTarget(null);
  };

  const removeWaitlist = async () => {
    if (!dismissWaitlistTarget) return;
    await deleteWaitlistSignup(dismissWaitlistTarget.id);
    setWaitlist((prev) => prev.filter((r) => r.id !== dismissWaitlistTarget.id));
    setDismissWaitlistTarget(null);
  };

  const topAreas = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of waitlist) {
      const key = w.area.trim() || "Unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [waitlist]);

  const carOwners = waitlist.filter((w) => w.ownsCar).length;

  return (
    <div>
      <h1 className="text-3xl font-bold">Requests</h1>
      <p className="mt-1 text-gray-400">
        Subscriber demand signals — expand where they ask you to.
      </p>

      {loading ? (
        <p className="mt-6 text-gray-400">Loading…</p>
      ) : (
        <>
          {/* ---------------- Waitlist ---------------- */}
          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-xl font-bold">📝 Launch waitlist</h2>
            <span className="rounded-full bg-green-500/15 px-3 py-1 text-sm font-bold text-green-400">
              {waitlist.length} signed up
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            From the washsmart.ng holding page. {carOwners} own a car — top
            areas are your launch-zone shortlist.
          </p>

          {waitlist.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon="📝"
                title="No waitlist signups yet"
                body="Signups from the public coming-soon page will appear here."
              />
            </div>
          ) : (
            <>
              {topAreas.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {topAreas.map(([area, n]) => (
                    <span
                      key={area}
                      className="rounded-full border border-white/10 bg-[#111a14] px-3 py-1.5 text-xs font-bold text-gray-300"
                    >
                      {area} · {n}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 space-y-3">
                {waitlist.map((w) => (
                  <div
                    key={w.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#111a14] p-5 shadow-sm"
                  >
                    <div>
                      <p className="font-bold">
                        {w.name}{" "}
                        <span className="ml-1 text-xs font-semibold text-gray-500">
                          {w.ownsCar ? "🚗 car owner" : "🚶 no car yet"}
                        </span>
                      </p>
                      <p className="text-sm text-gray-400">
                        {w.email} · {w.area}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        joined {fmtDate(w.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => setDismissWaitlistTarget(w)}
                      className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-gray-400 transition-colors hover:border-red-400/50 hover:text-red-400"
                    >
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ---------------- Coverage requests ---------------- */}
          <h2 className="mt-10 text-xl font-bold">📍 Coverage requests</h2>
          <p className="mt-1 text-sm text-gray-400">
            Subscribers asking for WashSMART in their neighborhood.
          </p>

          {requests.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon="📍"
                title="No coverage requests"
                body="Requests from the “Don't see a WashSMART location in your area?” form will appear here."
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
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
                    onClick={() => setDismissTarget(r)}
                    className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-gray-400 transition-colors hover:border-red-400/50 hover:text-red-400"
                  >
                    Dismiss
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={dismissTarget !== null}
        title="Dismiss request"
        body={`Delete the coverage request for "${dismissTarget?.area ?? ""}" (${dismissTarget?.email ?? ""})?`}
        confirmLabel="Dismiss"
        danger
        onConfirm={() => removeRequest()}
        onCancel={() => setDismissTarget(null)}
      />
      <ConfirmDialog
        open={dismissWaitlistTarget !== null}
        title="Dismiss waitlist signup"
        body={`Delete the waitlist signup for "${dismissWaitlistTarget?.name ?? ""}" (${dismissWaitlistTarget?.email ?? ""})?`}
        confirmLabel="Dismiss"
        danger
        onConfirm={() => removeWaitlist()}
        onCancel={() => setDismissWaitlistTarget(null)}
      />
    </div>
  );
}
