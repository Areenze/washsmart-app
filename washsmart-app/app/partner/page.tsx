"use client";

/* /partner — Partner App login.
 * Username is the Partner ID (e.g. "WS-2026-0001") issued at approval,
 * plus the partner password. Demo credentials are shown on the page. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brand, Logo } from "@/components/ui";
import {
  currentPartnerSession,
  listApprovedPartners,
  partnerLogin,
} from "@/lib/db/store";
import type { Partner } from "@/lib/db/types";

export default function PartnerLogin() {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerId, setPartnerId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (await currentPartnerSession()) {
        router.replace("/partner/dashboard");
        return;
      }
      setPartners(await listApprovedPartners());
    })();
  }, [router]);

  const fill = (p: Partner) => {
    setPartnerId(p.partnerId);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!partnerId.trim() || !password) {
      setError("Enter your Partner ID and password to continue.");
      return;
    }
    setBusy(true);
    const res = await partnerLogin(partnerId, password);
    setBusy(false);
    if (res.ok) {
      router.push("/partner/dashboard");
      return;
    }
    setError(
      res.reason === "unknown-id"
        ? "We don't recognise that Partner ID. Check it and try again — IDs look like WS-2026-0001."
        : "Incorrect password for that Partner ID. Try again."
    );
  };

  return (
    <main className="min-h-screen bg-[#0a0f0c] text-[#e9f2ec]">
      <header className="border-b bg-[#111a14] px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <Brand />
          </Link>
          <span className="text-sm font-semibold text-gray-400">
            Partner App
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-xl px-5 py-10">
        <div className="rounded-3xl bg-[#063c28] p-8 text-center text-white">
          <p className="text-sm text-white/60">WASHSMART PARTNER APP</p>
          <h1 className="mt-2 text-3xl font-bold">Partner Login</h1>
          <p className="mt-2 text-sm text-white/70">
            Sign in with your Partner ID and password.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="mt-6 rounded-3xl bg-[#111a14] p-6 shadow-sm md:p-8"
        >
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
            className="mt-2 w-full rounded-xl border border-white/10 px-4 py-3 font-mono text-sm outline-none focus:border-[#20a957]"
          />
          <p className="mt-1 text-xs text-gray-500">
            Your Partner ID was issued when your application was approved.
          </p>

          <label className="mt-5 block text-sm font-bold" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your partner password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-white/10 px-4 py-3 pr-16 text-sm outline-none focus:border-[#20a957]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 pt-2 text-xs font-bold text-[#48d87c]"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-xl bg-[#168846] py-4 text-lg font-bold text-white disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="mt-6 rounded-3xl border-2 border-dashed border-[#20a957]/30 bg-[#20a957]/10 p-6">
          <p className="text-sm font-bold text-[#48d87c]">
            🔑 Approved partners — tap to fill your Partner ID
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Your password was issued privately when your application was
            approved. Contact WashSMART if you need a reset.
          </p>
          <div className="mt-4 space-y-2">
            {partners.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => fill(p)}
                className="w-full rounded-2xl bg-[#111a14] p-4 text-left shadow-sm hover:border hover:border-[#20a957]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{p.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-gray-400">
                      ID: {p.partnerId}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-[#48d87c]">
                    Fill →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Not a partner yet?{" "}
          <Link href="/join" className="font-bold text-[#48d87c]">
            Apply here
          </Link>
        </p>
      </section>
    </main>
  );
}
