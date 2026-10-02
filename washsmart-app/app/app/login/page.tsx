"use client";

/* /app/login — returning subscriber sign-in.
 * Passwordless: enter your email, get a magic link, click it to sign in.
 * New here? The page points to /app/subscription (plans = sign-up step 1).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProfile, isEmailRegistered, sendSignInLink } from "@/lib/db/store";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [step, setStep] = useState<"form" | "checking" | "sent" | "unknown">(
    "form"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (await getProfile()) router.replace("/app");
    })();
  }, [router]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailOk) return;
    setStep("checking");
    setError(null);
    try {
      const registered = await isEmailRegistered(email);
      if (!registered) {
        setStep("unknown");
        return;
      }
      const redirectTo = `${window.location.origin}/app/auth/callback?mode=login`;
      const res = await sendSignInLink(email, "", "", redirectTo);
      if (!res.ok) {
        setError(res.error ?? "Could not send the sign-in link.");
        setStep("form");
        return;
      }
      setStep("sent");
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("form");
    }
  };

  return (
    <section className="mx-auto max-w-md px-5 py-12">
      <Link
        href="/app"
        className="mb-5 inline-block text-sm font-semibold text-[#168846]"
      >
        ← Back
      </Link>

      <div className="rounded-3xl bg-white p-7 shadow-sm">
        {step === "sent" ? (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#edf8f1] text-3xl">
              ✉️
            </div>
            <h1 className="mt-4 text-2xl font-bold">Check your inbox</h1>
            <p className="mt-2 text-sm text-gray-500">
              We sent a sign-in link to{" "}
              <span className="font-bold text-[#10251c]">{email.trim()}</span>.
              Click it to log in to WashSMART.
            </p>
          </div>
        ) : step === "unknown" ? (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-3xl">
              🔍
            </div>
            <h1 className="mt-4 text-2xl font-bold">No account found</h1>
            <p className="mt-2 text-sm text-gray-500">
              We couldn&apos;t find a WashSMART account for{" "}
              <span className="font-bold text-[#10251c]">{email.trim()}</span>.
            </p>
            <Link
              href="/app/subscription"
              className="mt-6 block w-full rounded-xl bg-[#20a957] py-3 text-center font-bold text-white"
            >
              Sign up for a plan
            </Link>
            <button
              onClick={() => {
                setStep("form");
                setTouched(false);
              }}
              className="mt-2 w-full py-2 text-center text-xs font-semibold text-gray-400"
            >
              Try a different email address
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="mt-1 text-sm text-gray-500">
              Log in with your email — we&apos;ll send you a secure sign-in
              link. No password needed.
            </p>

            {error && (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                {error}
              </p>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Email address
                </label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="e.g. adaeze@example.com"
                  inputMode="email"
                  autoComplete="email"
                  className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#20a957] ${
                    touched && !emailOk
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200"
                  }`}
                />
                {touched && !emailOk && (
                  <p className="mt-1 text-xs text-red-500">
                    Please enter a valid email address.
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={step === "checking" || (touched && !emailOk)}
                className={`w-full rounded-xl py-3 font-bold text-white ${
                  step === "checking"
                    ? "cursor-wait bg-gray-300"
                    : "bg-[#20a957]"
                }`}
              >
                {step === "checking" ? "Checking…" : "Email me a sign-in link"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-500">
              New to WashSMART?{" "}
              <Link
                href="/app/subscription"
                className="font-bold text-[#168846]"
              >
                Sign up for a plan →
              </Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
