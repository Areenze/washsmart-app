"use client";

/* /app/signup — standalone new-subscriber sign-up, separate from plan
 * selection. Collects name + email + phone, then sends a Supabase magic
 * link; the handle_new_user trigger creates the profile from the link
 * metadata, and /app/auth/callback?mode=signup routes the fresh account
 * to /app/subscription to pick a plan (no plan is minted here). */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProfile, isEmailRegistered, sendSignInLink } from "@/lib/db/store";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    phone: false,
  });
  const [step, setStep] = useState<"form" | "processing" | "verify">("form");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    (async () => {
      if (await getProfile()) router.replace("/app");
    })();
  }, [router]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const nameOk = name.trim().length > 1;
  const phoneOk = phone.trim().replace(/\D/g, "").length >= 7;
  const valid = nameOk && emailOk && phoneOk;

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
    setTouched({ name: true, email: true, phone: true });
    if (!valid) return;
    if (await isEmailRegistered(email)) {
      setIsDuplicate(true);
      return;
    }
    setStep("processing");
    setSendError(null);
    const redirectTo = `${window.location.origin}/app/auth/callback?mode=signup`;
    const res = await sendSignInLink(email, name, phone, redirectTo);
    if (!res.ok) {
      setSendError(res.error ?? "Could not send the verification email.");
      setStep("form");
      return;
    }
    setStep("verify");
  };

  const resendLink = async () => {
    const redirectTo = `${window.location.origin}/app/auth/callback?mode=signup`;
    const res = await sendSignInLink(email, name, phone, redirectTo);
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
    const res = await sendSignInLink(email, name, phone, redirectTo);
    setSendingLink(false);
    if (res.ok) {
      setLinkSent(true);
    } else {
      setSendError(res.error ?? "Could not send the sign-in link.");
    }
  };

  const fieldClass = (bad: boolean) =>
    `w-full rounded-xl border px-4 py-3 text-sm text-[#e9f2ec] outline-none placeholder:text-gray-500 focus:border-[#20a957] ${
      bad ? "border-red-400 bg-red-500/10" : "border-white/10 bg-white/5"
    }`;

  const Req = () => <span className="ml-1 text-red-400">*</span>;

  return (
    <section className="mx-auto max-w-md px-5 py-12">
      <Link
        href="/app"
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back
      </Link>

      <div className="rounded-3xl bg-[#111a14] p-7 shadow-sm">
        {step === "verify" ? (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#20a957]/10 text-3xl">
              ✉️
            </div>
            <h1 className="mt-4 text-2xl font-bold">Verify your email</h1>
            <p className="mt-2 text-sm text-gray-400">
              We sent a verification link to{" "}
              <span className="font-bold text-[#e9f2ec]">{email.trim()}</span>.
              Click the link in your inbox to create your account — then
              you&apos;ll pick a plan.
            </p>
            <button
              onClick={resendLink}
              className="mt-5 w-full rounded-xl border border-white/10 py-3 text-sm font-bold text-gray-300"
            >
              Resend verification link
            </button>
            {resent && (
              <p className="mt-2 text-center text-xs font-semibold text-[#48d87c]">
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
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#20a957]" />
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
                    Please enter a valid phone number.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!valid || isDuplicate}
                className={`w-full rounded-xl py-3 font-bold text-white ${
                  valid && !isDuplicate
                    ? "bg-[#20a957]"
                    : "cursor-not-allowed bg-white/15"
                }`}
              >
                Create account
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-400">
              Already a subscriber?{" "}
              <Link href="/app/login" className="font-bold text-[#48d87c]">
                Log in →
              </Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}
