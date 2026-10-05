"use client";

/* /app/subscription — plans route (the same plans also live inline on /app
 * as part of the continuous scroll). */

import Link from "next/link";
import { SubscriptionSection } from "@/components/subscription-section";

export default function SubscriptionPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-8">
      <Link
        href="/app"
        className="mb-5 inline-block text-sm font-semibold text-[#66dca4]"
      >
        ← Back
      </Link>
      <SubscriptionSection />
    </section>
  );
}
