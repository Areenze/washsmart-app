"use client";

/* /app/auth/callback — landing page for the Supabase email magic link.
 * Exchanges the ?code= for a session, creates the subscription (plan comes
 * from ?plan=), then sends the subscriber to their dashboard. */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  applyReferralCode,
  clearVerifyPending,
  createSubscription,
  currentUserId,
  exchangeCodeForSession,
  getMySubscription,
  getVehicles,
  takeStashedReferralCode,
} from "@/lib/db/store";
import { getSupabase } from "@/lib/db/supabase";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-xl px-5 py-16 text-center">
          <p className="text-gray-400">Verifying…</p>
        </section>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const router = useRouter();
  const search = useSearchParams();
  const mode = search.get("mode");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const code = search.get("code");
        if (code) {
          // PKCE path: exchange the code for a session.
          await exchangeCodeForSession(code);
        } else {
          // Cookie path: Supabase's /verify sometimes establishes the
          // session directly via cookies without issuing a ?code=.
          // Accept it when present instead of erroring out.
          const {
            data: { session },
          } = await getSupabase().auth.getSession();
          if (!session) {
            throw new Error(
              "This link has expired or was already used. Please request a new one."
            );
          }
        }
        // The inbox hop is done — no more pending-verification reminder.
        clearVerifyPending();
        // Attribute a friend's referral link (stashed on /app/signup before
        // the email hop). No-op when there is none or it is invalid.
        const stashedRef = takeStashedReferralCode();
        if (stashedRef) {
          try {
            await applyReferralCode(stashedRef);
          } catch {
            /* referral is best-effort; never block sign-in */
          }
        }
        const existing = await getMySubscription();
        const active = !!existing && existing.status === "active";
        if (mode === "login") {
          // Pure sign-in (from /app/login): never mint a plan here.
        } else if (mode === "signup") {
          // Fresh account from /app/signup: profile exists.
          // No plan yet -> register vehicles, then pick a plan.
          // Already subscribed but no vehicles yet -> register vehicles,
          // then back to the dashboard.
          if (active) {
            const vs = await getVehicles().catch(() => []);
            router.replace(
              vs.length > 0 ? "/app" : "/app/onboarding?next=/app"
            );
          } else {
            router.replace("/app/onboarding");
          }
          return;
        } else if (!active) {
          const planId = search.get("plan") ?? "standard";
          if (process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY) {
            // Real payments: the email is verified — collect payment next.
            // The subscription is minted only after Paystack confirms.
            router.replace(`/app/checkout/pay?plan=${planId}`);
            return;
          }
          await createSubscription({ planId });
          // In-app confirmation for the demo-mint path (the Paystack route
          // sends its own payment-success notification).
          (async () => {
            const { notify } = await import("@/lib/db/notifications");
            const uid = await currentUserId().catch(() => null);
            if (!uid) return;
            const sub = await getMySubscription().catch(() => null);
            await notify(
              uid,
              "subscription_activated",
              `Subscription activated — ${sub?.planName ?? "your plan"}`,
              sub
                ? `${sub.washesTotal} washes, valid until ${new Date(sub.expiresAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}.`
                : "",
              "/app"
            ).catch(() => {});
          })();
          // Checkout-first arrivals never registered vehicles: send them to
          // onboarding before the dashboard (unless they already have cars).
          const vs = await getVehicles().catch(() => []);
          router.replace(vs.length > 0 ? "/app" : "/app/onboarding?next=/app");
          return;
        }
        const rawNext = search.get("next");
        const safeNext =
          rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
            ? rawNext
            : "/app";
        router.replace(safeNext);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Verification failed. Please try again."
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <section className="mx-auto max-w-xl px-5 py-16 text-center">
        <h1 className="text-2xl font-bold">Verification didn&apos;t work</h1>
        <p className="mt-3 text-sm text-gray-400">{error}</p>
        <Link
          href="/app/subscription"
          className="mt-6 inline-block rounded-full bg-[#20a957] px-6 py-3 transition-all duration-200 hover:bg-[#1a8a47] font-bold text-white"
        >
          Back to Plans
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-5 py-16 text-center">
      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#20a957]" />
      <p className="mt-5 font-bold">Verifying your email…</p>
      <p className="mt-1 text-sm text-gray-400">
        {mode === "signup"
          ? "Setting up your account, one moment."
          : mode === "login"
            ? "Signing you in, one moment."
            : "Adding your wash credits, one moment."}
      </p>
    </section>
  );
}
