"use client";

/* /admin/subscribers/[id] — full subscriber profile: personal info,
 * vehicles, subscription, credits, wash history, payments, reviews. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/db/store";
import {
  adminCancelSubscription,
  adminSubscriberDetail,
  ngn,
  type AdminSubscriberDetail,
} from "@/lib/db/admin";

const tone = (s: string) =>
  s === "active" ? "green" : s === "expired" ? "amber" : "gray";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-[#111a14] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      {children}
    </div>
  );
}

export default function AdminSubscriberDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<AdminSubscriberDetail | null | undefined>(undefined);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    try {
      setD((await adminSubscriberDetail(params.id)) ?? null);
    } catch {
      setD(null);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const cancel = async (subId: string, planName: string) => {
    const reason = window.prompt(
      `Cancel ${d?.profile.name}'s ${planName} subscription? This is recorded in the audit log.\n\nReason:`
    );
    if (!reason) return;
    setCancelling(true);
    try {
      await adminCancelSubscription(subId, reason);
      await load();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not cancel.");
    } finally {
      setCancelling(false);
    }
  };

  if (d === undefined) return <p className="text-gray-400">Loading…</p>;
  if (d === null)
    return (
      <EmptyState icon="🔍" title="Subscriber not found" body="This subscriber doesn't exist." />
    );

  const p = d.profile;
  const totalIssued = d.subscriptions.reduce((s, x) => s + x.washesTotal, 0);
  const totalUsed = d.subscriptions.reduce(
    (s, x) => s + (x.washesTotal - x.washesRemaining),
    0
  );

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="mb-4 text-sm font-semibold text-[#48d87c]"
      >
        ← Back
      </button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{p.name}</h1>
        {p.isAdmin && <Badge tone="amber">STAFF</Badge>}
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Subscriber since {fmtDate(p.createdAt)}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Section title="Personal information">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-gray-400">Email</dt><dd className="font-semibold">{p.email}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-400">Phone</dt><dd className="font-semibold">{p.phone}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-400">Area</dt><dd className="font-semibold">{p.area ?? "—"}</dd></div>
          </dl>
          <h3 className="mb-2 mt-5 text-sm font-bold text-gray-400">VEHICLES ({d.vehicles.length})</h3>
          {d.vehicles.length === 0 ? (
            <p className="text-sm text-gray-500">No vehicles registered.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {d.vehicles.map((v) => (
                <li key={v.id} className="rounded-xl bg-white/[0.03] px-3 py-2">
                  <span className="font-bold">{v.label}</span>
                  <span className="text-gray-400"> · {v.plate ?? "—"}{v.color ? ` · ${v.color}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Credits">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-white/[0.03] p-4">
              <p className="text-2xl font-bold">{totalIssued}</p>
              <p className="text-xs text-gray-500">Issued</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-4">
              <p className="text-2xl font-bold">{totalUsed}</p>
              <p className="text-xs text-gray-500">Used</p>
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-4">
              <p className="text-2xl font-bold text-[#48d87c]">{totalIssued - totalUsed}</p>
              <p className="text-xs text-gray-500">Remaining</p>
            </div>
          </div>
          <h3 className="mb-2 mt-5 text-sm font-bold text-gray-400">SUBSCRIPTIONS</h3>
          {d.subscriptions.length === 0 ? (
            <p className="text-sm text-gray-500">No subscriptions.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {d.subscriptions.map((s) => (
                <li key={s.id} className="rounded-xl bg-white/[0.03] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{s.planName} · {ngn(s.amount)}</span>
                    <Badge tone={tone(s.status) as "green" | "amber" | "gray"}>
                      {s.status.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {s.washesRemaining}/{s.washesTotal} left · renews {fmtDate(s.renewsAt)}
                  </p>
                  {s.status === "active" && (
                    <button
                      onClick={() => cancel(s.id, s.planName)}
                      disabled={cancelling}
                      className="mt-2 text-xs font-bold text-red-400 hover:text-red-300"
                    >
                      Cancel subscription
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title={`Wash history (${d.washes.length})`}>
          {d.washes.length === 0 ? (
            <p className="text-sm text-gray-500">No washes yet.</p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
              {d.washes.map((w) => (
                <li key={w.id} className="rounded-xl bg-white/[0.03] px-3 py-2">
                  <div className="flex justify-between gap-2">
                    <Link href={`/admin/partners/${w.partnerId}`} className="font-bold text-[#48d87c]">
                      {w.partnerName}
                    </Link>
                    <span className="text-xs text-gray-500">{fmtDate(w.at)}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {w.type} · payout {ngn(w.payout)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={`Payments (${d.payments.length})`}>
          {d.payments.length === 0 ? (
            <p className="text-sm text-gray-500">No payments.</p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
              {d.payments.map((x) => (
                <li key={x.id} className="rounded-xl bg-white/[0.03] px-3 py-2">
                  <div className="flex justify-between gap-2">
                    <span className="font-bold">{ngn(x.amount)} · {x.planName}</span>
                    <span className="text-xs text-gray-500">{fmtDate(x.paidAt)}</span>
                  </div>
                  <p className="font-mono text-xs text-gray-500">
                    {x.method} · {x.reference}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {d.reviews.length > 0 && (
        <div className="mt-4">
          <Section title={`Reviews left (${d.reviews.length})`}>
            <ul className="space-y-2 text-sm">
              {d.reviews.map((r) => (
                <li key={r.id} className="rounded-xl bg-white/[0.03] px-3 py-2">
                  <span className="font-bold">{"★".repeat(r.rating)}</span>
                  <span className="text-gray-400">{"★".repeat(5 - r.rating)}</span>
                  <span className="ml-2 text-gray-300">{r.partnerName}</span>
                  {r.body && <p className="mt-1 text-gray-400">{r.body}</p>}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </div>
  );
}
