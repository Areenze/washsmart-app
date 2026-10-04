"use client";

/* /app/login — returning subscriber sign-in.
 * Email + password (email is verified once, at sign-up). A magic-link
 * alternative remains for accounts created before passwords existed. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getProfile,
  isEmailRegistered,
  resendConfirmationEmail,
  sendSignInLink,
  setVerifyPending,
  signInWithPassword,
} from "@/lib/db/store";

type Step = "form" | "checking" | "sent" | "unknown" | "verify";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [error, setError] = useState<string | null>(null);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  // Where to land after sign-in. Callers (e.g. /admin) pass ?next=/admin.
  // Only same-origin paths are honored — never an external URL.
  const nextPath = () => {
    try {
      const n = new URLSearchParams(window.location.search).get("next");
      return n && n.startsWith("/") && !n.startsWith("//") ? n : "/app";
    } catch {
      return "/app";
    }
  };

  useEffect(() => {
    (async () => {
      if (await getProfile()) router.replace(nextPath());
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Notify, then automatically continue to the app (the inbox link finishes
  // sign-in whenever they click it).
  useEffect(() => {
    if (step !== "sent") return;
    const t = window.setTimeout(() => router.push(nextPath()), 4500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailOk || !password) return;
    setStep("checking");
    setError(null);
    const res = await signInWithPassword(email, password);
    if (res.ok) {
      router.replace(nextPath());
      return;
    }
    if (res.reason === "not-confirmed") {
      setStep("verify");
      return;
    }
    setError(
      res.reason === "wrong-credentials"
        ? "Incorrect email or password. Try again."
        : (res.error ?? "Could not sign you in. Please try again.")
    );
    setStep("form");
  };

  const resendVerification = async () => {
    if (resendCooldown > 0) return;
    const redirectTo = `${window.location.origin}/app/auth/callback?mode=signup`;
    const res = await resendConfirmationEmail(email, redirectTo);
    setResendCooldown(60);
    if (res.ok) {
      setResent(true);
      window.setTimeout(() => setResent(false), 3000);
    } else {
      setError(res.error ?? "Could not resend the verification email.");
    }
  };

  const submitMagicLink = async (e: React.FormEvent) => {
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
      const next = nextPath();
      const redirectTo =
        `${window.location.origin}/app/auth/callback?mode=login` +
        (next !== "/app" ? `&next=${encodeURIComponent(next)}` : "");
      const res = await sendSignInLink(email, "", "", redirectTo);
      if (!res.ok) {
        setError(res.error ?? "Could not send the sign-in link.");
        setStep("form");
        return;
      }
      setVerifyPending(email.trim());
      setStep("sent");
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("form");
    }
  };

  const inputClass = (bad: boolean) =>
    `w-full rounded-xl border px-4 py-3 text-sm text-[#e9f2ec] outline-none placeholder:text-gray-500 focus:border-[#20a957] ${
      bad ? "border-red-400 bg-red-500/10" : "border-white/10 bg-white/5"
    }`;

  return (
    <section className="mx-auto max-w-md px-5 py-12">
      <Link
        href="/app"
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back
      </Link>

      <div className="rounded-3xl bg-[#111a14] p-7 shadow-sm">
        {step === "sent" ? (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#20a957]/10 text-3xl">
              ✉️
            </div>
            <h1 className="mt-4 text-2xl font-bold">Check your inbox</h1>
            <p className="mt-2 text-sm text-gray-400">
              We sent a sign-in link to{" "}
              <span className="font-bold text-[#e9f2ec]">{email.trim()}</span>.
              Click it to log in to WashSMART.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Taking you to the app now — no need to wait here.
            </p>
            <button
              onClick={() => router.push("/app")}
              className="mt-5 w-full rounded-full bg-[#20a957] py-3 transition-all duration-200 hover:bg-[#1a8a47] font-bold text-white"
            >
              Continue to the app →
            </button>
          </div>
        ) : step === "unknown" ? (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-3xl">
              🔍
            </div>
            <h1 className="mt-4 text-2xl font-bold">No account found</h1>
            <p className="mt-2 text-sm text-gray-400">
              We couldn&apos;t find a WashSMART account for{" "}
              <span className="font-bold text-[#e9f2ec]">{email.trim()}</span>.
            </p>
            <Link
              href="/app/signup"
              className="mt-6 block w-full rounded-full bg-[#20a957] py-3 transition-all duration-200 hover:bg-[#1a8a47] text-center font-bold text-white"
            >
              Create an account
            </Link>
            <button
              onClick={() => {
                setStep("form");
                setTouched(false);
              }}
              className="mt-2 w-full py-2 text-center text-xs font-semibold text-gray-500"
            >
              Try a different email address
            </button>
          </div>
        ) : step === "verify" ? (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 text-3xl">
              ✉️
            </div>
            <h1 className="mt-4 text-2xl font-bold">Verify your email</h1>
            <p className="mt-2 text-sm text-gray-400">
              This email address hasn&apos;t been verified yet. Click the
              one-time link we sent to{" "}
              <span className="font-bold text-[#e9f2ec]">{email.trim()}</span>{" "}
              — after that, you&apos;ll log in with your password.
            </p>
            {error && (
              <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs font-semibold text-red-400">
                {error}
              </p>
            )}
            <button
              onClick={resendVerification}
              disabled={resendCooldown > 0}
              className="mt-5 w-full rounded-full bg-[#20a957] py-3 transition-all duration-200 hover:bg-[#1a8a47] font-bold text-white disabled:opacity-50"
            >
              {resendCooldown > 0
                ? `Resend available in ${resendCooldown}s`
                : "Resend verification link"}
            </button>
            {resent && (
              <p className="mt-2 text-xs font-semibold text-[#48d87c]">
                A new verification link was sent to {email.trim()}.
              </p>
            )}
            <button
              onClick={() => {
                setStep("form");
                setError(null);
              }}
              className="mt-2 w-full py-2 text-center text-xs font-semibold text-gray-500"
            >
              Back to login
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Welcome back</h1>
            <p className="mt-1 text-sm text-gray-400">
              Log in with your email and password.
            </p>

            {error && (
              <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs font-semibold text-red-400">
                {error}
              </p>
            )}

            <form onSubmit={submitPassword} className="mt-6 space-y-4">
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
                  className={inputClass(touched && !emailOk)}
                />
                {touched && !emailOk && (
                  <p className="mt-1 text-xs text-red-400">
                    Please enter a valid email address.
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    className={`${inputClass(false)} pr-16`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#48d87c]"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={step === "checking"}
                className={`w-full rounded-full py-3 transition-all duration-200 font-bold text-white ${
                  step === "checking"
                    ? "cursor-wait bg-white/15"
                    : "bg-[#20a957] hover:bg-[#1a8a47]"
                }`}
              >
                {step === "checking" ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-sm">
              <Link
                href="/app/forgot-password"
                className="font-semibold text-[#48d87c]"
              >
                Forgot password?
              </Link>
              <button
                type="button"
                onClick={() => setShowMagicLink((s) => !s)}
                className="font-semibold text-gray-400"
              >
                {showMagicLink ? "Hide magic link" : "Use a magic link instead"}
              </button>
            </div>

            {showMagicLink && (
              <form
                onSubmit={submitMagicLink}
                className="mt-4 rounded-2xl border border-white/10 p-4"
              >
                <p className="text-xs text-gray-400">
                  We&apos;ll email you a one-time sign-in link — handy if your
                  account was created before passwords.
                </p>
                <button
                  type="submit"
                  disabled={step === "checking" || !emailOk}
                  className="mt-3 w-full rounded-full border border-white/15 py-3 text-sm font-bold text-gray-200 transition-all duration-200 hover:border-white/30 disabled:opacity-50"
                >
                  {step === "checking" ? "Checking…" : "Email me a sign-in link"}
                </button>
              </form>
            )}

            <p className="mt-5 text-center text-sm text-gray-400">
              New to WashSMART?{" "}
              <Link href="/app/signup" className="font-bold text-[#48d87c]">
                Create an account →
              </Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
