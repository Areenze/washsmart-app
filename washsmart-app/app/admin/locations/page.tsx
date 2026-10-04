"use client";

/* /admin/locations — network coverage by area: subscribers vs partners
 * vs washes. Shows where demand outruns capacity. (Live map needs a
 * Google Maps key — this table answers the strategy question today.) */

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui";
import { adminLocationStats, type AreaStat } from "@/lib/db/admin";

export default function AdminLocationsPage() {
  const [rows, setRows] = useState<AreaStat[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setRows(await adminLocationStats());
      } catch {
        setRows([]);
      }
    })();
  }, []);

  if (rows === null) return <p className="text-gray-400">Loading…</p>;

  return (
    <div>
      <h1 className="text-3xl font-bold">Locations</h1>
      <p className="mt-1 text-gray-400">
        Subscribers vs partners by area — high washes with few partners means
        you need capacity there.
      </p>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon="📍" title="No location data" body="Areas will appear once subscribers set theirs." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl bg-[#111a14] shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-widest text-gray-500">
                <th className="px-5 py-4">Area</th>
                <th className="px-5 py-4 text-right">Subscribers</th>
                <th className="px-5 py-4 text-right">Partners</th>
                <th className="px-5 py-4 text-right">Washes</th>
                <th className="px-5 py-4 text-right">Washes / partner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.area} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-5 py-4 font-bold">{r.area}</td>
                  <td className="px-5 py-4 text-right">{r.subscribers}</td>
                  <td className="px-5 py-4 text-right">{r.partners}</td>
                  <td className="px-5 py-4 text-right font-bold">{r.washes}</td>
                  <td className="px-5 py-4 text-right text-gray-400">
                    {r.partners > 0 ? (r.washes / r.partners).toFixed(1) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-xs text-gray-500">
        🗺️ A live partner map ships with the Google Maps integration.
      </p>
    </div>
  );
}
