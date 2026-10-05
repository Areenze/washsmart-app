"use client";

/* /admin/promotions — create and manage promo codes. */

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ui";
import {
  adminCreatePromo,
  adminListPromos,
  adminTogglePromo,
  type PromoCode,
} from "@/lib/db/promos";
import { getPlans } from "@/lib/db/store";
import type { Plan } from "@/lib/db/types";

const KIND_LABEL: Record<string, string> = {
  percent: "% off",
  fixed: "₦ off",
  bonus_washes: "bonus washes",
};

function fmtValue(p: PromoCode) {
  if (p.kind === "percent") return `${p.value}% off`;
  if (p.kind === "fixed") return `₦${Number(p.value).toLocaleString("en-NG")} off`;
  return `+${p.value} washes`;
}

export default function AdminPromotionsPage() {
  const [promos, setPromos] = useState<PromoCode[] | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form state
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"percent" | "fixed" | "bonus_washes">("percent");
  const [value, setValue] = useState("");
  const [planIds, setPlanIds] = useState<string[]>([]);
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const load = async () => {
    const [p, pl] = await Promise.all([
      adminListPromos().catch(() => [] as PromoCode[]),
      getPlans().catch(() => [] as Plan[]),
    ]);
    setPromos(p);
    setPlans(pl);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlan = (id: string) =>
    setPlanIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const create = async () => {
    setError(null);
    const v = Number(value);
    if (!code.trim()) return setError("Give the code a name (e.g. LAUNCH20).");
    if (!v || v <= 0) return setError("Enter a value greater than zero.");
    if (kind === "percent" && v > 100)
      return setError("Percent off can't exceed 100.");
    setBusy(true);
    try {
      await adminCreatePromo({
        code: code.trim(),
        kind,
        value: v,
        planIds: planIds.length > 0 ? planIds : null,
        maxUses: maxUses ? Number(maxUses) : null,
        startsAt: null,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setShowForm(false);
      setCode("");
      setValue("");
      setPlanIds([]);
      setMaxUses("");
      setExpiresAt("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Could not create that code.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (p: PromoCode) => {
    await adminTogglePromo(p.id, !p.active).catch(() => {});
    await load();
  };

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Promotions</h1>
          <p className="mt-1 text-sm text-gray-400">
            Discount codes and bonus-wash offers for launch campaigns.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-full bg-[#34d186] px-5 py-2 text-sm font-bold text-white"
        >
          {showForm ? "Close" : "New code"}
        </button>
      </div>

      {showForm && (
        <div className="mt-4 rounded-2xl bg-[#111a14] p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-bold">Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="LAUNCH20"
                className="w-full rounded-xl border border-white/10 bg-[#0a0f0c] px-4 py-3 uppercase"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">Type</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as any)}
                className="w-full rounded-xl border border-white/10 bg-[#0a0f0c] px-4 py-3"
              >
                <option value="percent">Percent off</option>
                <option value="fixed">Fixed ₦ off</option>
                <option value="bonus_washes">Bonus washes</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">
                Value ({KIND_LABEL[kind]})
              </label>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                type="number"
                min="1"
                placeholder={kind === "percent" ? "20" : kind === "fixed" ? "2000" : "2"}
                className="w-full rounded-xl border border-white/10 bg-[#0a0f0c] px-4 py-3"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">
                Max redemptions (blank = unlimited)
              </label>
              <input
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                type="number"
                min="1"
                placeholder="100"
                className="w-full rounded-xl border border-white/10 bg-[#0a0f0c] px-4 py-3"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">
                Plans (none selected = all plans)
              </label>
              <div className="flex flex-wrap gap-2">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlan(p.id)}
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      planIds.includes(p.id)
                        ? "bg-[#34d186] text-white"
                        : "bg-white/5 text-gray-400"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">
                Expires (blank = never)
              </label>
              <input
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                type="date"
                className="w-full rounded-xl border border-white/10 bg-[#0a0f0c] px-4 py-3"
              />
            </div>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <button
            onClick={create}
            disabled={busy}
            className="mt-4 rounded-full bg-[#34d186] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create code"}
          </button>
        </div>
      )}

      {promos === null ? (
        <p className="mt-6 text-gray-400">Loading…</p>
      ) : promos.length === 0 ? (
        <p className="mt-6 text-gray-400">
          No promo codes yet. Create one for the launch.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl bg-[#111a14]">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Offer</th>
                <th className="px-4 py-3">Plans</th>
                <th className="px-4 py-3">Used</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {promos.map((p) => (
                <tr key={p.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-mono font-bold">{p.code}</td>
                  <td className="px-4 py-3 text-gray-400">{fmtValue(p)}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {p.planIds ? p.planIds.join(", ") : "All"}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {p.usedCount}
                    {p.maxUses ? ` / ${p.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {p.expiresAt
                      ? new Date(p.expiresAt).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggle(p)}
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        p.active
                          ? "bg-green-500/15 text-green-400"
                          : "bg-white/10 text-gray-400"
                      }`}
                    >
                      {p.active ? "Active" : "Off"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
