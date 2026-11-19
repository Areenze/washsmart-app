"use client";

/* GiftWashCard — Premium perk: gift 1 wash from your own pool to a
 * friend, once per 30-day cycle (migration_037, gift_wash RPC).
 * Renders nothing for plans without the perk. */

import { useEffect, useState } from "react";
import { getGiftStatus, giftWash, type GiftStatus } from "@/lib/db/store";

export default function GiftWashCard() {
  const [status, setStatus] = useState<GiftStatus | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setStatus(await getGiftStatus());
      } catch {
        setStatus(null);
      }
    })();
  }, []);

  if (!status?.eligible) return null;

  const submit = async () => {
    const target = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) {
      setError("Enter the email your friend uses for WashSMART.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await giftWash(target);
      setSent(true);
      setStatus({ ...status, giftedThisCycle: true, canGift: false });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not send the gift wash."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 rounded-3xl bg-[#111a14] p-6 shadow-sm">
      <p className="text-sm font-bold text-[#48d87c]">🎁 GIFT A WASH</p>
      <h2 className="mt-1 text-2xl font-bold">Share 1 wash with a friend</h2>
      {status.giftedThisCycle || sent ? (
        <p className="mt-3 text-sm text-gray-400">
          {sent
            ? "Sent! Your friend has 1 free wash, valid for 30 days."
            : "You've gifted your wash for this cycle — you can gift again next cycle."}
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-gray-400">
            A {status.planName ?? "Premium"} perk: once every cycle, send 1
            wash from your own balance to any WashSMART account. Their wash
            is valid for 30 days.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Friend's WashSMART email"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-gray-200 placeholder:text-gray-500 focus:border-[#20a957] focus:outline-none"
            />
            <button
              onClick={submit}
              disabled={busy || !status.canGift}
              className="shrink-0 rounded-xl bg-[#20a957] px-4 py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-50"
            >
              {busy ? "Sending…" : "Gift 1 wash"}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          {!status.canGift && !error && (
            <p className="mt-3 text-sm text-gray-500">
              No washes left in your pack to gift right now.
            </p>
          )}
        </>
      )}
    </div>
  );
}
