"use client";

/* /agent/reset-password — agent password reset, step 2.
 * Landed on from the emailed reset link (?code=). There is deliberately NO
 * self-service "forgot password" on the agent login page — only an admin
 * can trigger a reset from /admin/agents. */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Brand, Logo } from "@/components/ui";
import { exchangeCodeForSession } from "@/lib/db/store";
import { getSupabase } from "@/lib/db/supabase";

export default function AgentResetPassword() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0a0f0c] px-5 py-16 text-center text-[#e9f2ec]">
          <p className="text-gray-400">Loading…</p>
        </main>
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
          const {
            data: { session },
          } = await getSupabase().auth.getSession();
          if (!session) {
            throw new Error(
              "This reset link is invalid or has expired. Ask your WashSMART admin for a new one."
            );
          }
        }
        setReady(true);
      } catch (e) {
        setFatal(
          e instanceof Error ? e.message : "This reset link didn't work."
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      // End the recovery session; the agent signs in fresh.
      await getSupabase().auth.signOut();
      router.replace("/agent");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Couldn't update the password."
      );
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0f0c] text-[#e9f2ec]">
      <header className="border-b bg-[#111a14] px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <Brand />
          </Link>
          <span className="rounded-md bg-[#20a957]/15 px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-[#48d87c]">FIELD AGENT</span>
        </div>
      </header>

      <section className="mx-auto max-w-xl px-5 py-10">
        <div className="rounded-3xl bg-[#063c28] p-8 text-center text-white">
          <p className="text-sm text-white/60">WASHSMART FIELD AGENT</p>
          <h1 className="mt-2 text-3xl font-bold">Set a new password</h1>
        </div>

        <div className="mt-6 rounded-3xl bg-[#111a14] p-6 shadow-sm md:p-8">
          {fatal ? (
            <div className="text-center">
              <p className="font-bold text-red-300">{fatal}</p>
              <Link
                href="/agent"
                className="mt-6 inline-block rounded-full bg-[#20a957] px-6 py-3 font-bold text-white"
              >
                Back to login
              </Link>
            </div>
          ) : !ready ? (
            <p className="py-8 text-center text-gray-400">
              Verifying your reset link…
            </p>
          ) : (
            <form onSubmit={submit}>
              <label className="block text-sm font-bold" htmlFor="new-pw">
                New password
              </label>
              <div className="relative">
                <input
                  id="new-pw"
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-xl border border-white/10 px-4 py-3 pr-16 text-sm outline-none focus:border-[#20a957]"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 pt-2 text-xs font-bold text-[#48d87c]"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>

              <label
                className="mt-5 block text-sm font-bold"
                htmlFor="new-pw2"
              >
                Confirm new password
              </label>
              <input
                id="new-pw2"
                type={showPw ? "text" : "password"}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="Repeat the new password"
                autoComplete="new-password"
                className="mt-2 w-full rounded-xl border border-white/10 px-4 py-3 text-sm outline-none focus:border-[#20a957]"
              />

              {error && (
                <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="mt-6 w-full rounded-xl bg-[#168846] py-4 text-lg font-bold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Set new password"}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
