"use client";

/* /app/auth/callback — landing page for the Supabase email magic link.
 * Exchanges the ?code= for a session, creates the subscription (plan comes
 * from ?plan=), then sends the subscriber to their dashboard. */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createSubscription,
  exchangeCodeForSession,
  getMySubscription,
} from "@/lib/db/store";

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
        if (!code) throw new Error("Missing verification code.");
        await exchangeCodeForSession(code);
        const existing = await getMySubscription();
        const active = !!existing && existing.status === "active";
        if (mode === "login") {
          // Pure sign-in (from /app/login): never mint a plan here.
        } else if (mode === "signup") {
          // Fresh account from /app/signup: profile exists, no plan yet —
          // send them to pick one (unless they already have one).
          router.replace(active ? "/app" : "/app/subscription");
          return;
        } else if (!active) {
          const planId = search.get("plan") ?? "standard";
          await createSubscription({ planId });
        }
        router.replace("/app");
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
          className="mt-6 inline-block rounded-xl bg-[#20a957] px-6 py-3 font-bold text-white"
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
            : "Activating your subscription, one moment."}
      </p>
    </section>
  );
}
