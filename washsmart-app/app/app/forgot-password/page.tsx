"use client";

/* /app/forgot-password — subscriber password reset, step 1.
 * Enter your account email; we send a reset link (no service key needed). */

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "@/lib/db/store";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"form" | "sending" | "sent">("form");
  const [error, setError] = useState<string | null>(null);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOk) {
      setError("Enter a valid email address.");
      return;
    }
    setPhase("sending");
    setError(null);
    const redirectTo = `${window.location.origin}/app/reset-password`;
    const res = await sendPasswordResetEmail(email, redirectTo);
    if (!res.ok) {
      setError(res.error ?? "Could not send the reset email.");
      setPhase("form");
      return;
    }
    setPhase("sent");
  };

  return (
    <section className="mx-auto max-w-md px-5 py-12">
      <Link
        href="/app/login"
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back
      </Link>

      <div className="rounded-3xl bg-[#111a14] p-7 shadow-sm">
        {phase === "sent" ? (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#20a957]/10 text-3xl">
              ✉️
            </div>
            <h1 className="mt-4 text-2xl font-bold">Check your inbox</h1>
            <p className="mt-2 text-sm text-gray-400">
              If that email has a WashSMART account, a password-reset link is
              on its way. It expires soon, so use it promptly.
            </p>
            <Link
              href="/app/login"
              className="mt-6 block w-full rounded-full bg-[#20a957] py-3 text-center font-bold text-white transition-all duration-200 hover:bg-[#1a8a47]"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Reset your password</h1>
            <p className="mt-1 text-sm text-gray-400">
              Enter your account email and we&apos;ll send you a link to set a
              new password.
            </p>

            {error && (
              <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs font-semibold text-red-400">
                {error}
              </p>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. adaeze@example.com"
                  inputMode="email"
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#e9f2ec] outline-none placeholder:text-gray-500 focus:border-[#20a957]"
                />
              </div>
              <button
                type="submit"
                disabled={phase === "sending"}
                className="w-full rounded-full bg-[#20a957] py-3 font-bold text-white transition-all duration-200 hover:bg-[#1a8a47] disabled:opacity-60"
              >
                {phase === "sending" ? "Sending…" : "Email me a reset link"}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
