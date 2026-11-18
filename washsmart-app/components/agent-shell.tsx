"use client";

/* /agent shell — guards the session, shows agent header + logout. */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Brand, ResponsiveLogo } from "@/components/ui";
import PullToRefresh from "@/components/pull-to-refresh";
import FitDebug from "@/components/fit-debug";
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
    <main className="flex min-h-screen w-full min-w-0 flex-col bg-[#0a0f0c] text-[#e9f2ec] [overflow-x:clip]">
      <PullToRefresh />
      <FitDebug />
      <header className="border-b bg-[#111a14] px-3 py-4 sm:px-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <Link href="/agent/dashboard" className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <ResponsiveLogo />
            <Brand />
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {/* The code chip hides on phones: logo + wordmark + chip + Log
             * out cannot all fit ~320px, and the dashboard body already
             * shows the code prominently. It returns from sm up. */}
            <span className="hidden rounded-md bg-[#20a957]/15 px-1.5 py-1 font-mono text-[10px] font-bold tracking-[0.08em] text-[#48d87c] sm:inline-block sm:px-2 sm:tracking-[0.14em]">
              {agent.code}
            </span>
            <button
              onClick={logout}
              className="whitespace-nowrap text-sm font-semibold text-gray-400 hover:text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full min-w-0 max-w-7xl px-5 py-8">{children}</div>
    </main>
  );
}
