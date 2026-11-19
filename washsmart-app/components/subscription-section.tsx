"use client";

/* SubscriptionSection — plans + current subscription management.
 * Used inline on /app (continuous scroll) and as the body of the
 * /app/subscription route. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card, Reveal } from "@/components/ui";
import {
  fmtDate,
  getExtrasStatus,
  getMySubscription,
  getPlans,
  planPerkLines,
  type ExtrasStatus,
} from "@/lib/db/store";
import type { Plan, Subscription } from "@/lib/db/types";

export function SubscriptionSection() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [extras, setExtras] = useState<ExtrasStatus | null>(null);

  useEffect(() => {
    (async () => {
      setPlans(await getPlans());
      setSubscription(await getMySubscription());
      setExtras(await getExtrasStatus().catch(() => null));
    })();
  }, []);

  return (
    <div>
      {subscription && (
        <Card className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-400">Current plan</p>
              <h2 className="mt-1 text-2xl font-bold">
                {subscription.planName} · {subscription.price} / 30 days
              </h2>
              <p className="mt-1 text-sm text-gray-400">
                {subscription.washesRemaining} of {subscription.washesTotal}{" "}
                washes left · expires {fmtDate(subscription.expiresAt)}
              </p>
              {extras?.eligible &&
                (extras.available ? (
                  <p className="mt-1 text-sm font-semibold text-[#48d87c]">
                    ⭐ Extras session available this cycle — engine wash,
                    interior wipe, tyre shine &amp; vacuuming
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-gray-400">
                    ⭐ Extras session used
                    {extras.usedAt ? ` ${fmtDate(extras.usedAt)}` : ""} —
                    back again next cycle
                  </p>
                ))}
            </div>
            <Badge>ACTIVE</Badge>
          </div>
        </Card>
      )}

      <div className="text-center">
        <h2 className="text-4xl font-bold">
          {subscription ? "Change Your Plan" : "Choose Your Subscription"}
        </h2>
        <p className="mt-3 text-gray-400">Simple plans for every lifestyle.</p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan, i) => {
          const isCurrent = subscription?.planId === plan.id;
          const dimmed = !!subscription && !isCurrent;
          return (
            <Reveal key={plan.id} delay={i * 150}>
            <div
              className={`relative rounded-3xl bg-[#111a14] p-7 transition-opacity ${
                isCurrent
                  ? "border-2 border-[#20a957] shadow-[0_0_40px_8px_rgb(32_169_87/0.28)]"
                  : plan.popular
                    ? "border-2 border-[#20a957]/50 shadow-[0_0_40px_8px_rgb(32_169_87/0.12)]"
                    : "border border-white/10 shadow-[0_0_32px_5px_rgb(0_0_0/0.28)]"
              } ${dimmed ? "opacity-60" : ""}`}
            >
              {isCurrent ? (
                <div className="absolute right-5 top-5 rounded-full bg-[#20a957] px-3 py-1 text-xs font-bold text-white">
                  CURRENT PLAN
                </div>
              ) : (
                plan.popular && (
                  <div className="absolute right-5 top-5 rounded-full bg-[#20a957]/80 px-3 py-1 text-xs font-bold text-white">
                    MOST POPULAR
                  </div>
                )
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <div className="mt-5 text-4xl font-bold">
                {plan.price}
                <span className="text-sm font-normal text-gray-400">/30 days</span>
              </div>
              <div className="mt-6 space-y-3 text-sm">
                {planPerkLines(plan).map((line) => (
                  <p key={line}>
                    <span className="font-bold text-[#48d87c]">✓</span> {line}
                  </p>
                ))}
                <p><span className="font-bold text-[#48d87c]">✓</span> Approved partner locations</p>
                <p><span className="font-bold text-[#48d87c]">✓</span> Digital wash tracking</p>
              </div>
              {isCurrent ? (
                <div className="mt-8 w-full rounded-xl bg-[#20a957]/10 py-3 text-center font-bold text-[#48d87c]">
                  Current Plan
                </div>
              ) : (
                <Link
                  href={`/app/checkout?plan=${plan.id}`}
                  className="mt-8 block w-full rounded-full bg-[#20a957] py-3 transition-all duration-200 hover:bg-[#1a8a47] text-center font-bold text-white"
                >
                  {subscription ? "Switch to This Plan" : "Subscribe Now"}
                </Link>
              )}
            </div>
            </Reveal>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-gray-500">
        Demo checkout — no real charge is made. Paystack integration in production.
      </p>
      <p className="mt-2 text-center text-xs text-gray-500">
        🎁 Know a car owner?{" "}
        <Link href="/app/profile" className="font-bold text-[#48d87c]">
          Refer a friend, earn free washes →
        </Link>
      </p>
    </div>
  );
}
