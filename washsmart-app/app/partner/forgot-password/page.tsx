"use client";

/* /partner/forgot-password — partner password reset, step 1.
 * Enter the Partner ID; we look up the account email and send a reset link.
 * No service-role key needed — the reset email goes through Supabase Auth. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brand, Logo } from "@/components/ui";
import { getSupabase } from "@/lib/db/supabase";
import { listApprovedPartners } from "@/lib/db/store";
import type { Partner } from "@/lib/db/types";

export default function PartnerForgotPassword() {
  const [partnerId, setPartnerId] = useState("");
  const [phase, setPhase] = useState<"form" | "sending" | "sent">("form");
  const [error, setError] = useState<string | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    (async () => {
      try {
        setPartners(await listApprovedPartners());
      } catch {
        /* non-fatal */
      }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = partnerId.trim().toUpperCase();
    if (!id) {
      setError("Enter your Partner ID.");
      return;
    }
    setPhase("sending");
    setError(null);
    try {
      const sb = getSupabase();
      const { data: lookup, error: lookupError } = await sb.rpc(
        "partner_login_lookup",
        { p_partner_id: id }
      );
      if (lookupError || !lookup || lookup.length === 0) {
        throw new Error(
          "We don't recognise that Partner ID. Check it and try again — IDs look like WS-2026-0001."
        );
      }
      const { email } = lookup[0] as { email: string };
      const redirectTo = `${window.location.origin}/partner/reset-password`;
      const { error: resetError } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (resetError) throw resetError;
      setPhase("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPhase("form");
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
          <span className="rounded-md bg-[#34d186]/15 px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-[#66dca4]">PARTNER PORTAL</span>
        </div>
      </header>

      <section className="mx-auto max-w-xl px-5 py-10">
        <div className="rounded-3xl bg-[#063c28] p-8 text-center text-white">
          <p className="text-sm text-white/60">WASHSMART PARTNER APP</p>
          <h1 className="mt-2 text-3xl font-bold">Reset your password</h1>
          <p className="mt-2 text-sm text-white/70">
            Enter your Partner ID and we&apos;ll email you a link to set a new
            password.
          </p>
        </div>

        <div className="mt-6 rounded-3xl bg-[#111a14] p-6 shadow-sm md:p-8">
          {phase === "sent" ? (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#34d186]/10 text-3xl">
                ✉️
              </div>
              <h2 className="mt-4 text-xl font-bold">Check your inbox</h2>
              <p className="mt-2 text-sm text-gray-400">
                If that Partner ID exists, a password-reset link is on its way.
                It expires soon, so use it promptly.
              </p>
              <Link
                href="/partner"
                className="mt-6 inline-block rounded-full bg-[#34d186] px-6 py-3 font-bold text-white"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <label className="block text-sm font-bold" htmlFor="partner-id">
                Partner ID
              </label>
              <input
                id="partner-id"
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                placeholder="e.g. WS-2026-0001"
                autoComplete="username"
                autoCapitalize="characters"
                className="mt-2 w-full rounded-xl border border-white/10 px-4 py-3 font-mono text-sm outline-none focus:border-[#34d186]"
              />

              {error && (
                <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={phase === "sending"}
                className="mt-6 w-full rounded-xl bg-[#168846] py-4 text-lg font-bold text-white disabled:opacity-60"
              >
                {phase === "sending" ? "Sending…" : "Email me a reset link"}
              </button>

              <p className="mt-4 text-center text-sm">
                <Link href="/partner" className="font-bold text-[#66dca4]">
                  ← Back to login
                </Link>
              </p>
            </form>
          )}

          {partners.length > 0 && phase !== "sent" && (
            <div className="mt-6 rounded-3xl border-2 border-dashed border-[#34d186]/30 bg-[#34d186]/10 p-6">
              <p className="text-sm font-bold text-[#66dca4]">
                🔑 Approved partners — tap to fill your Partner ID
              </p>
              <div className="mt-4 space-y-2">
                {partners.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPartnerId(p.partnerId);
                      setError(null);
                    }}
                    className="w-full rounded-2xl bg-[#111a14] p-4 text-left shadow-sm hover:border hover:border-[#34d186]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold">{p.name}</p>
                        <p className="mt-0.5 font-mono text-xs text-gray-400">
                          ID: {p.partnerId}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-[#66dca4]">
                        Fill →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
