"use client";

/* /partner/scan — real camera QR scanner + manual token entry fallback.
 * Camera decode uses html5-qrcode; on success we route to /partner/verify.
 * Note: camera requires a real browser (Safari/Chrome) — in-app webviews
 * (e.g. opened inside another app) block camera access on iOS.
 */

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";

const READER_ID = "washsmart-qr-reader";

export default function PartnerScanPage() {
  return (
    <Suspense
      fallback={
        <section className="py-8">
          <p className="text-gray-400">Loading…</p>
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
  const [cameraError, setCameraError] = useState("");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const doneRef = useRef(false);

  const goVerify = (token: string) => {
    if (!token.trim()) {
      setError("Please scan or paste a QR token first.");
      return;
    }
    router.push(`/partner/verify?token=${encodeURIComponent(token.trim())}`);
  };

  const stopScanner = async () => {
    try {
      const s = scannerRef.current;
      if (s) {
        if (s.isScanning) await s.stop();
        s.clear();
      }
    } catch {
      /* already stopped */
    }
    scannerRef.current = null;
    setScanning(false);
  };

  const startScanner = async () => {
    setCameraError("");
    setError("");
    doneRef.current = false;
    try {
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded: string) => {
          if (doneRef.current) return;
          doneRef.current = true;
          stopScanner().finally(() => goVerify(decoded));
        },
        () => {
          /* per-frame decode miss — ignore */
        }
      );
    } catch (e: any) {
      setScanning(false);
      scannerRef.current = null;
      const msg = String(e?.message ?? e ?? "");
      if (/permission|notallowed|denied/i.test(msg)) {
        setCameraError(
          "Camera access was blocked. Allow camera access for this site (iPhone: Settings → Safari → Camera → Allow), then try again. If you opened this inside another app, open it in Safari instead."
        );
      } else if (/notfound|nodevice|devices/i.test(msg)) {
        setCameraError("No camera found on this device. Paste the token below instead.");
      } else {
        setCameraError(
          "Couldn't start the camera. Paste the token below instead — or open this page in Safari/Chrome."
        );
      }
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="mx-auto max-w-xl py-8">
      <Link
        href="/partner/dashboard"
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back
      </Link>

      <div className="rounded-3xl bg-[#063c28] p-8 text-center text-white">
        <p className="text-sm text-white/60">PARTNER SCANNER</p>
        <h1 className="mt-2 text-2xl font-bold">Scan Subscriber QR</h1>

        <div className="mx-auto mt-8 w-full max-w-sm overflow-hidden rounded-2xl bg-black/40">
          <div id={READER_ID} className="[&>video]:rounded-2xl" />
          {!scanning && (
            <div className="relative h-64">
              <div className="absolute left-3 top-3 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-[#2ed06a]" />
              <div className="absolute right-3 top-3 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-[#2ed06a]" />
              <div className="absolute bottom-3 left-3 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-[#2ed06a]" />
              <div className="absolute bottom-3 right-3 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-[#2ed06a]" />
              <div className="absolute inset-x-8 top-1/2 h-0.5 animate-pulse bg-[#2ed06a]/70" />
            </div>
          )}
        </div>

        {cameraError && (
          <p className="mx-auto mt-4 max-w-sm text-sm text-amber-300">{cameraError}</p>
        )}

        {!scanning ? (
          <button
            onClick={startScanner}
            className="mt-6 w-full rounded-full bg-[#2ed06a] py-3 font-bold text-white transition-all duration-200 hover:bg-[#25b856]"
          >
            Start Camera Scanner
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="mt-6 w-full rounded-full bg-white/10 py-3 font-bold text-white"
          >
            Stop Scanner
          </button>
        )}

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
              className="w-full rounded-xl border border-white/20 bg-[#111a14]/10 px-4 py-3 font-mono text-xs text-white placeholder:text-white/40"
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
