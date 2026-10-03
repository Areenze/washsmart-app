"use client";

/* /app/onboarding — after email verification, before plan selection.
 * The subscriber registers their vehicles (first one required, more optional)
 * and their Lagos area. A subscription covers registered cars only; every
 * wash deducts from the subscriber's wash-credit pool.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getProfile,
  getVehicles,
  saveVehicles,
  setProfileArea,
} from "@/lib/db/store";
import type { Vehicle } from "@/lib/db/types";

type Draft = { label: string; plate: string; color: string };

const emptyDraft = (): Draft => ({ label: "", plate: "", color: "" });

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-xl px-5 py-8">
          <p className="text-gray-400">Loading…</p>
        </section>
      }
    >
      <OnboardingInner />
    </Suspense>
  );
}

function OnboardingInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/app/subscription";
  const safeNext = next.startsWith("/app") ? next : "/app/subscription";

  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Draft[]>([emptyDraft()]);
  const [area, setArea] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getProfile();
      if (!p) {
        router.replace("/app/signup");
        return;
      }
      // Note: subscribed users are welcome here too (e.g. they subscribed
      // before vehicle registration existed) — the form prefills and
      // "Continue" follows ?next=.
      const vs = await getVehicles().catch(() => []);
      if (vs.length > 0) {
        setDrafts(
          vs.map((v) => ({ label: v.label, plate: v.plate, color: v.color }))
        );
      }
      if (p.area) setArea(p.area);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setDraft = (i: number, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  const validDraft = (d: Draft) =>
    d.label.trim().length >= 2 && d.plate.trim().length >= 1;
  const allValid = drafts.length > 0 && drafts.every(validDraft);
  const areaOk = area.trim().length >= 2;
  const canContinue = allValid && areaOk;

  const save = async () => {
    setTouched(true);
    setError(null);
    if (!canContinue) return;
    setSaving(true);
    try {
      const vehicles: Vehicle[] = drafts.map((d, i) => ({
        id: `draft-${i}`,
        label: d.label.trim(),
        plate: d.plate.trim().toUpperCase(),
        color: d.color.trim(),
      }));
      await saveVehicles(vehicles);
      await setProfileArea(area.trim());
      router.replace(safeNext);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again."
      );
      setSaving(false);
    }
  };

  const inputClass = (bad: boolean) =>
    `w-full rounded-xl border px-4 py-3 text-sm text-[#e9f2ec] outline-none placeholder:text-gray-500 focus:border-[#20a957] ${
      bad ? "border-red-400 bg-red-500/10" : "border-white/10 bg-white/5"
    }`;

  if (loading) {
    return (
      <section className="mx-auto max-w-xl px-5 py-16 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#20a957]" />
        <p className="mt-5 font-bold">Setting up your account…</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-5 py-8">
      <p className="text-sm font-semibold tracking-wide text-[#65e28e]">
        STEP 2 OF 3 — YOUR VEHICLES
      </p>
      <h1 className="mt-2 text-3xl font-bold">Register your vehicles</h1>
      <p className="mt-2 text-sm text-gray-400">
        Your subscription covers your registered cars only. Register each car
        you want us to wash — every wash deducts from your wash credits,
        whichever car you bring.
      </p>

      <div className="mt-6 space-y-4">
        {drafts.map((d, i) => (
          <div
            key={i}
            className="rounded-3xl border border-white/5 bg-[#111a14] p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold">
                {i === 0 ? "First vehicle" : `Vehicle ${i + 1}`}{" "}
                {i === 0 && (
                  <span className="ml-1 text-xs font-semibold text-red-400">
                    required
                  </span>
                )}
              </h2>
              {drafts.length > 1 && (
                <button
                  onClick={() => setDrafts((ds) => ds.filter((_, j) => j !== i))}
                  className="text-xs font-semibold text-gray-500 hover:text-red-400"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Make & model <span className="text-red-400">*</span>
                </label>
                <input
                  value={d.label}
                  onChange={(e) => setDraft(i, { label: e.target.value })}
                  placeholder="e.g. Toyota Camry"
                  className={inputClass(
                    touched && d.label.trim().length < 2
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Plate number <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={d.plate}
                    onChange={(e) => setDraft(i, { plate: e.target.value })}
                    placeholder="e.g. LND 123 XY"
                    className={inputClass(
                      touched && d.plate.trim().length < 1
                    )}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Color
                  </label>
                  <input
                    value={d.color}
                    onChange={(e) => setDraft(i, { color: e.target.value })}
                    placeholder="e.g. Black"
                    className={inputClass(false)}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => setDrafts((ds) => [...ds, emptyDraft()])}
          className="w-full rounded-full border border-dashed border-white/20 py-3 text-sm font-bold text-gray-300 transition-all duration-200 hover:border-[#20a957] hover:text-[#48d87c]"
        >
          + Add another vehicle
        </button>

        <div className="rounded-3xl border border-white/5 bg-[#111a14] p-5">
          <label className="mb-1 block text-sm font-semibold">
            Your area in Lagos <span className="text-red-400">*</span>
          </label>
          <input
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. Lekki Phase 1"
            className={inputClass(touched && !areaOk)}
          />
          <p className="mt-2 text-xs text-gray-500">
            Helps us match you with nearby partner washes.
          </p>
        </div>
      </div>

      {touched && !canContinue && (
        <p className="mt-4 text-sm font-semibold text-red-400">
          Please complete each vehicle (make, model and plate number) and your
          area to continue.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-400">
          {error}
        </p>
      )}

      <button
        onClick={save}
        disabled={saving}
        className={`mt-6 w-full rounded-full py-3 font-bold text-white transition-all duration-200 ${
          saving
            ? "cursor-wait bg-white/15"
            : "bg-[#20a957] hover:bg-[#1a8a47] active:scale-[0.98]"
        }`}
      >
        {saving ? "Saving…" : "Continue to plans →"}
      </button>
      <p className="mt-3 text-center text-xs text-gray-500">
        You can add or remove vehicles anytime from your profile.
      </p>
    </section>
  );
}
