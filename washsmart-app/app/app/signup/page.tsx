"use client";

/* /app/signup — standalone new-subscriber sign-up, separate from plan
 * selection. Collects name + email + phone + password, then sends a
 * one-time Supabase confirmation email; the handle_new_user trigger
 * creates the profile, and /app/auth/callback?mode=signup routes the
 * fresh account to /app/subscription to pick a plan (no plan is minted
 * here). After verifying once, the subscriber logs in with email +
 * password — no more email links. */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizePhone, isValidPhone, PHONE_ERROR } from "@/lib/phone";
import {
  getProfile,
  isEmailRegistered,
  resendConfirmationEmail,
  sendSignInLink,
  setVerifyPending,
  signUpWithPassword,
  stashReferralCode,
} from "@/lib/db/store";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-md px-5 py-12 text-center">
          <p className="text-gray-400">Loading…</p>
        </section>
      }
    >
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const router = useRouter();
  const search = useSearchParams();
  const referred = (search.get("ref") ?? "").trim().toUpperCase();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Invite code: prefilled from a ?ref= link, or typed in by hand
  // (EverWash-style) — stashed so /app/auth/callback can attribute it.
  const [inviteCode, setInviteCode] = useState(referred);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
    password: false,
  });
  const [step, setStep] = useState<"form" | "processing" | "verify">("form");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    (async () => {
      if (await getProfile()) router.replace("/app");
    })();
  }, [router]);

  // A friend's referral link: remember it through the email-verification
  // hop so /app/auth/callback can attribute the referral after sign-in.
  useEffect(() => {
    if (referred) stashReferralCode(referred);
  }, [referred]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const nameOk = name.trim().length > 1;
  const phoneOk = isValidPhone(phone);
  const passwordOk = password.length >= 6;
  const valid = nameOk && emailOk && phoneOk && passwordOk;

  const checkDuplicate = async () => {
    if (!emailOk) return;
    setCheckingEmail(true);
    try {
      setIsDuplicate(await isEmailRegistered(email));
    } catch {
      setIsDuplicate(false);
    } finally {
      setCheckingEmail(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, password: true });
    if (!valid) return;
    if (await isEmailRegistered(email)) {
      setIsDuplicate(true);
      return;
    }
    // A manually entered invite code counts exactly like a ?ref= link.
    if (inviteCode.trim()) stashReferralCode(inviteCode.trim());
    setStep("processing");
    setSendError(null);
    const redirectTo = `${window.location.origin}/app/auth/callback?mode=signup`;
    const res = await signUpWithPassword(email, password, name, normalizePhone(phone) ?? phone.trim(), redirectTo);
    if (!res.ok) {
      setSendError(res.error ?? "Could not create your account.");
      setStep("form");
      return;
    }
    // Don't park the user here: notify, remember the pending verification,
    // and hand them on to the app — the email link completes sign-in.
    setVerifyPending(email.trim());
    setStep("verify");
  };

  // Notify, then automatically continue to the app (the inbox link finishes
  // sign-in whenever they click it).
  useEffect(() => {
    if (step !== "verify") return;
    const t = window.setTimeout(() => router.push("/app"), 4500);
    return () => window.clearTimeout(t);
  }, [step, router]);

  // Resend cooldown: Supabase's built-in sender allows only a few emails per
  // hour per project — don't let repeated taps burn the quota.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  const resendLink = async () => {
    if (resendCooldown > 0) return;
    const redirectTo = `${window.location.origin}/app/auth/callback?mode=signup`;
    const res = await resendConfirmationEmail(email, redirectTo);
    setResendCooldown(60);
    if (res.ok) {
      setResent(true);
      window.setTimeout(() => setResent(false), 3000);
    } else {
      setSendError(res.error ?? "Could not resend the verification email.");
    }
  };

  const sendLoginLink = async () => {
    setSendingLink(true);
    setSendError(null);
    const redirectTo = `${window.location.origin}/app/auth/callback?mode=login`;
    const res = await sendSignInLink(email, name, normalizePhone(phone) ?? phone.trim(), redirectTo);
    setSendingLink(false);
    if (res.ok) {
      setLinkSent(true);
    } else {
      setSendError(res.error ?? "Could not send the sign-in link.");
    }
  };

  const fieldClass = (bad: boolean) =>
    `w-full rounded-xl border px-4 py-3 text-sm text-[#e9f2ec] outline-none placeholder:text-gray-500 focus:border-[#34d186] ${
      bad ? "border-red-400 bg-red-500/10" : "border-white/10 bg-white/5"
    }`;

  const Req = () => <span className="ml-1 text-red-400">*</span>;

  return (
    <section className="mx-auto max-w-md px-5 py-12">
      <Link
        href="/app"
        className="mb-5 inline-block text-sm font-semibold text-[#66dca4]"
      >
        ← Back
      </Link>

      <div className="rounded-3xl bg-[#111a14] p-7 shadow-sm">
        {step === "verify" ? (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#34d186]/10 text-3xl">
              ✉️
            </div>
            <h1 className="mt-4 text-2xl font-bold">Verify your email</h1>
            <p className="mt-2 text-sm text-gray-400">
              We sent a one-time verification link to{" "}
              <span className="font-bold text-[#e9f2ec]">{email.trim()}</span>.
              Click it to verify your email — after that, you&apos;ll log in
              with your password.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Taking you to the app now — no need to wait here.
            </p>
            <button
              onClick={() => router.push("/app")}
              className="mt-5 w-full rounded-full bg-[#34d186] py-3 transition-all duration-200 hover:bg-[#27ab6c] font-bold text-white"
            >
              Continue to the app →
            </button>
            <button
              onClick={resendLink}
              disabled={resendCooldown > 0}
              className="mt-3 w-full rounded-full border border-white/10 py-3 transition-all duration-200 hover:border-white/25 text-sm font-bold text-gray-300 disabled:opacity-50"
            >
              {resendCooldown > 0
                ? `Resend available in ${resendCooldown}s`
                : "Resend verification link"}
            </button>
            {resent && (
              <p className="mt-2 text-center text-xs font-semibold text-[#66dca4]">
                A new verification link was sent to {email.trim()}.
              </p>
            )}
            <button
              onClick={() => {
                setStep("form");
                setIsDuplicate(false);
              }}
              className="mt-2 w-full py-2 text-center text-xs font-semibold text-gray-500"
            >
              Use a different email address
            </button>
          </div>
        ) : step === "processing" ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#34d186]" />
            <p className="mt-5 font-bold">Creating your account…</p>
            <p className="mt-1 text-sm text-gray-400">
              Please do not close this page.
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Create your account</h1>
            <p className="mt-1 text-sm text-gray-400">
              One account for every WashSMART partner car wash. You&apos;ll
              pick a plan after verifying your email.
            </p>
            {inviteCode.trim() && (
              <p className="mt-3 rounded-xl bg-[#34d186]/10 p-3 text-xs font-semibold text-[#66dca4]">
                🎉 You were invited by a friend — they&apos;ll earn a free
                wash when you subscribe.
              </p>
            )}

            {sendError && (
              <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs font-semibold text-red-400">
                {sendError}
              </p>
            )}

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Full name <Req />
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                  placeholder="e.g. Adaeze Okafor"
                  autoComplete="name"
                  className={fieldClass(touched.name && !nameOk)}
                />
                {touched.name && !nameOk && (
                  <p className="mt-1 text-xs text-red-400">
                    Please enter your full name.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Email address <Req />
                </label>
                <input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsDuplicate(false);
                  }}
                  onBlur={() => {
                    setTouched((t) => ({ ...t, email: true }));
                    checkDuplicate();
                  }}
                  placeholder="e.g. adaeze@example.com"
                  inputMode="email"
                  autoComplete="email"
                  className={fieldClass(
                    (touched.email && !emailOk) || isDuplicate
                  )}
                />
                {touched.email && !emailOk && (
                  <p className="mt-1 text-xs text-red-400">
                    Please enter a valid email address.
                  </p>
                )}
                {checkingEmail && (
                  <p className="mt-1 text-xs text-gray-500">Checking email…</p>
                )}
                {isDuplicate && (
                  <div className="mt-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-200">
                    <p className="font-bold">
                      This email address is already registered.
                    </p>
                    <p className="mt-1">
                      {linkSent
                        ? "Sign-in link sent - check your inbox to continue."
                        : "Get a sign-in link to continue with your existing account, or use a different email address."}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {!linkSent && (
                        <button
                          type="button"
                          onClick={sendLoginLink}
                          disabled={sendingLink}
                          className="rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white disabled:opacity-60"
                        >
                          {sendingLink ? "Sending..." : "Email me a sign-in link"}
                        </button>
                      )}
                      <Link
                        href="/app/login"
                        className="rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white"
                      >
                        Go to login
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Phone number <Req />
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                  placeholder="e.g. 0801 234 5678"
                  inputMode="tel"
                  autoComplete="tel"
                  className={fieldClass(touched.phone && !phoneOk)}
                />
                {touched.phone && !phoneOk && (
                  <p className="mt-1 text-xs text-red-400">
                    {PHONE_ERROR}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Create a password <Req />
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() =>
                      setTouched((t) => ({ ...t, password: true }))
                    }
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    className={`${fieldClass(touched.password && !passwordOk)} pr-16`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#66dca4]"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {touched.password && !passwordOk && (
                  <p className="mt-1 text-xs text-red-400">
                    Password must be at least 6 characters.
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  You&apos;ll use this with your email to log in — no more
                  email links after verifying once.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Invite code{" "}
                  <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ADAEZE-4F2K"
                  autoComplete="off"
                  spellCheck={false}
                  className={fieldClass(false)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Got a referral code from a friend? Enter it here — they earn
                  a free wash when you subscribe.
                </p>
              </div>

              <button
                type="submit"
                disabled={!valid || isDuplicate}
                className={`w-full rounded-full py-3 transition-all duration-200 font-bold text-white ${
                  valid && !isDuplicate
                    ? "bg-[#34d186] hover:bg-[#27ab6c]"
                    : "cursor-not-allowed bg-white/15"
                }`}
              >
                Create account
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-400">
              Already a subscriber?{" "}
              <Link href="/app/login" className="font-bold text-[#66dca4]">
                Log in →
              </Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
