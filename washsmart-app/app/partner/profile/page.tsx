"use client";

/* /partner/profile — business profile (view + edit basics + open toggle). */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge, Card, DAY_HOURS, Field, PrimaryButton, inputClass } from "@/components/ui";
import {
  currentPartnerSession,
  getPartner,
  updatePartner,
} from "@/lib/db/store";
import { deletePhoto, uploadPhoto } from "@/lib/db/photos";
import type { Partner } from "@/lib/db/types";

const ALL_SERVICES = [
  "Exterior wash",
  "Interior cleaning",
  "Vacuum",
  "Engine wash",
  "Wax/polish",
  "Detailing",
];

// Parse a stored hours string like "07:00AM - 07:00PM" or "8:00am – 6:00pm"
// back into picker values.
function parseHours(raw: string): [string, string] {
  const parts = raw.split(/[–—-]/).map((s) => s.trim());
  const norm = (s: string) =>
    s.toLowerCase().replace(/\s+/g, "").replace(/^0(\d:)/, "$1");
  const find = (s: string) =>
    DAY_HOURS.find((h) => h.value === norm(s))?.value ?? "";
  return [find(parts[0] ?? ""), find(parts[1] ?? "")];
}

export default function PartnerProfilePage() {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [hours, setHours] = useState("");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [hoursError, setHoursError] = useState<string | undefined>();
  const [phone, setPhone] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const p = await currentPartnerSession();
      if (!p) return;
      const fresh = await getPartner(p.id);
      if (!fresh) return;
      setPartner(fresh);
      setHours(fresh.hours);
      const [o, c] = parseHours(fresh.hours);
      setOpenTime(o);
      setCloseTime(c);
      setPhone(fresh.phone);
      setServices(fresh.services);
      setPhotos(fresh.photos ?? []);
    })();
  }, []);

  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0 || !partner) return;
    setPhotoError(null);
    setUploadingPhoto(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        urls.push(await uploadPhoto(f, `partners/${partner.id}`));
      }
      const next = [...photos, ...urls].slice(0, 12);
      const updated = await updatePartner(partner.id, { photos: next });
      if (updated) {
        setPartner({ ...updated });
        setPhotos(updated.photos ?? next);
      }
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhotoAt = async (url: string) => {
    if (!partner) return;
    const next = photos.filter((u) => u !== url);
    const updated = await updatePartner(partner.id, { photos: next });
    if (updated) {
      setPartner({ ...updated });
      setPhotos(updated.photos ?? next);
    }
    deletePhoto(url).catch(() => {});
  };

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

  const setHourPart = (which: "open" | "close", v: string) => {
    const o = which === "open" ? v : openTime;
    const c = which === "close" ? v : closeTime;
    if (which === "open") setOpenTime(v);
    else setCloseTime(v);
    setHours(o && c ? `${o} – ${c}` : "");
    setHoursError(undefined);
  };

  const save = async () => {
    const oi = DAY_HOURS.findIndex((h) => h.value === openTime);
    const ci = DAY_HOURS.findIndex((h) => h.value === closeTime);
    if (oi < 0 || ci < 0) {
      setHoursError("Select your opening and closing hours.");
      return;
    }
    if (ci <= oi) {
      setHoursError("Closing time must be after opening time.");
      return;
    }
    setHoursError(undefined);
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
        <h2 className="text-lg font-bold">Photos</h2>
        <p className="mt-1 text-sm text-gray-400">
          Show subscribers your wash — shopfront, bays, finished cars. Photos
          appear on your listing in the subscriber app.
        </p>
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="mt-4 block w-full rounded-2xl border-2 border-dashed border-white/20 p-6 text-center hover:border-[#20a957] disabled:opacity-50"
        >
          <div className="text-3xl">📷</div>
          <p className="mt-1 text-sm font-semibold text-[#48d87c]">
            {uploadingPhoto ? "Uploading…" : "Add photos"}
          </p>
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          aria-label="Add partner photos"
          className="sr-only"
          disabled={uploadingPhoto}
          onChange={(e) => {
            addPhotos(e.target.files);
            e.target.value = "";
          }}
        />
        {photoError && (
          <p className="mt-2 text-sm font-semibold text-red-400">{photoError}</p>
        )}
        {photos.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {photos.map((u) => (
              <div key={u} className="relative overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="Partner photo" className="h-24 w-full object-cover" loading="lazy" />
                <button
                  type="button"
                  onClick={() => removePhotoAt(u)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-bold text-white"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <h2 className="text-lg font-bold">Edit details</h2>
        <div className="mt-4 space-y-4">
          <Field label="Opening hours" error={hoursError}>
            <div className="grid grid-cols-2 gap-4">
              <select
                aria-label="Opening time"
                value={openTime}
                onChange={(e) => setHourPart("open", e.target.value)}
                className={inputClass(!!hoursError)}
              >
                <option value="">Opening…</option>
                {DAY_HOURS.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Closing time"
                value={closeTime}
                onChange={(e) => setHourPart("close", e.target.value)}
                className={inputClass(!!hoursError)}
              >
                <option value="">Closing…</option>
                {DAY_HOURS.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
            </div>
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
