"use client";

/* /admin/inspections — every site inspection across applications. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/db/store";
import { listInspections, type InspectionListRow } from "@/lib/db/admin";

const tone = (s: string) =>
  s === "passed" ? "green" : s === "failed" ? "red" : "amber";

export default function AdminInspectionsPage() {
  const [rows, setRows] = useState<InspectionListRow[] | null>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        setRows(await listInspections());
      } catch {
        setRows([]);
      }
    })();
  }, []);

  if (rows === null) return <p className="text-gray-400">Loading…</p>;

  const visible =
    filter === "all" ? rows : rows.filter((r) => r.status === filter);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Inspections</h1>
          <p className="mt-1 text-gray-400">
            Site inspections between application review and approval.
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "in_progress", "passed", "failed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                filter === f ? "bg-[#34d186] text-white" : "bg-[#111a14] text-gray-400"
              }`}
            >
              {f === "in_progress" ? "In progress" : f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="🔍"
            title="No inspections yet"
            body="Start an inspection from any pending partner application."
          />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl bg-[#111a14] shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-widest text-gray-500">
                <th className="px-5 py-4">Business</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Score</th>
                <th className="px-5 py-4">Inspector</th>
                <th className="px-5 py-4">Updated</th>
                <th className="px-5 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-4">
                    <p className="font-bold">{r.businessName}</p>
                    <p className="text-xs text-gray-500">
                      {r.area} · {r.applicationRef}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <Badge tone={tone(r.status) as "green" | "amber" | "red"}>
                      {r.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right font-bold">{r.score}%</td>
                  <td className="px-5 py-4 text-gray-300">{r.inspectorName || "—"}</td>
                  <td className="px-5 py-4 text-gray-400">{fmtDate(r.updatedAt)}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/applications/${r.applicationRef}`}
                      className="font-bold text-[#66dca4]"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
