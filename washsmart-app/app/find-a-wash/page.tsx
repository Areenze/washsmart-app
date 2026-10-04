"use client";

/* /find-a-wash — public partner finder. Same finder as the in-app Partners
 * tab, but on the marketing site for logged-out visitors. */

import Link from "next/link";
import { Suspense } from "react";
import { Brand, Logo } from "@/components/ui";
import { PartnersSection } from "@/components/partners-section";

export default function FindAWashPage() {
  return (
    <main className="min-h-screen bg-[#0a0f0c] text-[#e9f2ec]">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#111a14]/90 backdrop-blur-md px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="WashSMART home">
            <Logo />
            <Brand />
          </Link>
          <Link
            href="/app/signup"
            className="rounded-full bg-[#20a957] px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-[#1a8a47]"
          >
            Subscribe
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-10 md:py-14">
        <Suspense fallback={<p className="text-gray-400">Loading…</p>}>
          <PartnersSection detailBase="/find-a-wash" />
        </Suspense>
        <div className="mt-10 rounded-3xl border border-[#20a957]/25 bg-[#0e2a1c] p-8 text-center">
          <p className="text-xl font-bold">Don&rsquo;t see your area yet?</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-gray-400">
            We&rsquo;re adding approved wash centers across Lagos. Subscribe and
            we&rsquo;ll notify you as the network grows near you.
          </p>
          <Link
            href="/app/signup"
            className="mt-5 inline-block rounded-full bg-[#20a957] px-8 py-3.5 font-bold text-white transition-all duration-200 hover:bg-[#1a8a47] active:scale-[0.98]"
          >
            Get WashSMART &rarr;
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-[#111a14] px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-gray-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo />
            <Brand />
          </div>
          <div className="flex gap-6">
            <Link href="/#plans" className="hover:text-white">Plans</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
