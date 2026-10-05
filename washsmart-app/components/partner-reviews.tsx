"use client";

/* PartnerReviews — ratings + reviews for one partner.
 * Only subscribers with a completed wash at this partner can review
 * (enforced server-side in submit_review); one review per subscriber. */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getMyReview,
  getProfile,
  hasWashedAt,
  listPartnerReviews,
  submitReview,
  type Review,
} from "@/lib/db/store";

export function Stars({
  value,
  size = "text-base",
}: {
  value: number;
  size?: string;
}) {
  return (
    <span className={`${size} tracking-tight`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(value) ? "text-[#f5b301]" : "text-white/20"}>
          ★
        </span>
      ))}
    </span>
  );
}

function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function PartnerReviews({ partnerId }: { partnerId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = async () => {
    const [list, mine, washed, profile] = await Promise.all([
      listPartnerReviews(partnerId).catch(() => [] as Review[]),
      getMyReview(partnerId).catch(() => null),
      hasWashedAt(partnerId).catch(() => false),
      getProfile().catch(() => null),
    ]);
    setReviews(list);
    setMyReview(mine);
    setEligible(washed);
    setLoggedIn(!!profile);
    if (mine) {
      setRating(mine.rating);
      setBody(mine.body);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerId]);

  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSending(true);
    try {
      await submitReview(partnerId, rating, body.trim());
      setSaved(true);
      await load();
    } catch (err: any) {
      setError(
        err?.message === "wash here first"
          ? "You can review this partner after your first wash here."
          : "Couldn't save your review — please try again."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-8 rounded-3xl bg-[#111a14] p-7 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Ratings & Reviews</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Stars value={avg} />
            <span className="font-bold">{avg.toFixed(1)}</span>
            <span className="text-gray-500">
              ({reviews.length} review{reviews.length === 1 ? "" : "s"})
            </span>
          </div>
        )}
      </div>

      {/* Review form */}
      <div className="mt-5 border-t border-white/5 pt-5">
        {eligible === null || loggedIn === null ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : !loggedIn ? (
          <p className="text-sm text-gray-400">
            <Link href="/app/login" className="font-bold text-[#66dca4]">
              Log in
            </Link>{" "}
            to leave a review after your wash here.
          </p>
        ) : !eligible && !myReview ? (
          <p className="text-sm text-gray-400">
            🧽 Complete a wash at this partner to leave a review — only verified
            washes count.
          </p>
        ) : (
          <form onSubmit={send}>
            <p className="text-sm font-bold text-gray-300">
              {myReview ? "Your review" : "Rate your wash"}
            </p>
            <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label="Your rating">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={rating === i}
                  aria-label={`${i} star${i === 1 ? "" : "s"}`}
                  onClick={() => setRating(i)}
                  className={`text-3xl transition-transform active:scale-90 ${
                    i <= rating ? "text-[#f5b301]" : "text-white/20 hover:text-white/40"
                  }`}
                >
                  ★
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-400">
                {["", "Poor", "Fair", "Good", "Very good", "Excellent"][rating]}
              </span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="How was your wash? (optional)"
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#e9f2ec] outline-none placeholder:text-gray-500 focus:border-[#34d186]"
            />
            {error && (
              <p className="mt-2 text-sm font-semibold text-red-400">{error}</p>
            )}
            {saved && (
              <p className="mt-2 text-sm font-semibold text-[#66dca4]">
                Review saved ✓
              </p>
            )}
            <button
              type="submit"
              disabled={sending}
              className={`mt-3 rounded-full px-8 py-2.5 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] ${
                sending
                  ? "cursor-not-allowed bg-white/15"
                  : "bg-[#34d186] shadow-lg shadow-[#34d186]/20 hover:bg-[#27ab6c]"
              }`}
            >
              {sending ? "Saving…" : myReview ? "Update Review" : "Post Review"}
            </button>
          </form>
        )}
      </div>

      {/* Review list */}
      <div className="mt-6 space-y-4">
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-500">
            No reviews yet — be the first to rate this partner after your wash.
          </p>
        ) : (
          reviews.map((r) => (
            <div
              key={r.id}
              className={`rounded-2xl border p-4 ${
                myReview?.id === r.id
                  ? "border-[#34d186]/40 bg-[#34d186]/5"
                  : "border-white/5 bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">
                    {shortName(r.subscriberName)}
                    {myReview?.id === r.id && (
                      <span className="ml-2 rounded-full bg-[#34d186]/15 px-2 py-0.5 text-xs font-bold text-[#66dca4]">
                        You
                      </span>
                    )}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{fmtDate(r.createdAt)}</span>
              </div>
              <div className="mt-1">
                <Stars value={r.rating} size="text-sm" />
              </div>
              {r.body && (
                <p className="mt-1.5 text-sm text-gray-300">{r.body}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
