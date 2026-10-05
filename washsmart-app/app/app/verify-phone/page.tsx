"use client";

/* /app/verify-phone — verify the subscriber's mobile number via Termii OTP.
 *
 * Step 1: confirm the phone number → we send a 6-digit SMS code.
 * Step 2: enter the code → the number is marked verified.
 * Never traps: ?next= decides where success lands, and "Skip for now"
 * is always visible.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getProfile } from "@/lib/db/store";
import { getSupabase } from "@/lib/db/supabase";
import { isValidPhone, normalizePhone, PHONE_ERROR } from "@/lib/phone";
import { Card, PrimaryButton, SectionTitle } from "@/components/ui";

async function authedFetch(path: string, body: unknown) {
  const { data: sess } = await getSupabase().auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Your session expired. Please log in again.");
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<{ ok: boolean; error?: string; phone?: string }>;
}

function VerifyPhoneInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = (() => {
    const n = search.get("next");
    return n && n.startsWith("/") && !n.startsWith("//") ? n : "/app";
  })();

  const [step, setStep] = useState<"phone" | "code" | "done">("phone");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { session },
        } = await getSupabase().auth.getSession();
        if (!session) {
          router.replace("/app/login?next=/app/verify-phone");
          return;
        }
        const p = await getProfile();
        if (p?.phone_verified) {
          router.replace(next);
          return;
        }
        if (p?.phone) setPhone(p.phone);
      } catch {
        /* stay on the page */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const phoneOk = isValidPhone(phone);

  const sendCode = async () => {
    setTouched(true);
    if (!phoneOk) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/verify-phone/send", {
        phone: normalizePhone(phone),
      });
      if (!res.ok) throw new Error(res.error ?? "Could not send the code.");
      setStep("code");
      setCooldown(60);
    } catch (e: any) {
      setError(e?.message ?? "Could not send the code.");
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async () => {
    if (pin.replace(/\D/g, "").length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/verify-phone/confirm", { pin });
      if (!res.ok) throw new Error(res.error ?? "Verification failed.");
      setStep("done");
      window.setTimeout(() => router.replace(next), 1200);
    } catch (e: any) {
      setError(e?.message ?? "Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-5 py-10">
      <Card>
        <SectionTitle>Verify your phone number</SectionTitle>
        <p className="mt-2 text-sm text-gray-400">
          We&apos;ll send a 6-digit code by SMS to confirm this number is yours.
        </p>

        {step === "phone" && (
          <div className="mt-6">
            <label className="text-sm font-semibold">
              Phone number
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="e.g. 0803 123 4567"
                inputMode="tel"
                autoComplete="tel"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-gray-500 focus:border-[#34d186]"
              />
            </label>
            {touched && !phoneOk && (
              <p className="mt-1 text-xs text-red-400">{PHONE_ERROR}</p>
            )}
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <PrimaryButton onClick={sendCode} disabled={busy} className="mt-5 w-full">
              {busy ? "Sending…" : "Send code"}
            </PrimaryButton>
          </div>
        )}

        {step === "code" && (
          <div className="mt-6">
            <p className="text-sm text-gray-400">
              Code sent to <span className="font-bold text-white">{normalizePhone(phone)}</span>
            </p>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] text-white outline-none placeholder:text-gray-600 focus:border-[#34d186]"
            />
            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            <PrimaryButton onClick={confirmCode} disabled={busy} className="mt-5 w-full">
              {busy ? "Verifying…" : "Verify"}
            </PrimaryButton>
            <button
              onClick={sendCode}
              disabled={busy || cooldown > 0}
              className="mt-3 w-full text-sm font-semibold text-[#66dca4] disabled:opacity-40"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="mt-6 rounded-2xl bg-[#34d186]/10 p-5 text-center">
            <p className="text-lg font-bold text-[#66dca4]">✓ Number verified</p>
            <p className="mt-1 text-sm text-gray-400">Taking you back…</p>
          </div>
        )}

        <Link
          href={next}
          className="mt-6 block text-center text-sm font-semibold text-gray-400 hover:text-white"
        >
          Skip for now →
        </Link>
      </Card>
    </main>
  );
}

export default function VerifyPhonePage() {
  return (
    <Suspense>
      <VerifyPhoneInner />
    </Suspense>
  );
}
