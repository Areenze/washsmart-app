"use client";

/* /admin/settlements — partner payout control: pending → approved → paid.
 * Every transition is written to the admin audit log. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { fmtDate } from "@/lib/db/store";
import {
  adminApproveSettlement,
  adminGenerateSettlement,
  adminListSettlements,
  adminMarkSettlementPaid,
  adminPendingAccruals,
  ngn,
  type AdminSettlementRow,
  type PendingAccrual,
} from "@/lib/db/admin";

const tone = (s: string) =>
  s === "paid" ? "green" : s === "approved" ? "amber" : "gray";

export default function AdminSettlementsPage() {
  const [rows, setRows] = useState<AdminSettlementRow[]>([]);
  const [accruals, setAccruals] = useState<PendingAccrual[]>([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async (s: string) => {
    setLoading(true);
    try {
      const [r, a] = await Promise.all([
        adminListSettlements(s),
        adminPendingAccruals().catch(() => [] as PendingAccrual[]),
      ]);
      setRows(r);
      setAccruals(a);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const generate = async (a: PendingAccrual) => {
    if (
      !window.confirm(
        `Generate settlement for ${a.partnerName}?\n\n${a.washes} washes · ${ngn(a.gross)} gross − ${ngn(a.fee)} fee (10%) = ${ngn(a.payable)} payable.\n\nThis is recorded in the audit log.`
      )
    )
      return;
    setBusy(a.partnerId);
    try {
      const id = await adminGenerateSettlement(a.partnerId);
      window.alert(`Settlement ${id} created — now pending approval.`);
      await load(status);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not generate.");
    } finally {
      setBusy(null);
    }
  };

  const approve = async (r: AdminSettlementRow) => {
    if (
      !window.confirm(
        `Approve settlement ${r.id} — ${r.partnerName}, ${r.period}, ${ngn(r.payable)} payable?\n\nThis is recorded in the audit log.`
      )
    )
      return;
    setBusy(r.id);
    try {
      await adminApproveSettlement(r.id);
      await load(status);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not approve.");
    } finally {
      setBusy(null);
    }
  };

  const markPaid = async (r: AdminSettlementRow) => {
    const ref = window.prompt(
      `Mark settlement ${r.id} as PAID — ${r.partnerName}, ${ngn(r.payable)}.\n\nEnter the bank/Paystack transfer reference:`
    );
    if (!ref) return;
    setBusy(r.id);
    try {
      await adminMarkSettlementPaid(r.id, ref.trim());
      await load(status);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not mark paid.");
    } finally {
      setBusy(null);
    }
  };

  const totalPayable = rows.reduce((s, r) => s + r.payable, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Settlements</h1>
          <p className="mt-1 text-gray-400">
            {rows.length} {status} · {ngn(totalPayable)} total payable
          </p>
        </div>
        <div className="flex gap-2">
          {(["pending", "approved", "paid", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${
                status === f ? "bg-[#20a957] text-white" : "bg-[#111a14] text-gray-400"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-gray-400">Loading…</p>
      ) : (
        <>
          {accruals.length > 0 && (
            <div className="mb-6 rounded-3xl border border-[#f5b301]/20 bg-[#f5b301]/[0.04] p-5">
              <h2 className="font-bold">⚠️ Ready to settle</h2>
              <p className="mt-1 text-sm text-gray-400">
                Verified washes accrued but not yet in a settlement. Generating
                creates a pending settlement for your approval.
              </p>
              <div className="mt-4 space-y-2">
                {accruals.map((a) => (
                  <div
                    key={a.partnerId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#111a14] px-4 py-3"
                  >
                    <div className="text-sm">
                      <Link
                        href={`/admin/partners/${a.partnerId}`}
                        className="font-bold text-[#48d87c]"
                      >
                        {a.partnerName}
                      </Link>
                      <p className="text-gray-400">
                        {a.washes} wash{a.washes === 1 ? "" : "es"} ·{" "}
                        {ngn(a.gross)} − {ngn(a.fee)} fee ={" "}
                        <span className="font-bold text-[#e9f2ec]">
                          {ngn(a.payable)}
                        </span>{" "}
                        payable
                      </p>
                    </div>
                    <button
                      onClick={() => generate(a)}
                      disabled={busy === a.partnerId}
                      className="rounded-full bg-[#f5b301] px-5 py-2 text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-50"
                    >
                      {busy === a.partnerId ? "…" : "Generate settlement"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rows.length === 0 ? (
            <EmptyState
              icon="🏦"
              title={`No ${status} settlements`}
              body="Generate a settlement above to start the approval flow."
            />
          ) : (
        <div className="mt-6 space-y-3">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl bg-[#111a14] p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">
                    <Link href={`/admin/partners/${r.partnerId}`} className="text-[#48d87c]">
                      {r.partnerName}
                    </Link>{" "}
                    <span className="text-gray-400">· {r.period}</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    {r.washes} washes · <span className="font-bold text-[#e9f2ec]">{ngn(r.payable)}</span> payable
                  </p>
                  <p className="mt-1 font-mono text-xs text-gray-500">
                    {r.id} · due {fmtDate(r.settlementDate)}
                    {r.paidAt && ` · paid ${fmtDate(r.paidAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={tone(r.status) as "green" | "amber" | "gray"}>
                    {r.status.toUpperCase()}
                  </Badge>
                  {r.status === "pending" && (
                    <button
                      onClick={() => approve(r)}
                      disabled={busy === r.id}
                      className="rounded-full bg-[#20a957] px-5 py-2 text-sm font-bold text-white transition-all hover:bg-[#1a8a47] disabled:opacity-50"
                    >
                      {busy === r.id ? "…" : "Approve"}
                    </button>
                  )}
                  {r.status === "approved" && (
                    <button
                      onClick={() => markPaid(r)}
                      disabled={busy === r.id}
                      className="rounded-full border border-[#20a957] px-5 py-2 text-sm font-bold text-[#48d87c] transition-all hover:bg-[#20a957]/10 disabled:opacity-50"
                    >
                      {busy === r.id ? "…" : "Mark paid"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
          )}
        </>
      )}
    </div>
  );
}
