"use client";

/* /app/checkout?plan=standard — order summary → details → real email
 * verification (Supabase magic link) → subscription activation.
 *
 * The magic link both verifies the email and signs the subscriber in:
 * clicking it returns to /app/auth/callback, which creates the
 * subscription for the now-authenticated user.
 */

import { normalizePhone, isValidPhone, PHONE_ERROR } from "@/lib/phone";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getPlans,
  getProfile,
  getVehicles,
  isEmailRegistered,
  sendSignInLink,
} from "@/lib/db/store";
import type { Plan, Vehicle } from "@/lib/db/types";

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-xl px-5 py-8">
          <p className="text-gray-400">Loading…</p>
        </section>
      }
    >
      <CheckoutInner />
    </Suspense>
  );
}

const PAYSTACK_ENABLED = !!process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

function CheckoutInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [plan, setPlan] = useState<Plan | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Signed-up but planless users arrive here logged in: prefill their details
  // and skip the duplicate-email gate (their email IS registered — it's theirs).
  const [loggedIn, setLoggedIn] = useState(false);
  // Logged-in buyers must have at least one registered vehicle: a WashSMART
  // subscription covers registered cars only.
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [touched, setTouched] = useState({ name: false, email: false, phone: false });
  const [step, setStep] = useState<"form" | "processing" | "verify">("form");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    (async () => {
      const plans = await getPlans();
      const id = search.get("plan");
      setPlan(plans.find((p) => p.id === id) ?? plans[1] ?? plans[0]);
      try {
        const p = await getProfile();
        if (p) {
          setName(p.name ?? "");
          setEmail(p.email ?? "");
          setPhone(p.phone ?? "");
          setLoggedIn(true);
          setVehicles(await getVehicles().catch(() => []));
        }
      } catch {
        /* logged-out: fill the form manually */
      }
    })();
  }, [search]);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const nameOk = name.trim().length > 1;
  const phoneOk = isValidPhone(phone);
  const valid = nameOk && emailOk && phoneOk;
  // Signed-in buyers with a complete profile never see the form twice —
  // they get a read-only summary instead.
  const profileComplete = loggedIn && valid;
  const needsVehicle =
    loggedIn && vehicles !== null && vehicles.length === 0;
  const canPay = valid && !isDuplicate && !needsVehicle;

  const checkDuplicate = async () => {
    if (!emailOk || loggedIn) return;
    setCheckingEmail(true);
    try {
      setIsDuplicate(await isEmailRegistered(email));
    } catch {
      setIsDuplicate(false);
    } finally {
      setCheckingEmail(false);
    }
  };

  const pay = async () => {
    setTouched({ name: true, email: true, phone: true });
    if (!valid) return;
    if (!loggedIn && (await isEmailRegistered(email))) {
      setIsDuplicate(true);
      return;
    }
    if (loggedIn && PAYSTACK_ENABLED) {
      // Signed-in buyer, real payments: email is already verified —
      // go straight to the Paystack payment step.
      router.push(`/app/checkout/pay?plan=${plan?.id ?? "standard"}`);
      return;
    }
    setStep("processing");
    setSendError(null);
    const redirectTo = `${window.location.origin}/app/auth/callback?plan=${plan?.id ?? "standard"}`;
    const res = await sendSignInLink(email, name, normalizePhone(phone) ?? phone.trim(), redirectTo);
    if (!res.ok) {
      setSendError(res.error ?? "Could not send the verification email.");
      setStep("form");
      return;
    }
    setStep("verify");
  };

  const resendLink = async () => {
    if (!plan) return;
    const redirectTo = `${window.location.origin}/app/auth/callback?plan=${plan.id}`;
    const res = await sendSignInLink(email, name, normalizePhone(phone) ?? phone.trim(), redirectTo);
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
    `w-full rounded-xl border px-4 py-3 text-sm text-[#e9f2ec] outline-none placeholder:text-gray-500 focus:border-[#20a957] ${
      bad ? "border-red-400 bg-red-500/10" : "border-white/10 bg-white/5"
    }`;

  const Req = () => <span className="ml-1 text-red-400">*</span>;

  if (!plan) {
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
        ← Back
      </Link>

      {step === "form" && (
        <div className="rounded-3xl bg-[#111a14] p-7 shadow-sm">
          <h1 className="text-2xl font-bold">Complete Subscription</h1>
          <p className="mt-1 text-sm text-gray-400">
            {plan.name} Plan · {plan.washes} wash credits, valid 30 days
          </p>
          {loggedIn && !profileComplete && (
            <p className="mt-2 rounded-xl bg-[#20a957]/10 p-3 text-xs font-semibold text-[#48d87c]">
              Buying as {name} ({email}) — this plan will attach to your
              account.
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

          {profileComplete ? (
            <div className="mt-6 rounded-2xl bg-white/5 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Subscribing as
              </p>
              <p className="mt-1 font-bold text-[#e9f2ec]">{name.trim()}</p>
              <p className="text-sm text-gray-400">
                {email.trim()} · {phone.trim()}
              </p>
              <Link
                href="/app/profile"
                className="mt-2 inline-block text-xs font-bold text-[#48d87c]"
              >
                Wrong details? Update them in your profile →
              </Link>
            </div>
          ) : (
            <>
              <p className="mt-6 text-xs font-semibold text-gray-400">
                All fields marked <span className="text-red-400">*</span> are
                required.
              </p>

              {sendError && (
                <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs font-semibold text-red-400">
                  {sendError}
                </p>
              )}

              <div className="mt-3 space-y-4">
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
                className={fieldClass((touched.email && !emailOk) || isDuplicate)}
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
                        onClick={sendLoginLink}
                        disabled={sendingLink}
                        className="rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white disabled:opacity-60"
                      >
                        {sendingLink ? "Sending..." : "Email me a sign-in link"}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEmail("");
                        setIsDuplicate(false);
                        setLinkSent(false);
                        setTouched((t) => ({ ...t, email: false }));
                      }}
                      className="rounded-lg border border-amber-300 px-3 py-1.5 font-bold text-amber-200"
                    >
                      Use a different email
                    </button>
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
          </div>
            </>
          )}

          {needsVehicle && (
            <div className="mt-6 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-200">
              <p className="font-bold">Register your vehicle first.</p>
              <p className="mt-1">
                A WashSMART subscription covers your registered cars only —
                add at least one vehicle before subscribing.
              </p>
              <Link
                href={`/app/onboarding?next=${encodeURIComponent(
                  `/app/checkout?plan=${plan.id}`
                )}`}
                className="mt-3 inline-block rounded-full bg-amber-600 px-5 py-2 font-bold text-white"
              >
                Register vehicles →
              </Link>
            </div>
          )}

          <button
            onClick={pay}
            disabled={!canPay}
            className={`mt-6 w-full rounded-full py-3 transition-all duration-200 font-bold text-white ${
              canPay
                ? "bg-[#20a957] hover:bg-[#1a8a47]"
                : "cursor-not-allowed bg-white/15"
            }`}
          >
            Pay {plan.price}
          </button>

          <p className="mt-3 text-center text-xs text-gray-500">
            {PAYSTACK_ENABLED
              ? "Secure payment via Paystack. We'll email you a sign-in link to verify your address first."
              : "Demo checkout — no real charge is made. We'll email you a sign-in link to verify your address and activate your plan."}
          </p>
        </div>
      )}

      {step === "processing" && (
        <div className="rounded-3xl bg-[#111a14] p-12 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-[#20a957]" />
          <p className="mt-5 font-bold">Processing…</p>
          <p className="mt-1 text-sm text-gray-400">
            Please do not close this page.
          </p>
        </div>
      )}

      {step === "verify" && (
        <div className="rounded-3xl bg-[#111a14] p-7 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#20a957]/10 text-3xl">
            ✉️
          </div>
          <h1 className="mt-4 text-center text-2xl font-bold">
            Verify your email
          </h1>
          <p className="mt-2 text-center text-sm text-gray-400">
            We sent a sign-in link to{" "}
            <span className="font-bold text-[#e9f2ec]">{email.trim()}</span>.
            Click the link in your inbox to verify your address and activate
            your {plan.name} subscription.
          </p>

          <button
            onClick={resendLink}
            className="mt-5 w-full rounded-full border border-white/10 py-3 transition-all duration-200 hover:border-white/25 text-sm font-bold text-gray-300"
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
      )}
    </section>
  );
}
