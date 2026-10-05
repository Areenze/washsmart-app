"use client";

/* /admin/dashboard — the network at a glance: key cards + activity feed. */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  adminActivity,
  adminDashboardStats,
  adminFraudFlags,
  ngn,
  type ActivityItem,
  type DashboardStats,
  type FraudFlag,
} from "@/lib/db/admin";

function Card({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-3xl bg-[#111a14] p-5 shadow-sm transition-colors hover:border hover:border-[#34d186]/40">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

const KIND_ICON: Record<ActivityItem["kind"], string> = {
  payment: "💳",
  wash: "🚗",
  application: "📝",
  subscription: "🎟️",
  settlement: "🏦",
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [feed, setFeed] = useState<ActivityItem[]>([]);
  const [fraud, setFraud] = useState<FraudFlag[] | null>(null);

  useEffect(() => {
    (async () => {
      const [s, a, f] = await Promise.all([
        adminDashboardStats().catch(() => null),
        adminActivity().catch(() => [] as ActivityItem[]),
        adminFraudFlags().catch(() => [] as FraudFlag[]),
      ]);
      setStats(s);
      setFeed(a);
      setFraud(f);
    })();
  }, []);

  if (!stats) {
    return <p className="text-gray-400">Loading dashboard…</p>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-1 text-gray-400">
        The WashSMART network at a glance — credit lifecycle and partner
        network first.
      </p>

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-widest text-gray-500">
        Subscribers & Credits
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Subscribers" value={String(stats.totalSubscribers)} sub={`+${stats.newSubscribers7d} this week`} href="/admin/subscribers" />
        <Card label="Active Subscriptions" value={String(stats.activeSubscriptions)} href="/admin/subscriptions" />
        <Card label="Credits Issued" value={String(stats.creditsIssued)} href="/admin/credits" />
        <Card label="Credits Remaining" value={String(stats.creditsRemaining)} href="/admin/credits" />
        <Card label="Credits Redeemed" value={String(stats.creditsRedeemed)} href="/admin/washes" />
        <Card label="Washes Completed" value={String(stats.totalWashes)} href="/admin/washes" />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-widest text-gray-500">
        Money
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Total Revenue" value={ngn(stats.totalRevenue)} href="/admin/payments" />
        <Card label="Pending Partner Payouts" value={ngn(stats.pendingPayouts)} href="/admin/settlements" />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-widest text-gray-500">
        Network
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Active Partners" value={String(stats.activePartners)} href="/admin/partners" />
        <Card label="Pending Applications" value={String(stats.pendingApplications)} href="/admin/applications" />
      </div>

      {fraud !== null && fraud.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-widest text-gray-500">
            🚨 Fraud watch
          </h2>
          <Link
            href="/admin/fraud"
            className="block rounded-3xl border border-red-500/30 bg-red-500/10 p-5 transition-colors hover:bg-red-500/15"
          >
            <p className="text-3xl font-bold text-red-400">{fraud.length}</p>
            <p className="mt-1 text-sm font-bold">
              {fraud.length === 1 ? "pattern flagged" : "patterns flagged"}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {fraud.slice(0, 3).map((f) => f.ruleLabel).join(" · ")}
              {fraud.length > 3 ? "…" : ""} — review →
            </p>
          </Link>
        </>
      )}

      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-widest text-gray-500">
        Recent Activity
      </h2>
      <div className="rounded-3xl bg-[#111a14] p-2 shadow-sm">
        {feed.length === 0 && (
          <p className="p-4 text-sm text-gray-500">No activity yet.</p>
        )}
        {feed.map((item, i) => (
          <Link
            key={i}
            href={item.href}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors hover:bg-white/5"
          >
            <span className="text-xl">{KIND_ICON[item.kind]}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{item.text}</p>
              <p className="text-xs text-gray-500">
                {new Date(item.at).toLocaleString("en-NG", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
