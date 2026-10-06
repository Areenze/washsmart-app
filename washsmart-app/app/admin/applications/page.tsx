"use client";

/* /admin/applications — partner application review queue. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { fmtDate, listApplications } from "@/lib/db/store";
import { listInspections, type InspectionListRow } from "@/lib/db/admin";
import type { PartnerApplication } from "@/lib/db/types";

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState<PartnerApplication[]>([]);
  const [inspections, setInspections] = useState<InspectionListRow[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [a, i] = await Promise.all([
          listApplications(),
          listInspections().catch(() => [] as InspectionListRow[]),
        ]);
        setApps(a);
        setInspections(i);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const inspectionByRef = new Map(inspections.map((i) => [i.applicationRef, i]));

  const visible = filter === "all" ? apps : apps.filter((a) => a.status === filter);
  const pendingCount = apps.filter((a) => a.status === "pending").length;

  const tone = (s: string) =>
    s === "approved" ? "green" : s === "rejected" ? "red" : "amber";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Partner Applications</h1>
          <p className="mt-1 text-gray-400">
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
                  : "bg-[#111a14] text-gray-400"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-gray-400">Loading…</p>
      ) : visible.length === 0 ? (
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
          {visible.map((a) => {
            const insp = inspectionByRef.get(a.ref);
            return (
            <Link
              key={a.ref}
              href={`/admin/applications/${a.ref}`}
              className="block rounded-2xl bg-[#111a14] p-5 shadow-sm transition-colors hover:border hover:border-[#20a957]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{a.business.carWashName}</p>
                  <p className="text-sm text-gray-400">
                    {a.business.ownerName} · {a.location.area},{" "}
                    {a.location.lga} · {a.business.phone}
                  </p>
                  <p className="mt-1 font-mono text-xs text-gray-500">
                    {a.ref} · submitted {fmtDate(a.submittedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {a.agentCode && (
                    <Badge tone="green">🤝 {a.agentCode}</Badge>
                  )}
                  {insp ? (
                    <Badge
                      tone={
                        insp.status === "passed"
                          ? "green"
                          : insp.status === "failed"
                            ? "red"
                            : "amber"
                      }
                    >
                      🔍 {insp.status.replace("_", " ").toUpperCase()} {insp.score}%
                    </Badge>
                  ) : a.status === "pending" ? (
                    <Badge tone="gray">🔍 NO INSPECTION</Badge>
                  ) : null}
                  <Badge tone={tone(a.status) as "green" | "amber" | "red"}>
                    {a.status.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
