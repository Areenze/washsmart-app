"use client";

/* Shared WashSMART UI primitives — green color scheme.
 * Primary #20a957 · dark #063c28 · accent #2ed06a · bright #48d87c
 * Shapes follow the EverWash-inspired system: pill buttons/capsules,
 * tinted icon chips, soft-shadow cards, staggered scroll reveals.
 */

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full bg-[#20a957] text-white"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden
    >
      🚗
    </div>
  );
}

export function Brand({ light = false }: { light?: boolean }) {
  void light; // all headers are dark now; brand always renders light
  return (
    <span className="text-xl font-bold text-[#e9f2ec]">
      Wash<span className="text-[#20a957]">SMART</span>
    </span>
  );
}

export function BackButton({
  onClick,
  label = "← Back",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="mb-5 text-sm font-semibold text-[#48d87c]"
    >
      {label}
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-8 py-3.5 font-semibold tracking-wide text-white transition-all duration-200 active:scale-[0.98] ${
        disabled
          ? "cursor-not-allowed bg-white/15"
          : "bg-[#20a957] shadow-lg shadow-[#20a957]/20 hover:bg-[#1a8a47] hover:shadow-xl hover:shadow-[#20a957]/25"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function OutlineButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border border-[#20a957] px-8 py-3.5 font-semibold tracking-wide text-[#48d87c] transition-all duration-200 hover:bg-[#20a957]/10 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-white/5 bg-[#111a14] p-6 shadow-[0_0_32px_5px_rgb(0_0_0/0.28)] md:p-7 ${className}`}
    >
      {children}
    </div>
  );
}

/* EverWash-style icon chip: tinted pastel square, saturated glyph.
 * Tones map to WashSMART greens so chips stay on-brand on dark surfaces. */
export function IconChip({
  icon,
  tone = "green",
  size = 64,
}: {
  icon: ReactNode;
  tone?: "green" | "teal" | "amber";
  size?: number;
}) {
  const tones: Record<string, string> = {
    green: "bg-[#20a957]/15 text-[#48d87c]",
    teal: "bg-cyan-400/15 text-cyan-300",
    amber: "bg-amber-400/15 text-amber-300",
  };
  return (
    <div
      className={`flex items-center justify-center rounded-2xl ${tones[tone]}`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden
    >
      {icon}
    </div>
  );
}

/* EverWash-style scroll reveal: fades/slides in on first view,
 * with optional stagger delay (ms) for card grids. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          el.classList.add("is-visible");
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: "green" | "amber" | "gray" | "red";
}) {
  const tones: Record<string, string> = {
    green: "bg-[#20a957]/15 text-green-400",
    amber: "bg-amber-500/15 text-amber-200",
    gray: "bg-white/5 text-gray-300",
    red: "bg-red-500/15 text-red-300",
  };
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Field({
  label,
  required,
  error,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function inputClass(bad: boolean): string {
  return `w-full rounded-xl border px-4 py-3 text-sm text-[#e9f2ec] outline-none placeholder:text-gray-500 focus:border-[#20a957] ${
    bad ? "border-red-400 bg-red-500/10" : "border-white/10 bg-white/5"
  }`;
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-2xl font-bold">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-[#111a14] p-10 text-center shadow-sm">
      <div className="text-5xl">{icon}</div>
      <h3 className="mt-3 text-xl font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-gray-400">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StepDots({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-2" aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-full ${
            i < current ? "bg-[#20a957]" : "bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}
