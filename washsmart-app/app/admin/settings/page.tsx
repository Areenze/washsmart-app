"use client";

/* /admin/settings — audit log, admin users, plan configuration. */

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui";
import {
  adminGrantAdmin,
  adminListAdmins,
  adminListAuditLog,
  adminListPlans,
  adminRevokeAdmin,
  adminUpdatePlan,
  type AdminUser,
  type AuditEntry,
  type PlanRow,
} from "@/lib/db/admin";

type Tab = "audit" | "admins" | "plans";

/* ---------------- audit log ---------------- */

function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => setEntries(await adminListAuditLog(150).catch(() => [])))();
  }, []);

  const shown = (entries ?? []).filter(
    (e) =>
      !filter ||
      e.action.toLowerCase().includes(filter.toLowerCase()) ||
      e.adminEmail.toLowerCase().includes(filter.toLowerCase()) ||
      e.detail.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter by action, admin, or detail…"
        className="w-full max-w-md rounded-xl border border-white/10 bg-[#0a0f0c] px-4 py-2.5 text-sm"
      />
      {entries === null ? (
        <p className="mt-4 text-gray-400">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="mt-4 text-gray-400">No audit entries yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl bg-[#111a14]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase text-gray-500">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id} className="border-b border-white/5 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-gray-400">
                    {new Date(e.createdAt).toLocaleString("en-NG", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold">{e.adminName}</p>
                    <p className="text-xs text-gray-500">{e.adminEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-xs">
                      {e.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------- admin users ---------------- */

function AdminsTab() {
  const [admins, setAdmins] = useState<AdminUser[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<AdminUser | null>(null);

  const load = async () =>
    setAdmins(await adminListAdmins().catch(() => []));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grant = async () => {
    setError(null);
    if (!email.trim()) return;
    setBusy(true);
    try {
      await adminGrantAdmin(email.trim());
      setEmail("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Could not grant admin.");
    } finally {
      setBusy(false);
    }
  };

  const runRevoke = async () => {
    if (!revoking) return;
    setError(null);
    try {
      await adminRevokeAdmin(revoking.id);
      setRevoking(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Could not revoke admin.");
      setRevoking(null);
    }
  };

  return (
    <div>
      <div className="flex max-w-md gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && grant()}
          placeholder="teammate@washsmart.ng"
          type="email"
          className="flex-1 rounded-xl border border-white/10 bg-[#0a0f0c] px-4 py-2.5 text-sm"
        />
        <button
          onClick={grant}
          disabled={busy || !email.trim()}
          className="rounded-xl bg-[#20a957] px-5 text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? "…" : "Grant admin"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <p className="mt-2 text-xs text-gray-500">
        The account must already exist (they sign up first, then you grant).
      </p>

      <div className="mt-4 space-y-2">
        {(admins ?? []).map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-2xl bg-[#111a14] p-4"
          >
            <div>
              <p className="font-bold">{a.name}</p>
              <p className="text-sm text-gray-400">{a.email}</p>
            </div>
            <button
              onClick={() => setRevoking(a)}
              className="rounded-full bg-white/5 px-4 py-1.5 text-xs font-bold text-gray-400 hover:bg-red-500/15 hover:text-red-400"
            >
              Revoke
            </button>
          </div>
        ))}
        {admins !== null && admins.length === 0 && (
          <p className="text-gray-400">No admins found.</p>
        )}
      </div>

      <ConfirmDialog
        open={revoking !== null}
        title={`Revoke admin from ${revoking?.name}?`}
        body={`They will lose access to /admin immediately.\n\n${revoking?.email ?? ""}`}
        confirmLabel="Revoke admin"
        danger
        onConfirm={runRevoke}
        onCancel={() => setRevoking(null)}
      />
    </div>
  );
}

/* ---------------- plans ---------------- */

function PlansTab() {
  const [plans, setPlans] = useState<PlanRow[] | null>(null);
  const [editing, setEditing] = useState<Record<string, { amount: string; washes: string; popular: boolean }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<PlanRow | null>(null);

  const load = async () => {
    const ps = await adminListPlans().catch(() => [] as PlanRow[]);
    setPlans(ps);
    const e: Record<string, { amount: string; washes: string; popular: boolean }> = {};
    for (const p of ps)
      e[p.id] = { amount: String(p.amount), washes: String(p.washes), popular: p.popular };
    setEditing(e);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSave = async () => {
    if (!confirming) return;
    const v = editing[confirming.id];
    setError(null);
    setSaving(confirming.id);
    try {
      await adminUpdatePlan(confirming.id, {
        amount: Number(v.amount),
        washes: Number(v.washes),
        popular: v.popular,
      });
      setConfirming(null);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Could not save that plan.");
    } finally {
      setSaving(null);
    }
  };

  if (plans === null) return <p className="text-gray-400">Loading…</p>;

  return (
    <div>
      <p className="max-w-2xl text-sm text-gray-400">
        Changes apply to <span className="font-bold text-white">new purchases only</span> —
        existing subscriptions keep the price and washes they were sold with.
      </p>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {plans.map((p) => {
          const v = editing[p.id];
          if (!v) return null;
          const dirty =
            Number(v.amount) !== p.amount ||
            Number(v.washes) !== p.washes ||
            v.popular !== p.popular;
          return (
            <div key={p.id} className="rounded-2xl bg-[#111a14] p-5">
              <p className="font-bold">{p.name}</p>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">
                    Price (₦)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={v.amount}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        [p.id]: { ...prev[p.id], amount: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0a0f0c] px-4 py-2.5"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-gray-500">
                    Washes
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={v.washes}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        [p.id]: { ...prev[p.id], washes: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#0a0f0c] px-4 py-2.5"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={v.popular}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        [p.id]: { ...prev[p.id], popular: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 accent-[#20a957]"
                  />
                  Mark as popular
                </label>
                <button
                  onClick={() => setConfirming(p)}
                  disabled={!dirty || saving === p.id}
                  className="w-full rounded-full bg-[#20a957] py-2 text-sm font-bold text-white disabled:opacity-30"
                >
                  {saving === p.id ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirming !== null}
        title={`Update the ${confirming?.name} plan?`}
        body={
          confirming
            ? `₦${confirming.amount.toLocaleString("en-NG")} / ${confirming.washes} washes → ₦${Number(editing[confirming.id]?.amount ?? 0).toLocaleString("en-NG")} / ${editing[confirming.id]?.washes} washes.\n\nNew purchases only — existing subscribers are unaffected. This is recorded in the audit log.`
            : ""
        }
        confirmLabel="Update plan"
        onConfirm={runSave}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}

/* ---------------- page ---------------- */

export default function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>("audit");
  const tabs: { id: Tab; label: string }[] = [
    { id: "audit", label: "Audit log" },
    { id: "admins", label: "Admins" },
    { id: "plans", label: "Plans" },
  ];

  return (
    <section>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-gray-400">
        Who can administer the network, what they did, and what plans cost.
      </p>
      <div className="mt-4 flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${
              tab === t.id
                ? "bg-[#20a957] text-white"
                : "bg-[#111a14] text-gray-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "audit" && <AuditTab />}
        {tab === "admins" && <AdminsTab />}
        {tab === "plans" && <PlansTab />}
      </div>
    </section>
  );
}
