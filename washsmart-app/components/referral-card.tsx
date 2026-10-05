"use client";

/* ReferralCard — "Out of washes? Refer a friend, get 1 free wash."
 * Shows the subscriber's shareable link with copy + WhatsApp share. */

import { useEffect, useState } from "react";
import {
  getReferralCode,
  getReferralCount,
  referralLink,
  whatsappShareUrl,
} from "@/lib/db/store";

export default function ReferralCard({
  highlight = false,
}: {
  highlight?: boolean;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setCode(await getReferralCode());
        setCount(await getReferralCount());
      } catch {
        setCode(null);
      }
    })();
  }, []);

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(referralLink(code));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      className={`rounded-3xl p-6 shadow-sm ${
        highlight
          ? "border-2 border-[#20a957] bg-[#0e2a1c]"
          : "bg-[#111a14]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#48d87c]">
            🎁 REFER A FRIEND
          </p>
          <h2 className="mt-1 text-2xl font-bold">Get 1 free wash</h2>
        </div>
        {count > 0 && (
          <div className="rounded-full bg-[#20a957]/15 px-3 py-1 text-xs font-bold text-green-400">
            {count} joined
          </div>
        )}
      </div>
      <p className="mt-3 text-sm text-gray-400">
        Out of washes? Share your link — when a friend subscribes, you
        instantly get <span className="font-bold text-[#e9f2ec]">1 free wash</span>,
        valid for 30 days. No limit.
      </p>
      {code ? (
        <>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <p className="min-w-0 flex-1 truncate text-xs text-gray-300">
              {referralLink(code)}
            </p>
            <button
              onClick={copy}
              className="shrink-0 rounded-lg bg-[#20a957] px-3 py-1.5 text-xs font-bold text-white"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <a
            href={whatsappShareUrl(code)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block w-full rounded-full bg-[#25d366] py-3 transition-all duration-200 hover:bg-[#1fb857] text-center font-bold text-white"
          >
            Share on WhatsApp
          </a>
        </>
      ) : (
        <p className="mt-4 text-sm text-gray-500">Loading your link…</p>
      )}
    </div>
  );
}
