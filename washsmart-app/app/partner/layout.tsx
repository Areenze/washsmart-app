import type { Metadata } from "next";
import type { ReactNode } from "react";
import PartnerShell from "@/components/partner-shell";

/* /partner segment layout (server) — gives the partner experience its own
 * PWA identity: partners installing from a /partner page get the
 * "WashSMART Partner" app (manifest-partner.json, start_url /partner)
 * instead of the subscriber app. The interactive shell stays a client
 * component (components/partner-shell.tsx). */
export const metadata: Metadata = {
  title: "WashSMART Partner",
  manifest: "/manifest-partner.json",
  appleWebApp: {
    capable: true,
    title: "WS Partner",
    statusBarStyle: "default",
  },
};

export default function PartnerLayout({ children }: { children: ReactNode }) {
  return <PartnerShell>{children}</PartnerShell>;
}
