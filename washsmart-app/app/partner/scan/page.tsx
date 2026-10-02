"use client";

/* /partner/scan — simulated camera viewfinder + manual token entry.
 * "Simulate camera scan" reads the subscriber's latest demo token from the
 * shared store (same browser). Manual entry accepts a pasted token.
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getLastToken } from "@/lib/db/store";

export default function PartnerScanPage() {
  return (
    <Suspense
      fallback={
        <section className="py-8">
          <p className="text-gray-500">Loading…</p>
        </section>
      }
    >
      <PartnerScanInner />
    </Suspense>
  );
}

function PartnerScanInner() {
  const router = useRouter();
  const [manual, setManual] = useState("");
  const [error, setError] = useState("");

  const goVerify = (token: string) => {
    if (!token.trim()) {
      setError("Please scan or paste a QR token first.");
      return;
    }
    router.push(`/partner/verify?token=${encodeURIComponent(token.trim())}`);
  };

  const simulateCamera = () => {
    const t = getLastToken();
    if (!t) {
      setError(
        "No subscriber QR found on this device yet. Open the subscriber's “My Wash QR” screen first, or paste a token below."
      );
      return;
    }
    goVerify(t);
  };

  return (
    <section className="mx-auto max-w-xl py-8">
      <Link
        href="/partner/dashboard"
        className="mb-5 inline-block text-sm font-semibold text-[#168846]"
      >
        ← Back
      </Link>

      <div className="rounded-3xl bg-[#063c28] p-8 text-center text-white">
        <p className="text-sm text-white/60">PARTNER SCANNER</p>
        <h1 className="mt-2 text-2xl font-bold">Scan Subscriber QR</h1>

        <div className="relative mx-auto mt-8 h-64 w-64 rounded-2xl border-2 border-dashed border-white/30">
          <div className="absolute left-3 top-3 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-[#2ed06a]" />
          <div className="absolute right-3 top-3 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-[#2ed06a]" />
          <div className="absolute bottom-3 left-3 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-[#2ed06a]" />
          <div className="absolute bottom-3 right-3 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-[#2ed06a]" />
          <div className="absolute inset-x-8 top-1/2 h-0.5 animate-pulse bg-[#2ed06a]/70" />
        </div>

        <p className="mt-6 text-sm text-white/70">
          Point the camera at the subscriber's WashSMART QR code.
        </p>

        <button
          onClick={simulateCamera}
          className="mt-6 w-full rounded-xl bg-[#2ed06a] py-3 font-bold text-white"
        >
          Simulate Camera Scan
        </button>

        <div className="mt-6 border-t border-white/15 pt-6 text-left">
          <p className="text-sm font-semibold text-white/80">
            Or enter the token manually
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={manual}
              onChange={(e) => {
                setManual(e.target.value);
                setError("");
              }}
              placeholder="Paste QR token…"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-mono text-xs text-white placeholder:text-white/40"
            />
            <button
              onClick={() => goVerify(manual)}
              className="shrink-0 rounded-xl bg-white px-5 font-bold text-[#063c28]"
            >
              Verify
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-amber-300">{error}</p>}
        </div>
      </div>
    </section>
  );
}
