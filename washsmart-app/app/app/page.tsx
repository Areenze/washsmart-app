"use client";

/* /app — subscriber home dashboard. */

import { useEffect, useState } from "react";
import Link from "next/link";
import PartnerCard from "@/components/partner-card";
import InstallPrompt from "@/components/install-prompt";
import ReferralCard from "@/components/referral-card";
import { EmptyState, SectionTitle } from "@/components/ui";
import {
  creditDaysLeft,
  fmtDate,
  getWashSummary,
  getProfile,
  listApprovedPartners,
  listWashHistory,
} from "@/lib/db/store";
import type { WashSummary } from "@/lib/db/store";
import type {
  Partner,
  Profile,
  Subscription,
  WashTransaction,
} from "@/lib/db/types";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function UserHome() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<WashSummary | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [history, setHistory] = useState<WashTransaction[]>([]);

  useEffect(() => {
    (async () => {
      setProfile(await getProfile());
      setSummary(await getWashSummary());
      setPartners(await listApprovedPartners());
      setHistory(await listWashHistory());
    })();
  }, []);

  const subscription: Subscription | null = summary?.primary ?? null;
  const totalWashes = summary?.totalRemaining ?? 0;
  const bonusWashes = summary?.bonusRemaining ?? 0;
  const outOfWashes = totalWashes <= 0;
  const firstName = profile?.name.split(" ")[0] ?? "there";

  return (
    <section className="mx-auto max-w-7xl px-5 py-8">
      <p className="text-lg text-gray-300">
        {greeting()} 👋, <span className="font-bold text-[#e9f2ec]">{firstName}</span>
      </p>

      <div className="mt-4">
        <InstallPrompt />
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="overflow-hidden rounded-3xl bg-[#063c28] p-8 text-white">
          <p className="mb-3 text-sm font-semibold text-[#65e28e]">
            WASHSMART SUBSCRIBER
          </p>
          <h1 className="text-4xl font-bold leading-tight md:text-5xl">
            Your car deserves a
            <span className="text-[#48d87c]"> smarter</span> way to stay clean.
          </h1>
          <p className="mt-5 max-w-lg text-white/75">
            {subscription
              ? `Your ${subscription.planName} subscription is active — ${totalWashes} wash${totalWashes === 1 ? "" : "es"} left.`
              : "Subscribe to WashSMART and access a growing network of approved car-wash partners."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {subscription ? (
              <Link
                href="/app/scan"
                className="rounded-full bg-[#28c866] px-6 py-3 font-bold text-white"
              >
                Get My Wash QR
              </Link>
            ) : (
              <Link
                href="/app/signup"
                className="rounded-full bg-[#28c866] px-6 py-3 font-bold text-white"
              >
                Subscribe Now
              </Link>
            )}
            <Link
              href="/app/partners"
              className="rounded-full border border-white/40 px-6 py-3 font-bold"
            >
              Find a Partner
            </Link>
          </div>
          {!profile && (
            <p className="mt-4 text-sm text-white/70">
              Already a subscriber?{" "}
              <Link href="/app/login" className="font-bold text-white underline">
                Log in →
              </Link>
            </p>
          )}
        </div>

        <div className="space-y-6">
        <div className="rounded-3xl bg-[#111a14] p-6 shadow-sm">
          {subscription ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Subscription</p>
                  <h2 className="mt-1 text-2xl font-bold">
                    {subscription.planName} Plan
                  </h2>
                </div>
                <div className="rounded-full bg-[#20a957]/15 px-3 py-1 text-xs font-bold text-green-400">
                  ACTIVE
                </div>
              </div>
              <div className="mt-6 rounded-2xl bg-[#20a957]/10 p-5">
                <p className="text-sm text-gray-400">Washes remaining</p>
                <div className="mt-1 text-4xl font-bold text-[#48d87c]">
                  {totalWashes}
                  <span className="text-base font-normal text-gray-400">
                    {" "}
                    of {subscription.washesTotal}
                  </span>
                </div>
                {bonusWashes > 0 && (
                  <p className="mt-1 text-xs font-semibold text-[#48d87c]">
                    🎁 Includes {bonusWashes} free referral wash
                    {bonusWashes === 1 ? "" : "es"}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  Expires {fmtDate(subscription.expiresAt)} ·{" "}
                  {creditDaysLeft(subscription.expiresAt)} days left
                </p>
              </div>
              <Link
                href="/app/scan"
                className={`mt-5 block w-full rounded-xl py-3 text-center font-bold text-white ${
                  outOfWashes
                    ? "pointer-events-none bg-white/15"
                    : "bg-[#20a957]"
                }`}
              >
                {outOfWashes ? "No Washes Left" : "Scan & Wash"}
              </Link>
              {outOfWashes && (
                <Link
                  href="/app/subscription"
                  className="mt-3 block w-full rounded-xl border border-[#20a957] py-3 text-center text-sm font-bold text-[#48d87c]"
                >
                  Renew Subscription
                </Link>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col justify-center text-center">
              <div className="text-5xl">🧽</div>
              <h2 className="mt-3 text-xl font-bold">No active subscription</h2>
              <p className="mt-2 text-sm text-gray-400">
                Choose a plan to start washing smarter today.
              </p>
              <Link
                href="/app/subscription"
                className="mt-5 block w-full rounded-xl bg-[#20a957] py-3 text-center font-bold text-white"
              >
                View Plans
              </Link>
            </div>
          )}
        </div>
        {profile && <ReferralCard highlight={outOfWashes} />}
        </div>
      </div>

      <section className="mt-10">
        <SectionTitle
          action={
            <Link
              href="/app/partners"
              className="text-sm font-semibold text-[#48d87c]"
            >
              View all →
            </Link>
          }
        >
          Nearby Partners
        </SectionTitle>
        {partners.length === 0 ? (
          <EmptyState
            icon="📍"
            title="No partners yet"
            body="Approved partners will appear here."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {partners.slice(0, 3).map((p) => (
              <PartnerCard key={p.id} partner={p} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionTitle
          action={
            <Link
              href="/app/history"
              className="text-sm font-semibold text-[#48d87c]"
            >
              View all →
            </Link>
          }
        >
          Recent Washes
        </SectionTitle>
        {history.length === 0 ? (
          <EmptyState
            icon="🚿"
            title="No washes yet"
            body="Your completed washes will show up here."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl bg-[#111a14] shadow-sm">
            {history.slice(0, 4).map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between border-b p-5 last:border-0"
              >
                <div>
                  <p className="font-bold">{w.partnerName}</p>
                  <p className="text-sm text-gray-400">{w.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{w.type}</p>
                  <p className="text-xs text-gray-500">{fmtDate(w.at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
