"use client";

/* Placeholder pages for phase-2 admin modules. */

import Link from "next/link";

function Stub({ icon, title, points }: { icon: string; title: string; points: string[] }) {
  return (
    <div>
      <Link href="/admin/dashboard" className="text-sm font-semibold text-[#66dca4]">
        ← Dashboard
      </Link>
      <div className="mx-auto mt-10 max-w-xl rounded-3xl bg-[#111a14] p-10 text-center shadow-sm">
        <p className="text-4xl">{icon}</p>
        <h1 className="mt-3 text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-gray-400">Coming in phase 2 of the admin build.</p>
        <ul className="mt-6 space-y-2 text-left text-sm text-gray-300">
          {points.map((p) => (
            <li key={p} className="rounded-xl bg-white/[0.03] px-4 py-2">
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function SupportStub() {
  return (
    <Stub
      icon="🎧"
      title="Support"
      points={[
        "Complaint tickets: wash quality, refused redemptions, QR problems, refunds",
        "Open → Assigned → Investigating → Resolved → Closed workflow",
        "Link each ticket to subscriber, partner, and wash transaction",
      ]}
    />
  );
}

export function ReportsStub() {
  return (
    <Stub
      icon="📈"
      title="Reports"
      points={[
        "Revenue: MRR, daily revenue, revenue by plan and location",
        "Usage: redemption rate, washes per subscriber, expired credits",
        "Partners: top performers, low performers, payout totals",
      ]}
    />
  );
}

export function SettingsStub() {
  return (
    <Stub
      icon="⚙️"
      title="Settings"
      points={[
        "Admin users & roles: super admin, operations, finance, support, partner manager",
        "Full audit log viewer (every sensitive action, searchable)",
        "Plan configuration: name, price, credits, payout rules",
      ]}
    />
  );
}
