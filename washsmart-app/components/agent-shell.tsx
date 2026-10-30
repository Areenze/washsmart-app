"use client";

/* /agent shell — guards the session, shows agent header + logout. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Brand, Logo } from "@/components/ui";
import { agentLogout, currentAgentSessionStrict } from "@/lib/db/agents";
import type { Agent } from "@/lib/db/types";

// Pages that render outside the agent shell (own header, no session needed).
const PUBLIC_AGENT_PATHS = ["/agent", "/agent/reset-password"];

export default function AgentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null | undefined>(undefined);

  // Tri-state: Agent (authed), null (definitely no session),
  // undefined (transient failure — keep previous state).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let a: Agent | null | undefined;
      try {
        a = (await currentAgentSessionStrict()) ?? null;
      } catch {
        a = undefined;
      }
      if (cancelled || a === undefined) return;
      setAgent(a);
      if (a === null && !PUBLIC_AGENT_PATHS.includes(pathname))
        router.replace("/agent");
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  const logout = async () => {
    await agentLogout();
    router.replace("/agent");
  };

  // Login page renders its own chrome.
  if (PUBLIC_AGENT_PATHS.includes(pathname)) return <>{children}</>;

  if (agent === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0a0f0c] text-[#e9f2ec]">
        <p className="text-gray-400">Loading…</p>
      </main>
    );
  }
  if (agent === null) return null; // redirecting

  return (
    <main className="min-h-screen bg-[#0a0f0c] text-[#e9f2ec]">
      <header className="border-b bg-[#111a14] px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/agent/dashboard" className="flex items-center gap-2">
            <Logo />
            <Brand />
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-[#20a957]/15 px-2 py-1 font-mono text-[10px] font-bold tracking-[0.14em] text-[#48d87c]">
              {agent.code}
            </span>
            <button
              onClick={logout}
              className="text-sm font-semibold text-gray-400 hover:text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-8">{children}</div>
    </main>
  );
}
