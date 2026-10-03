"use client";

/* /app/checkout/pay?plan=standard — Paystack payment for the signed-in
 * subscriber. Email is already verified by the time they land here
 * (magic-link flow), so this page only handles the money: Paystack Inline
 * popup (public key) → server-side verification (/api/paystack/verify) →
 * subscription activation → vehicle onboarding / dashboard. */

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getPlans, getProfile, getVehicles } from "@/lib/db/store";
import { getSupabase } from "@/lib/db/supabase";
import type { Plan } from "@/lib/db/types";

const PAYSTACK_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "";
const TEST_MODE = PAYSTACK_KEY.startsWith("pk_test_");

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

function loadPaystack(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window."));
    if (window.PaystackPop) return resolve();
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the payment widget. Check your connection and try again."));
    document.body.appendChild(s);
  });
}

export default function PayPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-xl px-5 py-8">
          <p className="text-gray-400">Loading…</p>
        </section>
      }
    >
      <PayInner />
    </Suspense>
  );
}

function PayInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<"loading" | "ready" | "opening" | "verifying" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  // Tracks whether a payment callback is being verified, so closing the
  // Paystack window mid-verification isn't treated as a cancel.
  const verifyingRef = useRef(false);

  useEffect(() => {
    (async () => {
      const planId = search.get("plan") ?? "standard";
      if (!PAYSTACK_KEY) {
        // Online payments not configured — fall back to the demo checkout.
        router.replace(`/app/checkout?plan=${planId}`);
        return;
      }
      const plans = await getPlans();
      setPlan(plans.find((p) => p.id === planId) ?? plans[1] ?? plans[0]);
      try {
        const prof = await getProfile();
        if (!prof) {
          router.replace("/app/login");
          return;
        }
        setEmail(prof.email ?? "");
        setName(prof.name ?? "");
      } catch {
        router.replace("/app/login");
        return;
      }
      setPhase("ready");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyPayment = async (reference: string) => {
    if (!plan) return;
    verifyingRef.current = true;
    setPhase("verifying");
    setError(null);
    try {
      const { data: sess } = await getSupabase().auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Your session expired. Please log in again.");
      const res = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reference, planId: plan.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? "Payment verification failed.");
      }
      const vs = await getVehicles().catch(() => []);
      router.replace(vs.length > 0 ? "/app" : "/app/onboarding?next=/app");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment verification failed.");
      setPhase("error");
    } finally {
      verifyingRef.current = false;
    }
  };

  const startPayment = async () => {
    if (!plan || !PAYSTACK_KEY || phase === "opening" || phase === "verifying") return;
    setError(null);
    setPhase("opening");
    try {
      await loadPaystack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the payment widget.");
      setPhase("error");
      return;
    }
    const reference = `WS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    try {
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_KEY,
        email,
        amount: Math.round(plan.amount * 100), // Paystack expects kobo
        currency: "NGN",
        ref: reference,
        metadata: { plan_id: plan.id, customer_name: name },
        callback: (res: { reference: string }) => verifyPayment(res.reference),
        onClose: () => {
          // Only treat as a cancel if we aren't already verifying a payment.
          if (verifyingRef.current) return;
          setError("Payment window closed — no charge was made. Tap Pay to try again.");
          setPhase("ready");
        },
      });
      handler.openIframe();
    } catch {
      setError("Could not open the payment window. Please try again.");
      setPhase("error");
    }
  };

  if (phase === "loading" || !plan) {
    return (
      <section className="mx-auto max-w-xl px-5 py-8">
        <p className="text-gray-400">Loading…</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-5 py-8">
      <Link
        href="/app/subscription"
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back to plans
      </Link>

      <div className="rounded-3xl bg-[#111a14] p-7 shadow-sm">
        <h1 className="text-2xl font-bold">Pay for your plan</h1>
        <p className="mt-1 text-sm text-gray-400">
          {plan.name} Plan · {plan.washes} wash credits, valid 30 days
        </p>
        {TEST_MODE && (
          <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs font-semibold text-amber-200">
            Test mode — no real money will move. Use a Paystack test card.
          </p>
        )}

        <div className="mt-6 rounded-2xl bg-[#20a957]/10 p-5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">{plan.name} Plan (30-day credits)</span>
            <span className="font-bold">{plan.price}</span>
          </div>
          <div className="mt-3 flex justify-between border-t border-[#20a957]/20 pt-3 font-bold">
            <span>Total due today</span>
            <span className="text-[#48d87c]">{plan.price}</span>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs font-semibold text-red-400">
            {error}
          </p>
        )}

        {phase === "verifying" ? (
          <div className="mt-6 rounded-2xl bg-white/5 p-8 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#20a957]" />
            <p className="mt-4 font-bold">Verifying your payment…</p>
            <p className="mt-1 text-sm text-gray-400">Please do not close this page.</p>
          </div>
        ) : (
          <>
            <button
              onClick={startPayment}
              disabled={phase === "opening"}
              className={`mt-6 w-full rounded-full py-3 font-bold text-white transition-all duration-200 ${
                phase === "opening"
                  ? "cursor-wait bg-white/15"
                  : "bg-[#20a957] hover:bg-[#1a8a47]"
              }`}
            >
              {phase === "opening" ? "Opening secure payment…" : `Pay ${plan.price}`}
            </button>
            <p className="mt-3 text-center text-xs text-gray-500">
              Secured by Paystack · Card, bank transfer &amp; USSD accepted
            </p>
          </>
        )}
      </div>
    </section>
  );
}
