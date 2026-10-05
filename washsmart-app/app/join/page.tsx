"use client";

/* /join — "Become a WashSMART Partner" landing (funnel step 1). */

import Link from "next/link";
import { Brand, Logo } from "@/components/ui";

const benefits = [
  ["👥", "Steady customers", "Subscribers are directed to your wash bays every week."],
  ["💰", "Predictable income", "Get paid for every verified wash, tracked automatically."],
  ["✅", "Zero fraud", "QR verification means every wash is tied to a real subscription."],
  ["📊", "Business dashboard", "See washes, earnings and subscribers in real time."],
  ["📣", "Free marketing", "Your car wash appears in the WashSMART app across Lagos."],
  ["⚡", "Fast onboarding", "Apply in minutes — most reviews complete within 48 hours."],
];

const steps = [
  ["1", "Apply online", "Tell us about your car wash"],
  ["2", "We review", "Verification within 48 hours"],
  ["3", "Get approved", "Your shop goes live in the app"],
  ["4", "Start earning", "Scan subscriber QRs, get paid"],
];

export default function JoinLanding() {
  return (
    <main className="min-h-screen bg-[#0a0f0c] text-[#e9f2ec]">
      <header className="border-b bg-[#111a14] px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <Brand />
          </Link>
          <Link href="/partner" className="text-sm font-semibold text-[#48d87c]">
            Already a partner? Log in
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8">
        <Link
          href="/"
          className="mb-5 inline-block text-sm font-semibold text-[#48d87c]"
        >
          ← Home
        </Link>

        <div className="overflow-hidden rounded-3xl bg-[#063c28] p-8 text-white md:p-12">
          <p className="mb-3 text-sm font-semibold text-[#65e28e]">
            PARTNER REGISTRATION
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
            Become a WashSMART Partner
          </h1>
          <p className="mt-4 max-w-xl text-white/75">
            Join the network of approved car washes serving WashSMART
            subscribers across Lagos. More cars through your bays, less
            empty time.
          </p>
          <Link
            href="/join/apply"
            className="mt-7 inline-block rounded-full bg-[#28c866] px-8 py-3.5 font-bold text-white"
          >
            Start Application →
          </Link>
          <p className="mt-3 text-xs text-white/50">
            Takes about 5 minutes · No fees to apply
          </p>
        </div>

        <h2 className="mt-12 text-2xl font-bold">Why partner with WashSMART?</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {benefits.map(([icon, title, body]) => (
            <div key={title} className="rounded-2xl bg-[#111a14] p-6 shadow-sm">
              <div className="text-3xl">{icon}</div>
              <p className="mt-3 font-bold">{title}</p>
              <p className="mt-1 text-sm text-gray-400">{body}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-2xl font-bold">How it works</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {steps.map(([n, title, body]) => (
            <div key={n} className="rounded-2xl bg-[#111a14] p-6 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#20a957] font-bold text-white">
                {n}
              </div>
              <p className="mt-3 font-bold">{title}</p>
              <p className="mt-1 text-sm text-gray-400">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl bg-[#111a14] p-8 text-center shadow-sm">
          <h2 className="text-2xl font-bold">Ready to grow your car wash?</h2>
          <p className="mt-2 text-gray-400">
            Applications are reviewed within 48 hours.
          </p>
          <Link
            href="/join/apply"
            className="mt-6 inline-block rounded-full bg-[#20a957] px-8 py-3.5 font-bold text-white"
          >
            Apply Now →
          </Link>
        </div>
      </section>
    </main>
  );
}
