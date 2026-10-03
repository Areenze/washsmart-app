"use client";

/* WashSMART landing — sliding hero carousel, subscriber-first entry.
 * [I'm a Car Owner] → /app/signup (standalone subscriber sign-up form)
 * Partner CTA lives in the footer → /join
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand, IconChip, Logo, Reveal } from "@/components/ui";

const SLIDES = ["/images/hero-1.jpg", "/images/hero-2.jpg", "/images/hero-3.jpg"];
const SLIDE_MS = 5000;

function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="group relative text-[#48d87c] transition-colors hover:text-white"
    >
      {children}
      <span
        aria-hidden
        className="absolute -bottom-1.5 left-0 h-[3px] w-full origin-left scale-x-0 rounded-full bg-[#20a957] transition-transform duration-300 group-hover:scale-x-100"
      />
    </Link>
  );
}

export default function EntryPage() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setSlide((s) => (s + 1) % SLIDES.length),
      SLIDE_MS
    );
    return () => clearInterval(t);
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0f0c] text-[#e9f2ec]">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#111a14]/90 backdrop-blur-md px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo />
            <Brand />
          </div>
          <nav className="flex gap-6 text-sm font-semibold">
            <NavLink href="/app/login">Log in</NavLink>
            <NavLink href="/partner">Partner login</NavLink>
            <Link
              href="/admin"
              className="text-gray-500 transition-colors hover:text-gray-300"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — sliding, fading image carousel */}
      <section className="relative overflow-hidden bg-[#062b1e]">
        <div className="relative h-[560px] md:h-[620px]">
          {SLIDES.map((src, i) => (
            <div
              key={src}
              aria-hidden={i !== slide}
              className={`absolute inset-0 transition-all duration-[1500ms] ease-in-out ${
                i === slide
                  ? "translate-x-0 scale-100 opacity-100"
                  : "translate-x-10 scale-105 opacity-0"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-[#062b1e]/90 via-[#062b1e]/60 to-[#062b1e]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#062b1e]/70 via-transparent to-transparent" />

          <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-5">
            <p className="mb-3 text-xs font-bold tracking-[0.2em] text-[#65e28e] md:text-sm">
              LAGOS&rsquo; FIRST CAR-CARE NETWORK &middot; LAUNCHING SOON
            </p>
            <h1 className="max-w-2xl text-4xl font-bold leading-tight text-white md:text-6xl">
              One subscription.{" "}
              <span className="text-gradient-brand">Multiple washes.</span>
            </h1>
            <p className="mt-5 max-w-xl text-white/80">
              WashSMART connects car owners to a growing network of approved
              car-wash partners across Lagos.
            </p>
            <p className="mt-3 max-w-xl font-bold text-white">
              Subscribe once. Wash at participating WashSMART partner
              locations.
            </p>
            <div className="mt-8">
              <Link
                href="/app/signup"
                className="inline-block rounded-full bg-[#20a957] px-8 py-4 text-lg font-semibold tracking-wide text-white shadow-lg shadow-[#20a957]/25 transition-all duration-200 hover:bg-[#1a8a47] hover:shadow-xl hover:shadow-[#20a957]/30 active:scale-[0.98]"
              >
                🚗 I&rsquo;m a Car Owner &rarr;
              </Link>
            </div>
            <div className="mt-8 flex gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  aria-label={`Show slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === slide
                      ? "w-8 bg-[#48d87c]"
                      : "w-2 bg-[#111a14]/40 hover:bg-[#111a14]/70"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 md:py-24">
        <div className="grid gap-5 text-center md:grid-cols-3">
          {[
            ["📍", "green", "Growing network", "Approved partners across Lagos"],
            ["✅", "teal", "Simple verification", "One QR scan per wash"],
            ["💳", "amber", "One subscription", "Plans from ₦8,000/30 days"],
          ].map(([icon, tone, title, body], i) => (
            <Reveal key={title} delay={i * 150}>
              <div className="rounded-3xl border border-white/5 bg-[#111a14] p-8 shadow-[0_0_32px_5px_rgb(0_0_0/0.28)] transition-shadow duration-300 hover:shadow-[0_0_40px_8px_rgb(0_0_0/0.35)]">
                <div className="flex justify-center">
                  <IconChip icon={icon} tone={tone as "green" | "teal" | "amber"} />
                </div>
                <p className="mt-4 font-bold">{title}</p>
                <p className="mt-1 text-sm text-gray-400">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <footer className="border-t bg-[#111a14] px-5 py-8 text-center">
        <p className="text-sm font-semibold text-[#e9f2ec]">
          Own a car wash?{" "}
          <Link href="/join" className="text-[#48d87c] underline">
            Earn today — become a partner &rarr;
          </Link>
        </p>
        <p className="mt-3 text-xs text-gray-500">
          WashSMART · Lagos, Nigeria · Demo build — no real payments are
          processed.
        </p>
      </footer>
    </main>
  );
}
