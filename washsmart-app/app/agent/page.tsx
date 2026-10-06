"use client";

/* /agent — Field Agent login.
 * Username is the agent code (e.g. "AGT-001") issued by WashSMART,
 * plus the agent password. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brand, Logo } from "@/components/ui";
import { agentLogin, currentAgentSession } from "@/lib/db/agents";

export default function AgentLogin() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (await currentAgentSession()) router.replace("/agent/dashboard");
    })();
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim() || !password) {
      setError("Enter your agent code and password to continue.");
      return;
    }
    setBusy(true);
    const res = await agentLogin(code, password);
    setBusy(false);
    if (res.ok) {
      router.push("/agent/dashboard");
      return;
    }
    setError(
      res.reason === "unknown-code"
        ? "We don't recognise that agent code. Codes look like AGT-001."
        : res.reason === "no-password"
          ? "This agent account isn't activated yet — ask your WashSMART contact."
          : "Incorrect password for that agent code. Try again."
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
          <span className="rounded-md bg-[#20a957]/15 px-2 py-1 text-[10px] font-bold tracking-[0.14em] text-[#48d87c]">
            FIELD AGENT
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-xl px-5 py-10">
        <div className="rounded-3xl bg-[#063c28] p-8 text-center text-white">
          <p className="text-sm text-white/60">WASHSMART FIELD AGENT</p>
          <h1 className="mt-2 text-3xl font-bold">Agent Login</h1>
          <p className="mt-2 text-sm text-white/70">
            Sign in with your agent code and password.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="mt-6 rounded-3xl bg-[#111a14] p-6 shadow-sm md:p-8"
        >
          <label className="block text-sm font-bold" htmlFor="agent-code">
            Agent code
          </label>
          <input
            id="agent-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. AGT-001"
            autoComplete="username"
            autoCapitalize="characters"
            className="mt-2 w-full rounded-xl border border-white/10 px-4 py-3 font-mono text-sm uppercase outline-none focus:border-[#20a957]"
          />
          <p className="mt-1 text-xs text-gray-500">
            Your agent code was issued when you joined the program.
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
              placeholder="Your agent password"
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
      </section>
    </main>
  );
}
