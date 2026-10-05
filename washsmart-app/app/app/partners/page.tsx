"use client";

/* /app/partners — partner finder route (the same finder also lives inline
 * on /app as part of the continuous scroll).
 * Accepts ?q= to pre-filter by name or area (used by the landing hero
 * "Find a wash" search pill). */

import Link from "next/link";
import { PartnersSection } from "@/components/partners-section";

export default function PartnersPage() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-8">
      <Link
        href="/app"
        className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
      >
        ← Back
      </Link>
      <PartnersSection mapLight />
    </section>
  );
}
