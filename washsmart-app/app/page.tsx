"use client";

/* WashSMART landing — sliding hero carousel, subscriber-first entry.
 * [I'm a Car Owner] → /app/signup (standalone subscriber sign-up form)
 * Partner CTA lives in the footer → /join
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { Brand, Logo } from "@/components/ui";

const SLIDES = ["/images/hero-1.jpg", "/images/hero-2.jpg", "/images/hero-3.jpg"];
const SLIDE_MS = 5000;

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
      <header className="border-b bg-[#111a14] px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo />
            <Brand />
          </div>
          <div className="flex gap-4 text-sm font-semibold">
            <Link href="/app/login" className="text-[#48d87c]">
              Log in
            </Link>
            <Link href="/partner" className="text-[#48d87c]">
              Partner login
            </Link>
            <Link href="/admin" className="text-gray-400">
              Admin
            </Link>
          </div>
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
              <span className="text-[#48d87c]">Multiple washes.</span>
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
                className="inline-block rounded-full bg-[#20a957] px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-[#1a8a47]"
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

      <section className="mx-auto max-w-7xl px-5 py-10 md:py-14">
        <div className="grid gap-4 text-center md:grid-cols-3">
          {[
            ["📍", "Growing network", "Approved partners across Lagos"],
            ["✅", "Simple verification", "One QR scan per wash"],
            ["💳", "One subscription", "Plans from ₦8,000/30 days"],
          ].map(([icon, title, body]) => (
            <div key={title} className="rounded-2xl bg-[#111a14] p-6 shadow-sm">
              <div className="text-3xl">{icon}</div>
              <p className="mt-2 font-bold">{title}</p>
              <p className="mt-1 text-sm text-gray-400">{body}</p>
            </div>
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
