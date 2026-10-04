"use client";

/* /admin/applications/[ref] — application review: business verification,
 * site inspection checklist, then approve / reject.
 * Workflow: application → review → inspection → approval → activation. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge, ConfirmDialog, EmptyState } from "@/components/ui";
import {
  approveApplication,
  fmtDate,
  getApplication,
  rejectApplication,
} from "@/lib/db/store";
import {
  emptyChecklist,
  getInspection,
  inspectionScore,
  logAdminAction,
  saveInspection,
  INSPECTION_ITEMS,
  type ChecklistEntry,
  type Inspection,
} from "@/lib/db/admin";
import type { PartnerApplication } from "@/lib/db/types";

export default function ApplicationDetailPage() {
  const params = useParams<{ ref: string }>();
  const router = useRouter();
  const ref = decodeURIComponent(params.ref);
  const [app, setApp] = useState<PartnerApplication | null | undefined>(undefined);
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [checklist, setChecklist] = useState<Record<string, ChecklistEntry>>(emptyChecklist());
  const [inspectorName, setInspectorName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [confirmKind, setConfirmKind] = useState<"approve" | "reject" | null>(null);

  const load = async () => {
    const [a, i] = await Promise.all([
      getApplication(ref).catch(() => null),
      getInspection(ref).catch(() => null),
    ]);
    setApp(a ?? null);
    setInspection(i);
    if (i) {
      setChecklist({ ...emptyChecklist(), ...i.checklist });
      setInspectorName(i.inspectorName);
      setNotes(i.notes);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  const setItem = (key: string, pass: boolean | null) =>
    setChecklist((c) => ({ ...c, [key]: { ...c[key], pass } }));
  const setNote = (key: string, note: string) =>
    setChecklist((c) => ({ ...c, [key]: { ...c[key], note } }));

  const persist = async (status: "in_progress" | "passed" | "failed") => {
    setSaving(true);
    try {
      const saved = await saveInspection({
        applicationRef: ref,
        checklist,
        inspectorName,
        notes,
        status,
      });
      setInspection(saved);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Could not save inspection.");
    } finally {
      setSaving(false);
    }
  };

  const decide = async (kind: "approve" | "reject") => {
    if (!app || acting) return;
    setActing(true);
    try {
      if (kind === "approve") {
        const partnerId = await approveApplication(app.ref);
        await logAdminAction(
          "application.approve",
          "partner_application",
          app.ref,
          `Approved ${app.business.carWashName} → partner ${partnerId}` +
            (inspection?.status === "passed"
              ? ` (inspection passed, score ${inspection.score}%)`
              : " (NO passed inspection on file)")
        ).catch(() => {});
        router.push("/admin/applications");
      } else {
        await rejectApplication(app.ref);
        await logAdminAction(
          "application.reject",
          "partner_application",
          app.ref,
          `Rejected ${app.business.carWashName}`
        ).catch(() => {});
        router.push("/admin/applications");
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Action failed.");
      setActing(false);
    }
  };

  if (app === undefined) return <p className="text-gray-400">Loading…</p>;
  if (app === null)
    return (
      <EmptyState
        icon="🔍"
        title="Application not found"
        body="The reference may be wrong or the application was removed."
      />
    );

  const score = inspectionScore(checklist);
  const answered = INSPECTION_ITEMS.filter(
    (i) => checklist[i.key]?.pass !== null && checklist[i.key]?.pass !== undefined
  ).length;
  const inspectionPassed = inspection?.status === "passed";
  const isPending = app.status === "pending";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/applications"
        className="text-sm font-semibold text-[#48d87c]"
      >
        ← All applications
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-sm text-gray-500">{app.ref}</p>
          <h1 className="mt-1 text-3xl font-bold">{app.business.carWashName}</h1>
          <p className="mt-1 text-sm text-gray-400">
            Submitted {fmtDate(app.submittedAt)}
          </p>
        </div>
        <Badge
          tone={
            app.status === "approved"
              ? "green"
              : app.status === "rejected"
                ? "red"
                : "amber"
          }
        >
          {app.status.toUpperCase()}
        </Badge>
      </div>

      <div className="mt-6 rounded-3xl bg-[#111a14] p-6 shadow-sm">
        <Section h="Business information" />
        <Rows
          rows={[
            ["Car wash name", app.business.carWashName],
            ["Owner / manager", app.business.ownerName],
            ["Phone", app.business.phone],
            ["WhatsApp", app.business.whatsapp || "—"],
            ["Email", app.business.email],
          ]}
        />
        <Section h="Location" />
        <Rows
          rows={[
            ["Address", app.location.address],
            ["Area", app.location.area],
            ["LGA", app.location.lga],
            ["State", app.location.state],
            ["GPS", app.location.gps || "—"],
          ]}
        />
        <Section h="Operations" />
        <Rows
          rows={[
            ["Opening hours", app.operations.openingHours || "—"],
            ["Wash bays", app.operations.washBays || "—"],
            ["Daily capacity", app.operations.dailyCapacity || "—"],
            ["Years operating", app.operations.yearsOperating || "—"],
            ["Staff count", app.operations.staffCount || "—"],
          ]}
        />
        <Section h="Services" />
        <div className="flex flex-wrap gap-2">
          {[...app.services, app.otherService].filter(Boolean).map((s) => (
            <span
              key={s}
              className="rounded-full bg-[#20a957]/10 px-3 py-1.5 text-sm font-semibold text-[#48d87c]"
            >
              {s}
            </span>
          ))}
        </div>
        <Section h="Verification photos" />
        {app.photos.business.length + app.photos.location.length === 0 ? (
          <p className="text-sm text-gray-400">No photos attached.</p>
        ) : (
          <ul className="space-y-1 text-sm text-gray-300">
            {app.photos.business.map((n) => (
              <li key={n}>🏪 {n}</li>
            ))}
            {app.photos.location.map((n) => (
              <li key={n}>📍 {n}</li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------------- inspection ---------------- */}
      <div className="mt-4 rounded-3xl bg-[#111a14] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">🔍 Site inspection</h2>
          {inspection && (
            <Badge
              tone={
                inspection.status === "passed"
                  ? "green"
                  : inspection.status === "failed"
                    ? "red"
                    : "amber"
              }
            >
              {inspection.status.replace("_", " ").toUpperCase()} · {inspection.score}%
            </Badge>
          )}
        </div>

        {!inspection && isPending ? (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400">
              No inspection on file. Inspect the site against the 10-point
              checklist before approving.
            </p>
            <button
              onClick={() => persist("in_progress")}
              disabled={saving}
              className="mt-4 rounded-full bg-[#20a957] px-8 py-3 font-bold text-white transition-all hover:bg-[#1a8a47] disabled:opacity-50"
            >
              {saving ? "Starting…" : "Start inspection"}
            </button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-gray-400">
              {answered}/{INSPECTION_ITEMS.length} items answered · score {score}%
              {inspection?.inspectorName && ` · by ${inspection.inspectorName}`}
            </p>
            <div className="mt-4 space-y-3">
              {INSPECTION_ITEMS.map((item) => {
                const entry = checklist[item.key];
                return (
                  <div
                    key={item.key}
                    className="rounded-2xl bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold">{item.label}</p>
                      {isPending ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setItem(item.key, true)}
                            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                              entry.pass === true
                                ? "bg-[#20a957] text-white"
                                : "bg-white/5 text-gray-400 hover:bg-white/10"
                            }`}
                          >
                            ✓ Pass
                          </button>
                          <button
                            onClick={() => setItem(item.key, false)}
                            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                              entry.pass === false
                                ? "bg-red-600 text-white"
                                : "bg-white/5 text-gray-400 hover:bg-white/10"
                            }`}
                          >
                            ✗ Fail
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`text-sm font-bold ${
                            entry.pass ? "text-[#48d87c]" : "text-red-400"
                          }`}
                        >
                          {entry.pass ? "✓ Pass" : entry.pass === false ? "✗ Fail" : "—"}
                        </span>
                      )}
                    </div>
                    {isPending ? (
                      <input
                        value={entry.note}
                        onChange={(e) => setNote(item.key, e.target.value)}
                        placeholder="Note (optional)"
                        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-gray-500 focus:border-[#20a957]"
                      />
                    ) : (
                      entry.note && (
                        <p className="mt-1 text-sm text-gray-400">{entry.note}</p>
                      )
                    )}
                  </div>
                );
              })}
            </div>

            {isPending && (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Inspector name
                    </label>
                    <input
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                      placeholder="Who inspected the site?"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-gray-500 focus:border-[#20a957]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Overall notes
                    </label>
                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Summary, concerns, follow-ups…"
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-gray-500 focus:border-[#20a957]"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => persist("in_progress")}
                    disabled={saving}
                    className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold text-gray-300 transition-colors hover:bg-white/5 disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save draft"}
                  </button>
                  <button
                    onClick={() => persist("passed")}
                    disabled={saving}
                    className="rounded-full bg-[#20a957] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#1a8a47] disabled:opacity-50"
                  >
                    ✓ Mark passed
                  </button>
                  <button
                    onClick={() => persist("failed")}
                    disabled={saving}
                    className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-500 disabled:opacity-50"
                  >
                    ✗ Mark failed
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* ---------------- decision ---------------- */}
      {isPending ? (
        <>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setConfirmKind("reject")}
              disabled={acting}
              className="flex-1 rounded-full border border-red-400/40 py-3 font-bold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => setConfirmKind("approve")}
              disabled={acting}
              className="flex-1 rounded-full bg-[#20a957] py-3 font-bold text-white transition-all hover:bg-[#1a8a47] disabled:opacity-50"
            >
              {acting ? "Working…" : "✓ Approve Partner"}
            </button>
          </div>
          {!inspectionPassed && (
            <p className="mt-3 text-center text-xs font-semibold text-[#f5b301]">
              ⚠️ No passed inspection on file — approving without one will be
              flagged in the audit log.
            </p>
          )}
          <p className="mt-2 text-center text-xs text-gray-500">
            Approving publishes this car wash to the user app immediately.
          </p>
        </>
      ) : (
        <p className="mt-4 rounded-2xl bg-[#111a14] p-4 text-center text-sm text-gray-400 shadow-sm">
          This application was {app.status}.{" "}
          <Link href="/admin/applications" className="font-bold text-[#48d87c]">
            Back to queue
          </Link>
        </p>
      )}

      <ConfirmDialog
        open={confirmKind !== null}
        title={confirmKind === "approve" ? "Approve partner" : "Reject application"}
        body={
          confirmKind === "approve"
            ? `${!inspectionPassed ? "⚠️ No passed inspection on file — this will be flagged in the audit log.\n\n" : ""}Approve ${app.business.carWashName} as a WashSMART partner? They'll appear in the user app immediately.`
            : `Reject ${app.business.carWashName}'s application?`
        }
        confirmLabel={confirmKind === "approve" ? "✓ Approve Partner" : "Reject"}
        danger={confirmKind === "reject"}
        onConfirm={() => {
          const k = confirmKind;
          setConfirmKind(null);
          if (k) decide(k);
        }}
        onCancel={() => setConfirmKind(null)}
      />
    </div>
  );
}

function Section({ h }: { h: string }) {
  return (
    <h2 className="mb-3 mt-6 text-sm font-bold text-gray-400 first:mt-0">
      {h.toUpperCase()}
    </h2>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <div className="divide-y divide-white/10 rounded-2xl bg-[#0a0f0c]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
          <span className="text-gray-400">{k}</span>
          <span className="text-right font-semibold">{v}</span>
        </div>
      ))}
    </div>
  );
}
