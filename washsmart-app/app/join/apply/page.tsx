"use client";

/* /join/apply — partner registration wizard.
 * Steps: business → location → operations → services → verification →
 * review → success (ref WS-2026-XXXX, Pending Review).
 */

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Brand,
  Card,
  DAY_HOURS,
  Field,
  Logo,
  PrimaryButton,
  StepDots,
  inputClass,
} from "@/components/ui";
import { submitApplication, type ApplicationInput } from "@/lib/db/store";
import { deletePhoto, uploadPhoto } from "@/lib/db/photos";
import type { PartnerApplication } from "@/lib/db/types";

const SERVICE_OPTIONS = [
  "Exterior wash",
  "Interior cleaning",
  "Vacuum",
  "Engine wash",
  "Wax/polish",
  "Detailing",
];

const STEP_TITLES = [
  "Business Information",
  "Location",
  "Business Operations",
  "Services",
  "Verification",
  "Review & Submit",
];

type Draft = ApplicationInput;

const emptyDraft: Draft = {
  business: { carWashName: "", ownerName: "", phone: "", whatsapp: "", email: "" },
  location: { address: "", area: "", lga: "", state: "Lagos", gps: "" },
  operations: {
    openingHours: "",
    openingTime: "",
    closingTime: "",
    washBays: "",
    dailyCapacity: "",
    yearsOperating: "",
    staffCount: "",
  },
  services: [],
  otherService: "",
  photos: { business: [], location: [] },
};

const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
const digitsOk = (v: string) => v.trim().replace(/\D/g, "").length >= 7;

const composeHours = (open: string, close: string) =>
  open && close ? `${open} – ${close}` : "";

