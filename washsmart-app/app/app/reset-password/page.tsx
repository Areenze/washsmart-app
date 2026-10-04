"use client";

/* /app/reset-password — subscriber password reset, step 2.
 * Landed on from the emailed reset link (?code=). Exchanges the code for a
 * recovery session (or accepts the cookie-established session), then lets
 * the subscriber set a new password. */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCodeForSession } from "@/lib/db/store";
import { getSupabase } from "@/lib/db/supabase";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto max-w-md px-5 py-12 text-center">
          <p className="text-gray-400">Loading…</p>
        </section>
      }
    >
      <ResetInner />
    </Suspense>
  );
}

function ResetInner() {
  const router = useRouter();
  const search = useSearchParams();
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const code = search.get("code");
        if (code) {
          await exchangeCodeForSession(code);
        } else {
          // Supabase's /verify sometimes establishes the recovery session
          // via cookies without issuing a ?code=. Accept it when present.
          const {
            data: { session },
          } = await getSupabase().auth.getSession();
          if (!session) {
            throw new Error(
              "This reset link is invalid or has expired. Request a new one."
            );
          }
        }
        setReady(true);
      } catch (e) {
        setFatal(e instanceof Error ? e.message : "This reset link didn't work.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inputClass = (bad: boolean) =>
    `w-full rounded-xl border px-4 py-3 text-sm text-[#e9f2ec] outline-none placeholder:text-gray-500 focus:border-[#20a957] ${
      bad ? "border-red-400 bg-red-500/10" : "border-white/10 bg-white/5"
    }`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (pw !== pw2) {
      setError("The two passwords don't match.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await getSupabase().auth.updateUser({ password: pw });
      if (error) throw error;
      // End the recovery session; the subscriber signs in fresh.
      await getSupabase().auth.signOut();
      router.replace("/app/login");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update the password.");
      setSaving(false);
    }
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
        {fatal ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold">Link didn&apos;t work</h1>
            <p className="mt-2 text-sm font-semibold text-red-400">{fatal}</p>
            <Link
              href="/app/forgot-password"
              className="mt-6 block w-full rounded-full bg-[#20a957] py-3 text-center font-bold text-white transition-all duration-200 hover:bg-[#1a8a47]"
            >
              Request a new link
            </Link>
          </div>
        ) : !ready ? (
          <p className="py-8 text-center text-gray-400">
            Verifying your reset link…
          </p>
        ) : (
          <>
            <h1 className="text-2xl font-bold">Set a new password</h1>
            {error && (
              <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-xs font-semibold text-red-400">
                {error}
              </p>
            )}
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    className={`${inputClass(false)} pr-16`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#48d87c]"
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold">
                  Confirm new password
                </label>
                <input
                  type={showPw ? "text" : "password"}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  placeholder="Repeat the new password"
                  autoComplete="new-password"
                  className={inputClass(false)}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-full bg-[#20a957] py-3 font-bold text-white transition-all duration-200 hover:bg-[#1a8a47] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Set new password"}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
