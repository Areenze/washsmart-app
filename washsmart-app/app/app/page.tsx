"use client";

/* /app — subscriber home dashboard. */

import { useEffect, useState } from "react";
import Link from "next/link";
import PartnerCard from "@/components/partner-card";
import InstallPrompt from "@/components/install-prompt";
import { EmptyState, SectionTitle } from "@/components/ui";
import {
  fmtDate,
  getMySubscription,
  getProfile,
  listApprovedPartners,
  listWashHistory,
} from "@/lib/db/store";
import type { Partner, Profile, Subscription, WashTransaction } from "@/lib/db/types";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function UserHome() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [history, setHistory] = useState<WashTransaction[]>([]);

  useEffect(() => {
    (async () => {
      setProfile(await getProfile());
      setSubscription(await getMySubscription());
      setPartners(await listApprovedPartners());
      setHistory(await listWashHistory());
    })();
  }, []);

  const outOfWashes = (subscription?.washesRemaining ?? 0) <= 0;
  const firstName = profile?.name.split(" ")[0] ?? "there";

  return (
    <section className="mx-auto max-w-7xl px-5 py-8">
      <p className="text-lg text-gray-600">
        {greeting()} 👋, <span className="font-bold text-[#10251c]">{firstName}</span>
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
              ? `Your ${subscription.planName} subscription is active — ${subscription.washesRemaining} of ${subscription.washesTotal} washes left.`
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
                href="/app/subscription"
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
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          {subscription ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Subscription</p>
                  <h2 className="mt-1 text-2xl font-bold">
                    {subscription.planName} Plan
                  </h2>
                </div>
                <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                  ACTIVE
                </div>
              </div>
              <div className="mt-6 rounded-2xl bg-[#edf8f1] p-5">
                <p className="text-sm text-gray-500">Washes remaining</p>
                <div className="mt-1 text-4xl font-bold text-[#168846]">
                  {subscription.washesRemaining}
                  <span className="text-base font-normal text-gray-500">
                    {" "}
                    of {subscription.washesTotal}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Renews {fmtDate(subscription.renewsAt)}
                </p>
              </div>
              <Link
                href="/app/scan"
                className={`mt-5 block w-full rounded-xl py-3 text-center font-bold text-white ${
                  outOfWashes
                    ? "pointer-events-none bg-gray-300"
                    : "bg-[#20a957]"
                }`}
              >
                {outOfWashes ? "No Washes Left" : "Scan & Wash"}
              </Link>
              {outOfWashes && (
                <Link
                  href="/app/subscription"
                  className="mt-3 block w-full rounded-xl border border-[#20a957] py-3 text-center text-sm font-bold text-[#168846]"
                >
                  Renew Subscription
                </Link>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col justify-center text-center">
              <div className="text-5xl">🧽</div>
              <h2 className="mt-3 text-xl font-bold">No active subscription</h2>
              <p className="mt-2 text-sm text-gray-500">
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
      </div>

      <section className="mt-10">
        <SectionTitle
          action={
            <Link
              href="/app/partners"
              className="text-sm font-semibold text-[#168846]"
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
              className="text-sm font-semibold text-[#168846]"
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
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            {history.slice(0, 4).map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between border-b p-5 last:border-0"
              >
                <div>
                  <p className="font-bold">{w.partnerName}</p>
                  <p className="text-sm text-gray-500">{w.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{w.type}</p>
                  <p className="text-xs text-gray-400">{fmtDate(w.at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