function PhotoPicker({
  kind,
  title,
  hint,
  icon,
  urls,
  uploading,
  onFiles,
  onRemove,
}: {
  kind: "business" | "location";
  title: string;
  hint: string;
  icon: string;
  urls: string[];
  uploading: boolean;
  onFiles: (kind: "business" | "location", files: FileList | null) => void;
  onRemove: (kind: "business" | "location", url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <p className="mb-3 text-xs text-gray-400">{hint}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="block w-full rounded-2xl border-2 border-dashed border-white/20 p-6 text-center hover:border-[#20a957] disabled:opacity-50"
      >
        <div className="text-3xl">{icon}</div>
        <p className="mt-1 text-sm font-semibold text-[#48d87c]">
          {uploading ? "Uploading…" : "Choose photos"}
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        aria-label={title}
        className="sr-only"
        disabled={uploading}
        onChange={(e) => {
          onFiles(kind, e.target.files);
          e.target.value = "";
        }}
      />
      {urls.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {urls.map((u) => (
            <div key={u} className="relative overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="Upload" className="h-24 w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(kind, u)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-bold text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ApplyWizard() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState<PartnerApplication | null>(null);
  const [uploading, setUploading] = useState<"" | "business" | "location">("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Groups this draft's uploads under one storage prefix.
  const draftId = useRef(
    `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
  const [locating, setLocating] = useState(false);

  const setBiz = (k: keyof Draft["business"], v: string) =>
    setDraft((d) => ({ ...d, business: { ...d.business, [k]: v } }));
  const setLoc = (k: keyof Draft["location"], v: string) =>
    setDraft((d) => ({ ...d, location: { ...d.location, [k]: v } }));
  const setOps = (k: keyof Draft["operations"], v: string) =>
    setDraft((d) => ({ ...d, operations: { ...d.operations, [k]: v } }));

  // Opening/closing time pickers keep the composed openingHours string in sync.
  const setHours = (which: "openingTime" | "closingTime", v: string) =>
    setDraft((d) => {
      const ops = { ...d.operations, [which]: v };
      return {
        ...d,
        operations: {
          ...ops,
          openingHours: composeHours(ops.openingTime, ops.closingTime),
        },
      };
    });

  const stepValid = (): boolean => {
    const b = draft.business;
    const l = draft.location;
    const o = draft.operations;
    switch (step) {
      case 0:
        return (
          b.carWashName.trim().length > 1 &&
          b.ownerName.trim().length > 1 &&
          digitsOk(b.phone) &&
          emailOk(b.email)
        );
      case 1:
        return (
          l.address.trim().length > 3 &&
          l.area.trim().length > 1 &&
          l.lga.trim().length > 1 &&
          l.state.trim().length > 1
        );
      case 2: {
        const oi = DAY_HOURS.findIndex((h) => h.value === o.openingTime);
        const ci = DAY_HOURS.findIndex((h) => h.value === o.closingTime);
        return oi >= 0 && ci > oi;
      }
      case 3:
        return draft.services.length > 0 || draft.otherService.trim().length > 1;
      case 4:
        return true; // photos optional in demo
      default:
        return true;
    }
  };

  // Opening-hours picker state for the step-2 Field (error text + red ring).
  const hoursState = (): { error?: string; bad: boolean } => {
    const o = draft.operations;
    const oi = DAY_HOURS.findIndex((h) => h.value === o.openingTime);
    const ci = DAY_HOURS.findIndex((h) => h.value === o.closingTime);
    if (!touched) return { bad: false };
    if (oi < 0 || ci < 0)
      return { error: "Select your opening and closing hours.", bad: true };
    if (ci <= oi)
      return { error: "Closing time must be after opening time.", bad: true };
    return { bad: false };
  };
  const hs = hoursState();

  const next = () => {
    setTouched(true);
    if (!stepValid()) return;
    setTouched(false);
    setStep((s) => Math.min(s + 1, STEP_TITLES.length - 1));
    window.scrollTo({ top: 0 });
  };

  const back = () => {
    setTouched(false);
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0 });
  };

  const useMyLocation = () => {
    setLocating(true);
    // Demo GPS pin — in production this comes from the Maps picker.
    window.setTimeout(() => {
      setLoc(
        "gps",
        `${(6.4 + Math.random() * 0.3).toFixed(4)}, ${(3.3 + Math.random() * 0.3).toFixed(4)}`
      );
      setLocating(false);
    }, 900);
  };

  const onFiles = async (kind: "business" | "location", files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(kind);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        urls.push(await uploadPhoto(f, `applications/${draftId.current}`));
      }
      setDraft((d) => ({
        ...d,
        photos: { ...d.photos, [kind]: [...d.photos[kind], ...urls] },
      }));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading("");
    }
  };

  const removePhoto = (kind: "business" | "location", url: string) => {
    setDraft((d) => ({
      ...d,
      photos: { ...d.photos, [kind]: d.photos[kind].filter((u) => u !== url) },
    }));
    deletePhoto(url).catch(() => {});
  };

  const submit = async () => {
    const app = await submitApplication(draft);
    setDone(app);
    window.scrollTo({ top: 0 });
  };

  const toggleService = (s: string) =>
    setDraft((d) => ({
      ...d,
      services: d.services.includes(s)
        ? d.services.filter((x) => x !== s)
        : [...d.services, s],
    }));

  return (
    <main className="min-h-screen bg-[#0a0f0c] text-[#e9f2ec]">
      <header className="border-b bg-[#111a14] px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <Brand />
          </Link>
          <span className="text-sm font-semibold text-gray-400">
            Partner Application
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-5 py-8">
        {done ? (
          <SuccessScreen app={done} />
        ) : (
          <>
            <Link
              href="/join"
              className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
            >
              ← Back
            </Link>
            <p className="text-sm font-semibold text-[#48d87c]">
              STEP {step + 1} OF {STEP_TITLES.length}
            </p>
            <h1 className="mt-1 text-3xl font-bold">{STEP_TITLES[step]}</h1>
            <div className="mt-4">
              <StepDots current={step + 1} total={STEP_TITLES.length} />
            </div>

            <Card className="mt-6">
              {step === 0 && (
                <div className="space-y-4">
                  <Field
                    label="Car wash name"
                    required
                    error={
                      touched && draft.business.carWashName.trim().length <= 1
                        ? "Please enter your car wash name."
                        : undefined
                    }
                  >
                    <input
                      value={draft.business.carWashName}
                      onChange={(e) => setBiz("carWashName", e.target.value)}
                      placeholder="e.g. Crystal Shine Auto Wash"
                      className={inputClass(
                        touched && draft.business.carWashName.trim().length <= 1
                      )}
                    />
                  </Field>
                  <Field
                    label="Owner / manager name"
                    required
                    error={
                      touched && draft.business.ownerName.trim().length <= 1
                        ? "Please enter the owner or manager name."
                        : undefined
                    }
                  >
                    <input
                      value={draft.business.ownerName}
                      onChange={(e) => setBiz("ownerName", e.target.value)}
                      placeholder="e.g. Chidi Obi"
                      autoComplete="name"
                      className={inputClass(
                        touched && draft.business.ownerName.trim().length <= 1
                      )}
                    />
                  </Field>
                  <Field
                    label="Phone number"
                    required
                    error={
                      touched && !digitsOk(draft.business.phone)
                        ? "Please enter a valid phone number."
                        : undefined
                    }
                  >
                    <input
                      value={draft.business.phone}
                      onChange={(e) => setBiz("phone", e.target.value)}
                      placeholder="e.g. 0805 678 9012"
                      inputMode="tel"
                      autoComplete="tel"
                      className={inputClass(touched && !digitsOk(draft.business.phone))}
                    />
                  </Field>
                  <Field label="WhatsApp number" hint="If different from phone above">
                    <input
                      value={draft.business.whatsapp}
                      onChange={(e) => setBiz("whatsapp", e.target.value)}
                      placeholder="e.g. 0805 678 9012"
                      inputMode="tel"
                      className={inputClass(false)}
                    />
                  </Field>
                  <Field
                    label="Email address"
                    required
                    error={
                      touched && !emailOk(draft.business.email)
                        ? "Please enter a valid email address."
                        : undefined
                    }
                  >
                    <input
                      value={draft.business.email}
                      onChange={(e) => setBiz("email", e.target.value)}
                      placeholder="e.g. info@crystalshine.ng"
                      inputMode="email"
                      autoComplete="email"
                      className={inputClass(touched && !emailOk(draft.business.email))}
                    />
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-4">
                  <Field
                    label="Street address"
                    required
                    error={
                      touched && draft.location.address.trim().length <= 3
                        ? "Please enter the street address."
                        : undefined
                    }
                  >
                    <input
                      value={draft.location.address}
                      onChange={(e) => setLoc("address", e.target.value)}
                      placeholder="e.g. 30 Herbert Macaulay Way"
                      className={inputClass(
                        touched && draft.location.address.trim().length <= 3
                      )}
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field
                      label="Area"
                      required
                      error={
                        touched && draft.location.area.trim().length <= 1
                          ? "Required."
                          : undefined
                      }
                    >
                      <input
                        value={draft.location.area}
                        onChange={(e) => setLoc("area", e.target.value)}
                        placeholder="e.g. Yaba"
                        className={inputClass(
                          touched && draft.location.area.trim().length <= 1
                        )}
                      />
                    </Field>
                    <Field
                      label="LGA"
                      required
                      error={
                        touched && draft.location.lga.trim().length <= 1
                          ? "Required."
                          : undefined
                      }
                    >
                      <input
                        value={draft.location.lga}
                        onChange={(e) => setLoc("lga", e.target.value)}
                        placeholder="e.g. Lagos Mainland"
                        className={inputClass(
                          touched && draft.location.lga.trim().length <= 1
                        )}
                      />
                    </Field>
                  </div>
                  <Field
                    label="State"
                    required
                    error={
                      touched && draft.location.state.trim().length <= 1
                        ? "Required."
                        : undefined
                    }
                  >
                    <input
                      value={draft.location.state}
                      onChange={(e) => setLoc("state", e.target.value)}
                      className={inputClass(
                        touched && draft.location.state.trim().length <= 1
                      )}
                    />
                  </Field>
                  <Field
                    label="Map location / GPS"
                    hint="Drop a pin so subscribers can find you (demo)"
                  >
                    <div className="flex gap-2">
                      <input
                        value={draft.location.gps}
                        onChange={(e) => setLoc("gps", e.target.value)}
                        placeholder="lat, lng"
                        className={inputClass(false)}
                      />
                      <button
                        onClick={useMyLocation}
                        disabled={locating}
                        className="shrink-0 rounded-xl border border-[#20a957] px-4 text-sm font-bold text-[#48d87c] disabled:opacity-50"
                      >
                        {locating ? "Locating…" : "📍 Pin"}
                      </button>
                    </div>
                  </Field>
                  <div className="flex h-40 items-center justify-center rounded-2xl bg-[#20a957]/15">
                    <div className="text-center">
                      <div className="text-4xl">🗺️</div>
                      <p className="mt-1 text-sm font-semibold text-gray-300">
                        {draft.location.gps
                          ? `Pinned: ${draft.location.gps}`
                          : "Interactive map goes here"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <Field label="Opening hours" required error={hs.error}>
                    <div className="grid grid-cols-2 gap-4">
                      <select
                        aria-label="Opening time"
                        value={draft.operations.openingTime}
                        onChange={(e) => setHours("openingTime", e.target.value)}
                        className={inputClass(hs.bad)}
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
                        value={draft.operations.closingTime}
                        onChange={(e) => setHours("closingTime", e.target.value)}
                        className={inputClass(hs.bad)}
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
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Number of wash bays">
                      <input
                        value={draft.operations.washBays}
                        onChange={(e) => setOps("washBays", e.target.value)}
                        placeholder="e.g. 3"
                        inputMode="numeric"
                        className={inputClass(false)}
                      />
                    </Field>
                    <Field label="Daily capacity (cars)">
                      <input
                        value={draft.operations.dailyCapacity}
                        onChange={(e) => setOps("dailyCapacity", e.target.value)}
                        placeholder="e.g. 40"
                        inputMode="numeric"
                        className={inputClass(false)}
                      />
                    </Field>
                    <Field label="Years operating">
                      <input
                        value={draft.operations.yearsOperating}
                        onChange={(e) => setOps("yearsOperating", e.target.value)}
                        placeholder="e.g. 2"
                        inputMode="numeric"
                        className={inputClass(false)}
                      />
                    </Field>
                    <Field label="Staff count">
                      <input
                        value={draft.operations.staffCount}
                        onChange={(e) => setOps("staffCount", e.target.value)}
                        placeholder="e.g. 6"
                        inputMode="numeric"
                        className={inputClass(false)}
                      />
                    </Field>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <p className="mb-3 text-sm font-semibold">
                    Which services do you offer?{" "}
                    <span className="text-red-400">*</span>
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SERVICE_OPTIONS.map((s) => (
                      <label
                        key={s}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
                          draft.services.includes(s)
                            ? "border-[#20a957] bg-[#20a957]/10 text-[#48d87c]"
                            : "border-white/10"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={draft.services.includes(s)}
                          onChange={() => toggleService(s)}
                          className="h-4 w-4 accent-[#20a957]"
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Field label="Other services">
                      <input
                        value={draft.otherService}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, otherService: e.target.value }))
                        }
                        placeholder="e.g. Ceramic coating"
                        className={inputClass(false)}
                      />
                    </Field>
                  </div>
                  {touched &&
                    draft.services.length === 0 &&
                    draft.otherService.trim().length <= 1 && (
                      <p className="mt-2 text-xs text-red-400">
                        Please select at least one service.
                      </p>
                    )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <PhotoPicker
                    kind="business"
                    title="Business photos"
                    hint="Shopfront, wash bays, equipment — helps us verify your business."
                    icon="📷"
                    urls={draft.photos.business}
                    uploading={uploading === "business"}
                    onFiles={onFiles}
                    onRemove={removePhoto}
                  />
                  <PhotoPicker
                    kind="location"
                    title="Location photos"
                    hint="Street view / landmark nearby."
                    icon="🏢"
                    urls={draft.photos.location}
                    uploading={uploading === "location"}
                    onFiles={onFiles}
                    onRemove={removePhoto}
                  />
                  {uploadError && (
                    <p className="text-sm font-semibold text-red-400">{uploadError}</p>
                  )}
                </div>
              )}

              {step === 5 && (
                <ReviewScreen draft={draft} onSubmit={submit} onEdit={() => { setStep(4); window.scrollTo({ top: 0 }); }} />
              )}

              {step < 5 && (
                <div className="mt-8 flex gap-3">
                  {step > 0 && (
                    <button
                      onClick={back}
                      className="rounded-xl border border-white/10 px-6 py-3 font-bold text-gray-400"
                    >
                      Back
                    </button>
                  )}
                  <PrimaryButton onClick={next} className="flex-1">
                    Continue →
                  </PrimaryButton>
                </div>
              )}
            </Card>
          </>
        )}
      </section>
    </main>
  );
}

function ReviewScreen({
  draft,
  onSubmit,
  onEdit,
}: {
  draft: Draft;
  onSubmit: () => void;
  onEdit: () => void;
}) {
  const rows: [string, string][] = [
    ["Car wash", draft.business.carWashName],
    ["Owner / manager", draft.business.ownerName],
    ["Phone", draft.business.phone],
    ["WhatsApp", draft.business.whatsapp || "—"],
    ["Email", draft.business.email],
    ["Address", `${draft.location.address}, ${draft.location.area}`],
    ["LGA / State", `${draft.location.lga}, ${draft.location.state}`],
    ["GPS", draft.location.gps || "—"],
    ["Opening hours", draft.operations.openingHours],
    [
      "Operations",
      `${draft.operations.washBays || "—"} bays · ${
        draft.operations.dailyCapacity || "—"
      } cars/day · ${draft.operations.yearsOperating || "—"} yrs · ${
        draft.operations.staffCount || "—"
      } staff`,
    ],
    [
      "Services",
      [...draft.services, draft.otherService].filter(Boolean).join(", ") ||
        "—",
    ],
    [
      "Photos",
      `${draft.photos.business.length + draft.photos.location.length} attached`,
    ],
  ];
  return (
    <div>
      <p className="mb-4 text-sm text-gray-400">
        Please review your application before submitting.
      </p>
      <div className="divide-y divide-white/10 rounded-2xl bg-[#0a0f0c]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
            <span className="text-gray-400">{k}</span>
            <span className="text-right font-semibold">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-8 flex gap-3">
        <button
          onClick={onEdit}
          className="rounded-xl border border-white/10 px-6 py-3 font-bold text-gray-400"
        >
          ← Edit
        </button>
        <PrimaryButton onClick={onSubmit} className="flex-1">
          Submit Application
        </PrimaryButton>
      </div>
      <p className="mt-3 text-center text-xs text-gray-500">
        By submitting you agree to the WashSMART partner terms (demo).
      </p>
    </div>
  );
}

function SuccessScreen({ app }: { app: PartnerApplication }) {
  return (
    <Card className="bg-[#063c28] text-center text-white">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#2ed06a] text-4xl">
        ✓
      </div>
      <h1 className="mt-5 text-3xl font-bold">Application received!</h1>
      <p className="mt-3 text-white/70">
        Thanks, {app.business.ownerName}. Our team will review{" "}
        <span className="font-bold text-white">
          {app.business.carWashName}
        </span>{" "}
        within 48 hours.
      </p>
      <div className="mx-auto mt-6 max-w-sm rounded-2xl bg-[#111a14]/10 p-5">
        <p className="text-xs font-semibold text-white/60">
          APPLICATION REFERENCE
        </p>
        <p className="mt-1 font-mono text-2xl font-bold text-[#65e28e]">
          {app.ref}
        </p>
        <p className="mt-2 inline-block rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300">
          ● PENDING REVIEW
        </p>
      </div>
      <p className="mt-5 text-sm text-white/60">
        Keep this reference — you'll need it to check your application status.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="flex-1 rounded-xl bg-white py-3 text-center font-bold text-[#063c28]"
        >
          Back to Home
        </Link>
        <Link
          href="/partner"
          className="flex-1 rounded-xl border border-white/40 py-3 text-center font-bold"
        >
          Partner Login
        </Link>
      </div>
    </Card>
  );
}
