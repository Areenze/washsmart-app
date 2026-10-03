"use client";

/* /app/profile — name/phone + vehicles + account settings. */

import { useEffect, useState } from "react";
import Link from "next/link";
import ReferralCard from "@/components/referral-card";
import {
  Card,
  Field,
  PrimaryButton,
  SectionTitle,
  inputClass,
} from "@/components/ui";
import {
  fmtDate,
  getMySubscription,
  getProfile,
  getVehicles,
  saveProfile,
  saveVehicles,
  signOut,
} from "@/lib/db/store";
import type { Profile, Subscription, Vehicle } from "@/lib/db/types";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>({ name: "", email: "", phone: "" });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [saved, setSaved] = useState(false);
  const [newVehicle, setNewVehicle] = useState({ label: "", plate: "", color: "" });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    (async () => {
      setProfile((await getProfile()) ?? { name: "", email: "", phone: "" });
      setVehicles(await getVehicles());
      setSubscription(await getMySubscription());
    })();
  }, []);

  const nameOk = profile.name.trim().length > 1;
  const phoneOk = profile.phone.trim().replace(/\D/g, "").length >= 7;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim());

  const save = async () => {
    setTouched(true);
    if (!nameOk || !phoneOk || !emailOk) return;
    await saveProfile({
      name: profile.name.trim(),
      email: profile.email.trim(),
      phone: profile.phone.trim(),
      area: profile.area?.trim() || undefined,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const addVehicle = async () => {
    if (newVehicle.label.trim().length < 2) return;
    const v: Vehicle = {
      id: `v-${Date.now().toString(36)}`,
      label: newVehicle.label.trim(),
      plate: newVehicle.plate.trim().toUpperCase(),
      color: newVehicle.color.trim(),
    };
    const next = [...vehicles, v];
    setVehicles(next);
    await saveVehicles(next);
    setNewVehicle({ label: "", plate: "", color: "" });
  };

  const removeVehicle = async (id: string) => {
    const next = vehicles.filter((v) => v.id !== id);
    setVehicles(next);
    await saveVehicles(next);
  };

  return (
    <section className="mx-auto max-w-3xl px-5 py-8">
      <Link
        href="/app"
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back
      </Link>
      <SectionTitle>Profile</SectionTitle>

      <Card>
        <h2 className="text-lg font-bold">Account details</h2>
        <div className="mt-4 space-y-4">
          <Field
            label="Full name"
            required
            error={touched && !nameOk ? "Please enter your name." : undefined}
          >
            <input
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              autoComplete="name"
              className={inputClass(touched && !nameOk)}
            />
          </Field>
          <Field
            label="Email address"
            required
            error={touched && !emailOk ? "Please enter a valid email." : undefined}
          >
            <input
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              inputMode="email"
              autoComplete="email"
              className={inputClass(touched && !emailOk)}
            />
          </Field>
          <Field
            label="Phone number"
            required
            error={touched && !phoneOk ? "Please enter a valid phone number." : undefined}
          >
            <input
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              inputMode="tel"
              autoComplete="tel"
              className={inputClass(touched && !phoneOk)}
            />
          </Field>
          <Field label="Area in Lagos">
            <input
              value={profile.area ?? ""}
              onChange={(e) => setProfile({ ...profile, area: e.target.value })}
              placeholder="e.g. Lekki Phase 1"
              className={inputClass(false)}
            />
          </Field>
        </div>
        <PrimaryButton onClick={save} className="mt-6 w-full sm:w-auto sm:px-8">
          {saved ? "Saved ✓" : "Save Changes"}
        </PrimaryButton>
      </Card>

      <Card className="mt-6">
        <h2 className="text-lg font-bold">My vehicles</h2>
        {vehicles.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400">
            No vehicles added yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-xl bg-[#0a0f0c] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#20a957]/10 text-xl">
                    🚗
                  </div>
                  <div>
                    <p className="font-bold">{v.label}</p>
                    <p className="text-xs text-gray-400">
                      {[v.plate, v.color].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeVehicle(v.id)}
                  className="text-sm font-semibold text-red-400"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-3">
          <input
            value={newVehicle.label}
            onChange={(e) => setNewVehicle({ ...newVehicle, label: e.target.value })}
            placeholder="Car, e.g. Toyota Camry"
            className={inputClass(false)}
          />
          <input
            value={newVehicle.plate}
            onChange={(e) => setNewVehicle({ ...newVehicle, plate: e.target.value })}
            placeholder="Plate, e.g. LAG-123-AB"
            className={inputClass(false)}
          />
          <input
            value={newVehicle.color}
            onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
            placeholder="Color"
            className={inputClass(false)}
          />
        </div>
        <button
          onClick={addVehicle}
          disabled={newVehicle.label.trim().length < 2}
          className="mt-3 rounded-full border border-[#20a957] px-5 py-2.5 transition-all duration-200 hover:bg-[#20a957]/10 text-sm font-bold text-[#48d87c] disabled:opacity-40"
        >
          + Add Vehicle
        </button>
      </Card>

      <Card className="mt-6">
        <h2 className="text-lg font-bold">Subscription</h2>
        {subscription ? (
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Plan</span>
              <span className="font-bold">
                {subscription.planName} · {subscription.price}/30 days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Washes remaining</span>
              <span className="font-bold">
                {subscription.washesRemaining} of {subscription.washesTotal}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Credits expire</span>
              <span className="font-bold">{fmtDate(subscription.expiresAt)}</span>
            </div>
            <Link
              href="/app/subscription"
              className="mt-3 block rounded-full bg-[#20a957] py-3 transition-all duration-200 hover:bg-[#1a8a47] text-center font-bold text-white"
            >
              Manage Subscription
            </Link>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-gray-400">No active subscription.</p>
            <Link
              href="/app/subscription"
              className="mt-3 block rounded-full bg-[#20a957] py-3 transition-all duration-200 hover:bg-[#1a8a47] text-center font-bold text-white"
            >
              View Plans
            </Link>
          </div>
        )}
      </Card>

      <div className="mt-6">
        <ReferralCard />
      </div>

      <button
        onClick={async () => {
          await signOut();
          window.location.href = "/";
        }}
        className="mt-6 w-full rounded-full border border-white/10 py-3 transition-all duration-200 hover:border-white/25 text-sm font-bold text-gray-400"
      >
        Log out
      </button>
    </section>
  );
}
