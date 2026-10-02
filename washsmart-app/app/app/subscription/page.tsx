"use client";

/* /app/subscription — plans + current subscription management. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import {
  fmtDate,
  getMySubscription,
  getPlans,
} from "@/lib/db/store";
import type { Plan, Subscription } from "@/lib/db/types";

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    (async () => {
      setPlans(await getPlans());
      setSubscription(await getMySubscription());
    })();
  }, []);

  return (
    <section className="mx-auto max-w-6xl px-5 py-8">
      <Link
        href="/app"
        className="mb-5 inline-block text-sm font-semibold text-[#168846]"
      >
        ← Back
      </Link>

      {subscription && (
        <Card className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Current plan</p>
              <h2 className="mt-1 text-2xl font-bold">
                {subscription.planName} · {subscription.price}/month
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {subscription.washesRemaining} of {subscription.washesTotal}{" "}
                washes remaining · renews {fmtDate(subscription.renewsAt)}
              </p>
            </div>
            <Badge>ACTIVE</Badge>
          </div>
        </Card>
      )}

      <div className="text-center">
        <h1 className="text-4xl font-bold">
          {subscription ? "Change Your Plan" : "Choose Your Subscription"}
        </h1>
        <p className="mt-3 text-gray-500">Simple plans for every lifestyle.</p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = subscription?.planId === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl bg-white p-7 shadow-sm ${
                plan.popular
                  ? "border-2 border-[#20a957]"
                  : "border border-gray-100"
              }`}
            >
              {plan.popular && (
                <div className="absolute right-5 top-5 rounded-full bg-[#20a957] px-3 py-1 text-xs font-bold text-white">
                  MOST POPULAR
                </div>
              )}
              <h2 className="text-xl font-bold">{plan.name}</h2>
              <div className="mt-5 text-4xl font-bold">
                {plan.price}
                <span className="text-sm font-normal text-gray-500">/month</span>
              </div>
              <div className="mt-6 space-y-3 text-sm">
                <p>✓ {plan.washes} washes per month</p>
                <p>✓ Approved partner locations</p>
                <p>✓ Digital wash tracking</p>
                <p>✓ Subscriber verification</p>
              </div>
              {isCurrent ? (
                <div className="mt-8 w-full rounded-xl bg-[#edf8f1] py-3 text-center font-bold text-[#168846]">
                  Current Plan
                </div>
              ) : (
                <Link
                  href={`/app/checkout?plan=${plan.id}`}
                  className="mt-8 block w-full rounded-xl bg-[#20a957] py-3 text-center font-bold text-white"
                >
                  {subscription ? "Switch to This Plan" : "Subscribe Now"}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        Demo checkout — no real charge is made. Paystack integration in production.
      </p>
    </section>
  );
}
