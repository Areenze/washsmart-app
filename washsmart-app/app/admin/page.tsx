"use client";

/* /admin — pending partner applications queue. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Brand, EmptyState, Logo } from "@/components/ui";
import { fmtDate, isAdmin, listApplications } from "@/lib/db/store";
import type { PartnerApplication } from "@/lib/db/types";

export default function AdminPage() {
  const [apps, setApps] = useState<PartnerApplication[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const reload = async () => setApps(await listApplications());

  useEffect(() => {
    (async () => {
      setAuthorized(await isAdmin());
      reload();
    })();
  }, []);

  const visible = filter === "all" ? apps : apps.filter((a) => a.status === filter);
  const pendingCount = apps.filter((a) => a.status === "pending").length;

  const tone = (s: string) =>
    s === "approved" ? "green" : s === "rejected" ? "red" : "amber";

  return (
    <main className="min-h-screen bg-[#f5f8f6] text-[#10251c]">
      <header className="border-b bg-white px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <Brand />
          </Link>
          <span className="text-sm font-semibold text-gray-500">
            Admin · Partner Applications
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-8">
        {authorized === null && <p className="text-gray-500">Loading…</p>}
        {authorized === false && (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-4xl">🔒</p>
            <h1 className="mt-3 text-2xl font-bold">Admin access required</h1>
            <p className="mt-2 text-sm text-gray-500">
              Sign in with a WashSMART staff account to review partner
              applications.
            </p>
          </div>
        )}
        {authorized === true && (
          <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Partner Applications</h1>
            <p className="mt-1 text-gray-500">
              {pendingCount} application{pendingCount === 1 ? "" : "s"} awaiting
              review. Approving adds the car wash to the user app immediately.
            </p>
          </div>
          <div className="flex gap-2">
            {(["pending", "approved", "rejected", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${
                  filter === f
                    ? "bg-[#20a957] text-white"
                    : "bg-white text-gray-500"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon="📋"
              title={`No ${filter} applications`}
              body={
                filter === "pending"
                  ? "New applications from the /join funnel will appear here."
                  : `No applications with status “${filter}”.`
              }
            />
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {visible.map((a) => (
              <Link
                key={a.ref}
                href={`/admin/applications/${a.ref}`}
                className="block rounded-2xl bg-white p-5 shadow-sm hover:border hover:border-[#20a957]"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{a.business.carWashName}</p>
                    <p className="text-sm text-gray-500">
                      {a.business.ownerName} · {a.location.area},{" "}
                      {a.location.lga} · {a.business.phone}
                    </p>
                    <p className="mt-1 font-mono text-xs text-gray-400">
                      {a.ref} · submitted {fmtDate(a.submittedAt)}
                    </p>
                  </div>
                  <Badge tone={tone(a.status) as "green" | "amber" | "red"}>
                    {a.status.toUpperCase()}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
        </>
        )}
      </section>
    </main>
  );
}
