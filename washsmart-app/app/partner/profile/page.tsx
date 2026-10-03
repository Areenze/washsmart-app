"use client";

/* /partner/profile — business profile (view + edit basics + open toggle). */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, Field, PrimaryButton, inputClass } from "@/components/ui";
import {
  currentPartnerSession,
  getPartner,
  updatePartner,
} from "@/lib/db/store";
import type { Partner } from "@/lib/db/types";

const ALL_SERVICES = [
  "Exterior wash",
  "Interior cleaning",
  "Vacuum",
  "Engine wash",
  "Wax/polish",
  "Detailing",
];

export default function PartnerProfilePage() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [hours, setHours] = useState("");
  const [phone, setPhone] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await currentPartnerSession();
      if (!p) return;
      const fresh = await getPartner(p.id);
      if (!fresh) return;
      setPartner(fresh);
      setHours(fresh.hours);
      setPhone(fresh.phone);
      setServices(fresh.services);
    })();
  }, []);

  if (!partner) return <p className="py-8 text-gray-400">Loading…</p>;

  const toggleOpen = async () => {
    const next = partner.status === "Open" ? "Closed" : "Open";
    const updated = await updatePartner(partner.id, { status: next });
    if (updated) setPartner({ ...updated });
  };

  const toggleService = (s: string) =>
    setServices((list) =>
      list.includes(s) ? list.filter((x) => x !== s) : [...list, s]
    );

  const save = async () => {
    const updated = await updatePartner(partner.id, { hours, phone, services });
    if (updated) {
      setPartner({ ...updated });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <section className="mx-auto max-w-3xl py-8">
      <Link
        href="/partner/dashboard"
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back
      </Link>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Business Profile</h1>
        <Badge tone={partner.status === "Open" ? "green" : "gray"}>
          {partner.status === "Open" ? "OPEN NOW" : "CLOSED"}
        </Badge>
      </div>

      <Card className="mt-6">
        <h2 className="text-lg font-bold">{partner.name}</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Owner</span>
            <span className="font-semibold">{partner.ownerName}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Address</span>
            <span className="text-right font-semibold">
              {partner.address}, {partner.area}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">LGA / State</span>
            <span className="font-semibold">
              {partner.lga}, {partner.state}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Rating</span>
            <span className="font-semibold">
              ⭐ {partner.rating.toFixed(1)} ({partner.reviews} reviews)
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Capacity</span>
            <span className="font-semibold">
              {partner.bays} bays · ~{partner.dailyCapacity} cars/day
            </span>
          </div>
        </div>

        <button
          onClick={toggleOpen}
          className={`mt-5 w-full rounded-full py-3 transition-all duration-200 font-bold text-white ${
            partner.status === "Open" ? "bg-gray-500" : "bg-[#20a957] hover:bg-[#1a8a47]"
          }`}
        >
          {partner.status === "Open" ? "Mark as Closed" : "Mark as Open"}
        </button>
      </Card>

      <Card className="mt-6">
        <h2 className="text-lg font-bold">Edit details</h2>
        <div className="mt-4 space-y-4">
          <Field label="Opening hours">
            <input
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className={inputClass(false)}
            />
          </Field>
          <Field label="Phone number">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              className={inputClass(false)}
            />
          </Field>
          <div>
            <p className="mb-2 text-sm font-semibold">Services</p>
            <div className="flex flex-wrap gap-2">
              {ALL_SERVICES.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleService(s)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                    services.includes(s)
                      ? "bg-[#20a957] text-white"
                      : "bg-[#20a957]/10 text-[#48d87c]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <PrimaryButton onClick={save} className="mt-6 w-full sm:w-auto sm:px-8">
          {saved ? "Saved ✓" : "Save Changes"}
        </PrimaryButton>
      </Card>
    </section>
  );
}
