"use client";

/* /admin/settlements — partner payout control: pending → approved → paid.
 * Every transition is written to the admin audit log. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, ConfirmDialog, EmptyState } from "@/components/ui";
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

interface PendingDialog {
  kind: "generate" | "approve" | "paid";
  title: string;
  body: string;
  confirmLabel: string;
  inputLabel?: string;
  inputPlaceholder?: string;
  requireInput?: boolean;
  run: (input: string) => Promise<void>;
}

export default function AdminSettlementsPage() {
  const [rows, setRows] = useState<AdminSettlementRow[]>([]);
  const [accruals, setAccruals] = useState<PendingAccrual[]>([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<PendingDialog | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  const runDialog = async (d: PendingDialog, input: string) => {
    setBusy(d.kind);
    try {
      await d.run(input);
      setDialog(null);
      await load(status);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const askGenerate = (a: PendingAccrual) =>
    setDialog({
      kind: "generate",
      title: "Generate settlement",
      body: `${a.partnerName}\n\n${a.washes} wash${a.washes === 1 ? "" : "es"} · ${ngn(a.gross)} gross − ${ngn(a.fee)} fee (10%) = ${ngn(a.payable)} payable.\n\nThis creates a pending settlement for approval. Recorded in the audit log.`,
      confirmLabel: "Generate",
      run: async () => {
        const id = await adminGenerateSettlement(a.partnerId);
        setNotice(`Settlement ${id} created — now pending approval.`);
      },
    });

  const askApprove = (r: AdminSettlementRow) =>
    setDialog({
      kind: "approve",
      title: "Approve settlement",
      body: `${r.id} — ${r.partnerName}, ${r.period}\n\n${ngn(r.payable)} payable.\n\nRecorded in the audit log.`,
      confirmLabel: "Approve",
      run: async () => {
        await adminApproveSettlement(r.id);
        setNotice(`Settlement ${r.id} approved.`);
      },
    });

  const askPaid = (r: AdminSettlementRow) =>
    setDialog({
      kind: "paid",
      title: "Mark settlement paid",
      body: `${r.id} — ${r.partnerName}, ${r.period}\n\n${ngn(r.payable)} payable. Only confirm after the bank transfer is done.\n\nRecorded in the audit log.`,
      confirmLabel: "Mark paid",
      inputLabel: "Bank / Paystack transfer reference",
      inputPlaceholder: "e.g. TRF-2026-10-04-001",
      requireInput: true,
      run: async (ref) => {
        await adminMarkSettlementPaid(r.id, ref);
        setNotice(`Settlement ${r.id} marked as paid.`);
      },
    });

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

      {notice && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-[#20a957]/10 px-5 py-3 text-sm font-semibold text-[#48d87c]">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="text-lg leading-none">
            ×
          </button>
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-gray-400">Loading…</p>
      ) : (
        <>
          {accruals.length > 0 && (
            <div className="mb-6 mt-4 rounded-3xl border border-[#f5b301]/20 bg-[#f5b301]/[0.04] p-5">
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
                      onClick={() => askGenerate(a)}
                      disabled={busy !== null}
                      className="rounded-full bg-[#f5b301] px-5 py-2 text-sm font-bold text-black transition-all hover:brightness-110 disabled:opacity-50"
                    >
                      Generate settlement
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
                <div key={r.id} className="rounded-2xl bg-[#111a14] p-5 shadow-sm">
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
                          onClick={() => askApprove(r)}
                          disabled={busy !== null}
                          className="rounded-full bg-[#20a957] px-5 py-2 text-sm font-bold text-white transition-all hover:bg-[#1a8a47] disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                      {r.status === "approved" && (
                        <button
                          onClick={() => askPaid(r)}
                          disabled={busy !== null}
                          className="rounded-full border border-[#20a957] px-5 py-2 text-sm font-bold text-[#48d87c] transition-all hover:bg-[#20a957]/10 disabled:opacity-50"
                        >
                          Mark paid
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

      <ConfirmDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        body={dialog?.body ?? ""}
        confirmLabel={dialog?.confirmLabel ?? "Confirm"}
        inputLabel={dialog?.inputLabel}
        inputPlaceholder={dialog?.inputPlaceholder}
        requireInput={dialog?.requireInput}
        onConfirm={(v) => dialog && runDialog(dialog, v)}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
