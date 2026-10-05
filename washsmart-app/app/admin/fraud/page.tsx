"use client";

/* /admin/fraud — automated anomaly flags over redemption patterns. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ui";
import {
  adminDismissFraudFlag,
  adminFraudFlags,
  type FraudFlag,
} from "@/lib/db/admin";

const SEV_STYLE: Record<string, string> = {
  high: "bg-red-500/15 text-red-400",
  medium: "bg-yellow-500/15 text-yellow-400",
};

export default function AdminFraudPage() {
  const [flags, setFlags] = useState<FraudFlag[] | null>(null);
  const [pending, setPending] = useState<FraudFlag | null>(null);

  const load = async () => {
    setFlags(await adminFraudFlags().catch(() => []));
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runDismiss = async (reason: string) => {
    if (!pending) return;
    await adminDismissFraudFlag(pending.rule, pending.entityId, reason);
    setPending(null);
    await load();
  };

  return (
    <section>
      <h1 className="text-2xl font-bold">Fraud &amp; risk</h1>
      <p className="mt-1 text-sm text-gray-400">
        Automated checks over the last 30 days of redemptions. Flags are
        advisory — dismiss the ones you&apos;ve checked.
      </p>

      {flags === null ? (
        <p className="mt-6 text-gray-400">Running checks…</p>
      ) : flags.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-[#111a14] p-8 text-center">
          <p className="text-4xl">✅</p>
          <p className="mt-2 font-bold">Nothing suspicious</p>
          <p className="mt-1 text-sm text-gray-400">
            No redemption patterns tripped any rule.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {flags.map((f) => (
            <div
              key={`${f.rule}:${f.entityId}`}
              className="rounded-2xl bg-[#111a14] p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${SEV_STYLE[f.severity]}`}
                  >
                    {f.severity === "high" ? "HIGH" : "Watch"}
                  </span>
                  <p className="font-bold">{f.ruleLabel}</p>
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(f.at).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              <p className="mt-2 text-sm text-gray-400">{f.description}</p>
              <div className="mt-3 flex items-center gap-4">
                <Link
                  href={f.href}
                  className="text-sm font-bold text-[#66dca4] hover:underline"
                >
                  {f.entityName} →
                </Link>
                <button
                  onClick={() => setPending(f)}
                  className="text-sm font-bold text-gray-500 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-2xl bg-[#111a14] p-5 text-sm text-gray-400">
        <p className="font-bold text-white">How the rules work</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <b>Redemption burst:</b> a partner with 8+ washes inside any 2-hour
            window.
          </li>
          <li>
            <b>Rapid repeat:</b> a subscriber with two washes less than 30
            minutes apart.
          </li>
          <li>
            <b>Single-partner concentration:</b> 5+ washes, all at one partner.
          </li>
          <li>
            <b>New-account burst:</b> 3+ washes from an account under 7 days old.
          </li>
        </ul>
      </div>
      <ConfirmDialog
        open={pending !== null}
        title={`Dismiss flag for ${pending?.entityName}?`}
        body="Dismissed flags stop showing on this page."
        confirmLabel="Dismiss"
        inputLabel="Reason"
        inputPlaceholder="Checked — legitimate repeat customer"
        onConfirm={runDismiss}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}
