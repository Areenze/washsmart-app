"use client";

/* Shared WashSMART UI primitives — green color scheme.
 * Primary #20a957 · dark #063c28 · accent #2ed06a · tint #edf8f1 · page #f5f8f6
 */

import type { ReactNode } from "react";

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
  return (
    <span className={`text-xl font-bold ${light ? "text-white" : ""}`}>
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
      className="mb-5 text-sm font-semibold text-[#168846]"
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
      className={`rounded-xl py-3 font-bold text-white ${
        disabled ? "cursor-not-allowed bg-gray-300" : "bg-[#20a957]"
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
      className={`rounded-xl border border-[#20a957] py-3 font-bold text-[#168846] ${className}`}
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
    <div className={`rounded-3xl bg-white p-6 shadow-sm md:p-7 ${className}`}>
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
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-800",
    gray: "bg-gray-100 text-gray-600",
    red: "bg-red-100 text-red-700",
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
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export function inputClass(bad: boolean): string {
  return `w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[#20a957] ${
    bad ? "border-red-400 bg-red-50" : "border-gray-200"
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
    <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
      <div className="text-5xl">{icon}</div>
      <h3 className="mt-3 text-xl font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">{body}</p>
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
            i < current ? "bg-[#20a957]" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}
