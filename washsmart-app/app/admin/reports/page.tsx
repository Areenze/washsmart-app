"use client";

/* /admin/reports — revenue, growth, redemption, and credit-lifecycle
 * analytics for the network. */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  adminReportData,
  ngn,
  type MonthlyPoint,
  type ReportData,
} from "@/lib/db/admin";
import {
  getClientErrors,
  getTopPages,
  getTraffic,
  type ClientError,
  type TopPage,
  type TrafficDay,
} from "@/lib/db/analytics";

function Bars({ data, format }: { data: MonthlyPoint[]; format: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-44 items-end gap-2">
      {data.map((d) => (
        <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
          <p className="text-[10px] font-bold text-gray-400">{format(d.value)}</p>
          <div
            className="w-full rounded-t-lg bg-[#20a957]/70 transition-all hover:bg-[#20a957]"
            style={{ height: `${Math.max(4, (d.value / max) * 120)}px` }}
            title={`${d.month}: ${format(d.value)}`}
          />
          <p className="text-[10px] text-gray-500">{d.month.split(" ")[0]}</p>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-3xl bg-[#111a14] p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export default function AdminReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await adminReportData();
        setReport(r);
      } catch (e: any) {
        setError(e?.message ?? "Could not load reports.");
      }
    })();
  }, []);

  if (error)
    return (
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="mt-4 rounded-2xl bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </p>
      </div>
    );
  if (!report) return <p className="text-gray-400">Crunching numbers…</p>;

  const { totals, credits } = report;
  const breakageRate =
    credits.issued > 0
      ? Math.round((credits.expiredUnused / credits.issued) * 100)
      : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold">Reports</h1>
      <p className="mt-1 text-sm text-gray-400">
        Last 6 months · revenue, growth, redemptions, and credit lifecycle.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Revenue (6 mo)" value={ngn(totals.revenue)} />
        <Stat label="Washes (6 mo)" value={String(totals.washes)} />
        <Stat label="Subscribers" value={String(totals.subscribers)} />
        <Stat
          label="Avg washes / subscriber"
          value={totals.avgWashesPerSub.toFixed(1)}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl bg-[#111a14] p-5">
          <p className="font-bold">Revenue by month</p>
          <div className="mt-4">
            <Bars data={report.revenueByMonth} format={(v) => `₦${Math.round(v / 1000)}k`} />
          </div>
        </div>
        <div className="rounded-3xl bg-[#111a14] p-5">
          <p className="font-bold">Washes by month</p>
          <div className="mt-4">
            <Bars data={report.washesByMonth} format={(v) => String(v)} />
          </div>
        </div>
        <div className="rounded-3xl bg-[#111a14] p-5">
          <p className="font-bold">New subscribers by month</p>
          <div className="mt-4">
            <Bars data={report.subsByMonth} format={(v) => String(v)} />
          </div>
        </div>
        <div className="rounded-3xl bg-[#111a14] p-5">
          <p className="font-bold">Credit lifecycle</p>
          <div className="mt-4 space-y-3 text-sm">
            {[
              ["Credits issued", credits.issued, "text-white"],
              ["Redeemed", credits.redeemed, "text-[#48d87c]"],
              ["Expired unused (breakage)", credits.expiredUnused, "text-amber-400"],
              ["Active & remaining", credits.activeRemaining, "text-gray-400"],
            ].map(([label, v, cls]) => (
              <div key={label as string} className="flex justify-between">
                <span className="text-gray-400">{label}</span>
                <span className={`font-bold ${cls}`}>{v}</span>
              </div>
            ))}
            <p className="border-t border-white/5 pt-3 text-xs text-gray-500">
              Breakage rate: <span className="font-bold text-amber-400">{breakageRate}%</span> of
              issued credits expire unused — a key margin driver.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl bg-[#111a14] p-5">
          <p className="font-bold">Plan mix</p>
          <div className="mt-4 space-y-3">
            {report.planMix.map((p) => {
              const max = Math.max(1, ...report.planMix.map((x) => x.revenue));
              return (
                <div key={p.plan}>
                  <div className="flex justify-between text-sm">
                    <span className="font-bold">{p.plan}</span>
                    <span className="text-gray-400">
                      {p.subs} subs · {ngn(p.revenue)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-white/5">
                    <div
                      className="h-2 rounded-full bg-[#20a957]"
                      style={{ width: `${(p.revenue / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {report.planMix.length === 0 && (
              <p className="text-sm text-gray-500">No plan data yet.</p>
            )}
          </div>
        </div>
        <div className="rounded-3xl bg-[#111a14] p-5">
          <p className="font-bold">Top partners by washes</p>
          <div className="mt-4 space-y-2">
            {report.topPartners.map((p, i) => (
              <Link
                key={p.id}
                href={`/admin/partners/${p.id}`}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm hover:bg-white/5"
              >
                <span>
                  <span className="mr-2 text-gray-500">{i + 1}.</span>
                  <span className="font-bold text-[#48d87c]">{p.name}</span>
                </span>
                <span className="text-gray-400">
                  {p.washes} washes · {ngn(p.gross)}
                </span>
              </Link>
            ))}
            {report.topPartners.length === 0 && (
              <p className="text-sm text-gray-500">No washes yet.</p>
            )}
          </div>
        </div>
      </div>

      <TrafficSection />
      <ErrorsSection />
    </div>
  );
}

function TrafficSection() {
  const [traffic, setTraffic] = useState<TrafficDay[] | null>(null);
  const [topPages, setTopPages] = useState<TopPage[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [t, p] = await Promise.all([getTraffic(14), getTopPages(30, 8)]);
        setTraffic(t);
        setTopPages(p);
      } catch {
        setTraffic([]);
      }
    })();
  }, []);

  const totalViews = (traffic ?? []).reduce((s, d) => s + d.views, 0);
  const totalSessions = (traffic ?? []).reduce((s, d) => s + d.sessions, 0);
  const max = Math.max(1, ...(traffic ?? []).map((d) => d.views));

  return (
    <div className="mt-4 rounded-3xl bg-[#111a14] p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-bold">Site traffic — last 14 days</p>
        {traffic && (
          <p className="text-sm text-gray-400">
            {totalViews.toLocaleString()} views · {totalSessions.toLocaleString()} sessions
          </p>
        )}
      </div>
      {traffic === null ? (
        <p className="mt-4 text-sm text-gray-500">Loading…</p>
      ) : totalViews === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No traffic recorded yet. Page views are logged automatically by the
          app once this build is live.
        </p>
      ) : (
        <>
          <div className="mt-4 flex h-32 items-end gap-1.5">
            {traffic.map((d) => (
              <div
                key={d.day}
                className="flex flex-1 flex-col items-center gap-1"
                title={`${d.day}: ${d.views} views, ${d.sessions} sessions`}
              >
                <div
                  className="w-full rounded-t-md bg-[#20a957]/70 hover:bg-[#20a957]"
                  style={{ height: `${Math.max(3, (d.views / max) * 96)}px` }}
                />
                <p className="text-[9px] text-gray-600">{d.day.slice(8)}</p>
              </div>
            ))}
          </div>
          {topPages.length > 0 && (
            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="text-sm font-bold text-gray-400">Top pages (30 days)</p>
              <div className="mt-2 space-y-1.5">
                {topPages.map((p) => (
                  <div key={p.path} className="flex justify-between text-sm">
                    <span className="truncate font-mono text-xs text-gray-300">{p.path}</span>
                    <span className="ml-4 shrink-0 text-gray-500">{p.views}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ErrorsSection() {
  const [errors, setErrors] = useState<ClientError[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setErrors(await getClientErrors(15));
      } catch {
        setErrors([]);
      }
    })();
  }, []);

  return (
    <div className="mt-4 rounded-3xl bg-[#111a14] p-5">
      <p className="font-bold">
        Client errors{" "}
        {errors && errors.length > 0 && (
          <span className="ml-2 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-bold text-red-300">
            {errors.length}
          </span>
        )}
      </p>
      {errors === null ? (
        <p className="mt-4 text-sm text-gray-500">Loading…</p>
      ) : errors.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No client errors recorded. Uncaught errors in the app are logged here
          automatically.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {errors.map((e) => (
            <div key={e.id} className="rounded-xl bg-red-500/5 px-4 py-3">
              <p className="truncate text-sm font-semibold text-red-200">{e.message}</p>
              <p className="mt-1 text-xs text-gray-500">
                {e.path ?? "(unknown page)"} ·{" "}
                {new Date(e.createdAt).toLocaleString("en-NG", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
