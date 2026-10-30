"use client";

/* /agent/dashboard — the field agent's home: referred partners,
 * bounty-gate progress (20 verified washes within 60 days of approval),
 * and bounty earnings. */

import { useEffect, useState } from "react";
import {
  AGENT_BOUNTY_GATE_DAYS,
  AGENT_BOUNTY_GATE_WASHES,
  AGENT_BOUNTY_NGN,
  currentAgentSession,
  getAgentApplications,
  getAgentReferrals,
} from "@/lib/db/agents";
import type { Agent, AgentApplication, AgentReferral } from "@/lib/db/types";
import QRCode from "@/components/qrcode";

const ngn = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

type GateState = "hit" | "progress" | "expired" | "pending";

function gateState(r: AgentReferral): GateState {
  if (r.washes_gate >= AGENT_BOUNTY_GATE_WASHES) return "hit";
  if (!r.approved_at) return "pending";
  const deadline =
    new Date(r.approved_at).getTime() +
    AGENT_BOUNTY_GATE_DAYS * 24 * 3600 * 1000;
  return Date.now() > deadline ? "expired" : "progress";
}

const GATE_LABEL: Record<GateState, string> = {
  hit: "✅ Gate hit",
  progress: "🎯 In progress",
  expired: "⏳ Window passed",
  pending: "🕐 Awaiting approval",
};

export default function AgentDashboard() {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [referrals, setReferrals] = useState<AgentReferral[]>([]);
  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [a, r, apps] = await Promise.all([
          currentAgentSession(),
          getAgentReferrals().catch(() => [] as AgentReferral[]),
          getAgentApplications().catch(() => [] as AgentApplication[]),
        ]);
        setAgent(a ?? null);
        setReferrals(r);
        setApplications(apps);
      } catch {
        setError("Couldn't load your dashboard. Check your connection.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-gray-400">Loading your dashboard…</p>;
  if (error) return <p className="font-semibold text-red-300">{error}</p>;

  const active = referrals.filter((r) => r.status === "approved");
  const totalWashes = referrals.reduce((s, r) => s + r.washes_total, 0);
  const gatesHit = referrals.filter((r) => gateState(r) === "hit").length;
  const earned = gatesHit * AGENT_BOUNTY_NGN;

  return (
    <div>
      <p className="text-sm text-gray-400">FIELD AGENT</p>
      <h1 className="mt-1 text-3xl font-bold">
        Welcome{agent ? `, ${agent.name.split(" ")[0]}` : ""} 👋
      </h1>
      <p className="mt-1 text-sm text-gray-400">
        Your code <span className="font-mono font-bold text-[#48d87c]">{agent?.code}</span> — share
        it with car-wash owners when you sign them up.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Partners referred" value={String(referrals.length)} />
        <Stat label="Active partners" value={String(active.length)} />
        <Stat label="Total washes" value={totalWashes.toLocaleString()} />
        <Stat label="Bounties earned" value={ngn(earned)} sub={`${gatesHit} gate${gatesHit === 1 ? "" : "s"} hit`} />
      </div>

      {agent && (
        <div className="mt-8 rounded-3xl bg-[#111a14] p-6">
          <h2 className="text-lg font-bold">🔗 Your signup link</h2>
          <p className="mt-1 text-sm text-gray-400">
            Send this link to a car-wash owner, or let them scan the code.
            Your agent code is added automatically — you always get credit.
          </p>
          <div className="mt-4 flex flex-wrap items-start gap-5">
            <div className="rounded-2xl bg-white p-3">
              <QRCode
                text={`https://washsmart.ng/join/apply?agent=${agent.code}`}
                size={148}
              />
            </div>
            <div className="min-w-56 flex-1">
              <p className="break-all rounded-xl bg-white/5 px-3 py-2 font-mono text-sm text-[#48d87c]">
                washsmart.ng/join/apply?agent={agent.code}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(
                        `https://washsmart.ng/join/apply?agent=${agent.code}`
                      )
                      .then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      })
                      .catch(() => {});
                  }}
                  className="rounded-full bg-[#20a957] px-4 py-2 text-sm font-bold text-white"
                >
                  {copied ? "✓ Copied" : "Copy link"}
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Join WashSMART as a partner car wash — apply here (my agent code is added automatically): https://washsmart.ng/join/apply?agent=${agent.code}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white"
                >
                  Share on WhatsApp
                </a>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Tip: screenshot the QR code and keep it on your phone — owners
                can scan it right at the wash.
              </p>
            </div>
          </div>
        </div>
      )}

      <h2 className="mb-4 mt-8 text-xl font-bold">My submissions</h2>
      {applications.length === 0 ? (
        <div className="rounded-3xl bg-[#111a14] p-8 text-center">
          <div className="text-4xl">📋</div>
          <p className="mt-3 font-bold">No applications yet</p>
          <p className="mt-1 text-sm text-gray-400">
            When a car wash applies with your code or your link, it appears
            here — pending, approved, or not approved — so you can follow up.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((a) => (
            <div
              key={a.ref}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#111a14] p-5"
            >
              <div>
                <p className="font-bold">{a.businessName}</p>
                <p className="text-sm text-gray-400">
                  {a.area} · applied{" "}
                  {new Date(a.submittedAt).toLocaleDateString("en-NG", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  · {a.ref}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  a.status === "approved"
                    ? "bg-[#2ed06a]/15 text-[#48d87c]"
                    : a.status === "pending"
                      ? "bg-amber-400/15 text-amber-300"
                      : "bg-white/5 text-gray-400"
                }`}
              >
                {a.status === "approved"
                  ? "✅ Approved"
                  : a.status === "pending"
                    ? "🕐 Pending review"
                    : a.status === "rejected"
                      ? "❌ Not approved"
                      : a.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-3xl bg-[#111a14] p-6">
        <h2 className="text-lg font-bold">
          🎯 Bounty gate: {AGENT_BOUNTY_GATE_WASHES} washes in{" "}
          {AGENT_BOUNTY_GATE_DAYS} days → {ngn(AGENT_BOUNTY_NGN)}
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Each approved partner that reaches {AGENT_BOUNTY_GATE_WASHES} verified
          washes within {AGENT_BOUNTY_GATE_DAYS} days of approval earns you a{" "}
          {ngn(AGENT_BOUNTY_NGN)} bounty.
        </p>
      </div>

      <h2 className="mb-4 mt-8 text-xl font-bold">Referred partners</h2>
      {referrals.length === 0 ? (
        <div className="rounded-3xl bg-[#111a14] p-8 text-center">
          <div className="text-4xl">🤝</div>
          <p className="mt-3 font-bold">No partners yet</p>
          <p className="mt-1 text-sm text-gray-400">
            When a car wash applies with your agent code, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {referrals.map((r) => {
            const g = gateState(r);
            const pct = Math.min(
              100,
              Math.round((r.washes_gate / AGENT_BOUNTY_GATE_WASHES) * 100)
            );
            return (
              <div key={r.partner_id} className="rounded-2xl bg-[#111a14] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">{r.name}</p>
                    <p className="text-sm text-gray-400">
                      {r.area} · {r.washes_total} wash
                      {r.washes_total === 1 ? "" : "es"} total
                    </p>
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-gray-300">
                    {GATE_LABEL[g]}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Bounty gate progress</span>
                    <span className="font-bold text-[#48d87c]">
                      {r.washes_gate}/{AGENT_BOUNTY_GATE_WASHES} washes
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${g === "hit" ? "bg-[#2ed06a]" : "bg-[#20a957]"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-[#111a14] p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}
