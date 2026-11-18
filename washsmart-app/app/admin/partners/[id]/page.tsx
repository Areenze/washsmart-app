"use client";

/* /admin/partners/[id] — partner control center: business info,
 * verification, performance, transactions, reviews, settlements. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/db/store";
import { getSupabase } from "@/lib/db/supabase";
import {
  adminPartnerDetail,
  logAdminAction,
  ngn,
  type AdminPartnerDetail,
} from "@/lib/db/admin";

const tone = (s: string) =>
  s === "approved" ? "green" : s === "suspended" ? "red" : "amber";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-[#111a14] p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      {children}
    </div>
  );
}

export default function AdminPartnerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [d, setD] = useState<AdminPartnerDetail | null | undefined>(undefined);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginNote, setLoginNote] = useState<string | null>(null);
  const [loginLinked, setLoginLinked] = useState<boolean | null>(null);
  const [statusOverride, setStatusOverride] = useState<string | null>(null);
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setD((await adminPartnerDetail(params.id)) ?? null);
      } catch {
        setD(null);
      }
    })();
  }, [params.id]);

  if (d === undefined) return <p className="text-gray-400">Loading…</p>;
  if (d === null)
    return <EmptyState icon="🔍" title="Partner not found" body="This partner doesn't exist." />;

  const p = d.partner;
  const s = d.stats;

  const statusNow = statusOverride ?? p.status;

  const changeStatus = async (next: "suspended" | "approved") => {
    if (statusBusy) return;
    setStatusBusy(true);
    setStatusNote(null);
    try {
      const { data: sess } = await getSupabase().auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Session expired — sign in again.");
      const res = await fetch("/api/admin/partner-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ partnerId: p.partner_id, status: next }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok)
        throw new Error(out.error || "Could not change the status.");
      setStatusOverride(next);
      setConfirmSuspend(false);
      setStatusNote(
        next === "suspended"
          ? "✓ Suspended — hidden from Find-a-wash and their QR scans are now refused."
          : "✓ Reactivated — visible to subscribers and can redeem washes again."
      );
      await logAdminAction(
        next === "suspended" ? "partner.suspend" : "partner.reactivate",
        "partner",
        p.partner_id,
        `${next === "suspended" ? "Suspended" : "Reactivated"} ${p.name} (${p.partner_id})`
      ).catch(() => {});
    } catch (e) {
      setStatusNote(
        `⚠️ ${e instanceof Error ? e.message : "Something went wrong."}`
      );
    } finally {
      setStatusBusy(false);
    }
  };

  const linkedNow = loginLinked ?? !!p.user_id;
  const createLogin = async () => {
    if (loginBusy) return;
    setLoginBusy(true);
    setLoginNote(null);
    try {
      const { data: sess } = await getSupabase().auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Session expired — sign in again.");
      const res = await fetch("/api/admin/partner-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ partnerId: p.partner_id }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out.ok)
        throw new Error(out.error || "Could not create the login.");
      setLoginLinked(true);
      setLoginNote(
        out.sent
          ? `✓ Set-password email sent to ${p.email}`
          : `✓ Login linked, but the email could not be sent — ${out.emailError ?? "press Resend to try again."}`
      );
    } catch (e) {
      setLoginNote(
        `⚠️ ${e instanceof Error ? e.message : "Something went wrong."}`
      );
    } finally {
      setLoginBusy(false);
    }
  };

  return (
    <div>
      <button onClick={() => router.back()} className="mb-4 text-sm font-semibold text-[#48d87c]">
        ← Back
      </button>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{p.name}</h1>
        <Badge tone={tone(statusNow) as "green" | "amber" | "red"}>
          {(statusNow ?? "").toUpperCase()}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {p.partner_id} · {p.area}, {p.state}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total washes", value: String(s.totalWashes) },
          { label: "Washes this month", value: String(s.thisMonthWashes) },
          { label: "Total earnings", value: ngn(s.totalEarnings) },
          { label: "Rating", value: `${s.avgRating.toFixed(1)} ⭐` },
        ].map((c) => (
          <div key={c.label} className="rounded-3xl bg-[#111a14] p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{c.label}</p>
            <p className="mt-2 text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Business information">
          <dl className="space-y-2 text-sm">
            {[
              ["Owner", p.owner_name],
              ["Phone", p.phone],
              ["Email", p.email],
              ["Address", p.address],
              ["Area / LGA", `${p.area ?? "—"} / ${p.lga ?? "—"}`],
              ["Hours", p.hours ?? p.opening_hours ?? "—"],
              ["Payout rate", p.settlement_rate ? `${ngn(p.settlement_rate)}/wash` : "—"],
              ["Bank", p.bank_name ? `${p.bank_name} ····${p.bank_account_last4 ?? ""}` : "—"],
              ["Bays", p.bays ?? "—"],
              ["Daily capacity", p.daily_capacity ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="shrink-0 text-gray-400">{k}</dt>
                <dd className="text-right font-semibold">{v || "—"}</dd>
              </div>
            ))}
          </dl>
          {p.services?.length > 0 && (
            <>
              <h3 className="mb-2 mt-4 text-sm font-bold text-gray-400">SERVICES</h3>
              <div className="flex flex-wrap gap-2">
                {p.services.map((x: string) => (
                  <span key={x} className="rounded-full bg-[#20a957]/10 px-3 py-1 text-xs font-semibold text-[#48d87c]">
                    {x}
                  </span>
                ))}
              </div>
            </>
          )}
          {p.photos?.length > 0 && (
            <>
              <h3 className="mb-2 mt-4 text-sm font-bold text-gray-400">
                PHOTOS ({p.photos.length})
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {p.photos.map((u: string, i: number) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={u}
                      alt={`Photo ${i + 1}`}
                      className="h-16 w-full rounded-lg object-cover"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </>
          )}
        </Section>

        <div className="space-y-4">
          <Section title="Verification">
            <dl className="space-y-2 text-sm">
              {[
                ["Status", statusNow],
                ["Approved at", p.approved_at ? fmtDate(p.approved_at) : "—"],
                ["Application ref", p.application_ref ?? "—"],
                ["Joined", p.created_at ? fmtDate(p.created_at) : "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="shrink-0 text-gray-400">{k}</dt>
                  <dd className="text-right font-semibold">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            {p.application_ref && (
              <Link
                href={`/admin/applications/${p.application_ref}`}
                className="mt-4 inline-block text-sm font-bold text-[#48d87c]"
              >
                View application →
              </Link>
            )}
          </Section>

          <Section title="Partner App login">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-gray-400">Login</dt>
                <dd className="text-right font-semibold">
                  {linkedNow
                    ? "✓ Linked — partner can sign in"
                    : "Not created yet"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-gray-400">Login email</dt>
                <dd className="text-right font-semibold">{p.email || "—"}</dd>
              </div>
            </dl>
            <button
              onClick={createLogin}
              disabled={loginBusy}
              className="mt-4 w-full rounded-full bg-[#20a957] py-3 text-sm font-bold text-white transition hover:bg-[#1a8a47] disabled:opacity-60"
            >
              {loginBusy
                ? "Working…"
                : linkedNow
                  ? "Resend set-password email"
                  : "Create login & email set-password link"}
            </button>
            {loginNote && (
              <p className="mt-3 text-sm text-gray-300">{loginNote}</p>
            )}
            <p className="mt-3 text-xs text-gray-500">
              Creates the partner&apos;s account if needed, links it to this
              partner, and emails a link so they set their own password.
              Approvals do this automatically — this button is the retry for
              partners approved earlier.
            </p>
          </Section>

          <Section title="Partner status">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="shrink-0 text-gray-400">Status</dt>
                <dd className="text-right font-semibold">
                  {statusNow === "suspended"
                    ? "Suspended — not trading"
                    : statusNow === "approved"
                      ? "Active — live to subscribers"
                      : (statusNow ?? "—")}
                </dd>
              </div>
            </dl>
            {statusNow === "approved" && !confirmSuspend && (
              <button
                onClick={() => setConfirmSuspend(true)}
                disabled={statusBusy}
                className="mt-4 w-full rounded-full bg-red-500/90 py-3 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                Suspend partner
              </button>
            )}
            {statusNow === "approved" && confirmSuspend && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-gray-300">
                  Suspend {p.name}? They disappear from Find-a-wash
                  immediately and their QR scans will be refused. They can
                  still sign in and see their earnings, and this can be
                  undone at any time.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => changeStatus("suspended")}
                    disabled={statusBusy}
                    className="flex-1 rounded-full bg-red-500 py-3 text-sm font-bold text-white transition hover:bg-red-400 disabled:opacity-60"
                  >
                    {statusBusy ? "Working…" : "Yes, suspend"}
                  </button>
                  <button
                    onClick={() => setConfirmSuspend(false)}
                    disabled={statusBusy}
                    className="flex-1 rounded-full bg-white/10 py-3 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {statusNow === "suspended" && (
              <button
                onClick={() => changeStatus("approved")}
                disabled={statusBusy}
                className="mt-4 w-full rounded-full bg-[#20a957] py-3 text-sm font-bold text-white transition hover:bg-[#1a8a47] disabled:opacity-60"
              >
                {statusBusy ? "Working…" : "Reactivate partner"}
              </button>
            )}
            {statusNote && (
              <p className="mt-3 text-sm text-gray-300">{statusNote}</p>
            )}
            <p className="mt-3 text-xs text-gray-500">
              Suspension stops trading only — the partner&apos;s record,
              earnings and settlement history are kept, and the change is
              written to the admin audit log.
            </p>
          </Section>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title={`Transactions (${d.washes.length})`}>
          {d.washes.length === 0 ? (
            <p className="text-sm text-gray-500">No washes yet.</p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
              {d.washes.map((w) => (
                <li key={w.id} className="rounded-xl bg-white/[0.03] px-3 py-2">
                  <div className="flex justify-between gap-2">
                    <span className="font-bold">{w.subscriberName}</span>
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

        <div className="space-y-4">
          <Section title={`Settlements (${d.settlements.length})`}>
            {d.settlements.length === 0 ? (
              <p className="text-sm text-gray-500">No settlements yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {d.settlements.map((x: any) => (
                  <li key={x.id} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2">
                    <div>
                      <p className="font-bold">{x.period}</p>
                      <p className="text-xs text-gray-400">
                        {x.washes} washes · {ngn(x.payable)}
                      </p>
                    </div>
                    <Badge tone={(x.status === "paid" ? "green" : x.status === "approved" ? "amber" : "gray") as "green" | "amber" | "gray"}>
                      {x.status.toUpperCase()}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/settlements" className="mt-3 inline-block text-sm font-bold text-[#48d87c]">
              Manage settlements →
            </Link>
          </Section>

          <Section title={`Reviews (${d.reviews.length})`}>
            {d.reviews.length === 0 ? (
              <p className="text-sm text-gray-500">No reviews yet.</p>
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                {d.reviews.map((r) => (
                  <li key={r.id} className="rounded-xl bg-white/[0.03] px-3 py-2">
                    <span className="font-bold">{"★".repeat(r.rating)}</span>
                    <span className="text-gray-500">{"★".repeat(5 - r.rating)}</span>
                    <span className="ml-2 text-gray-400">{r.subscriberName}</span>
                    {r.body && <p className="mt-1 text-gray-300">{r.body}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
