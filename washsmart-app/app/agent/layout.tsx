import type { Metadata } from "next";
import type { ReactNode } from "react";
import AgentShell from "@/components/agent-shell";

/* /agent segment layout (server) — gives the field-agent experience its own
 * PWA identity: agents installing from an /agent page get the
 * "WashSMART Agent" app (manifest-agent.json, start_url /agent) instead of
 * the subscriber app. The interactive shell stays a client component
 * (components/agent-shell.tsx). Same pattern as /partner. */
export const metadata: Metadata = {
  title: "WashSMART Agent",
  manifest: "/manifest-agent.json",
  icons: {
    icon: "/icons/agent/icon-192.png",
    apple: "/icons/agent/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "WS Agent",
    statusBarStyle: "default",
  },
};

export default function AgentLayout({ children }: { children: ReactNode }) {
  return <AgentShell>{children}</AgentShell>;
}
