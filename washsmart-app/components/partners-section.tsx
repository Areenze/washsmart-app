"use client";

/* PartnersSection — the full partner finder (search + list + map placeholder
 * + coverage request form). Used inline on /app (continuous scroll) and as
 * the body of the /app/partners route. */

import { useEffect, useState } from "react";
import PartnerCard from "@/components/partner-card";
import { EmptyState, Reveal } from "@/components/ui";
import { listApprovedPartners, submitLocationRequest } from "@/lib/db/store";
import type { Partner } from "@/lib/db/types";

export function PartnersSection({
  detailBase = "/app/partners",
}: {
  detailBase?: string;
}) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [q, setQ] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqArea, setReqArea] = useState("");
  const [reqState, setReqState] = useState<
    "idle" | "sending" | "done" | "error"
  >("idle");

  useEffect(() => {
    // Support deep links like /app/partners?q=lekki or /app?q=lekki.
    try {
      const params = new URLSearchParams(window.location.search);
      setQ(params.get("q") ?? "");
    } catch {
      /* ignore */
    }
    (async () => setPartners(await listApprovedPartners()))();
  }, []);

  const query = q.trim().toLowerCase();
  const filtered = query
    ? partners.filter((p) =>
        `${p.name} ${p.location}`.toLowerCase().includes(query)
      )
    : partners;

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reqEmail.trim());
  const canSend = emailOk && reqArea.trim().length > 1 && reqState !== "sending";

  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setReqState("sending");
    const res = await submitLocationRequest(reqEmail, reqArea);
    setReqState(res.ok ? "done" : "error");
  };

  return (
    <div>
      <h2 className="text-3xl font-bold">Find a WashSMART Partner</h2>
      <p className="mt-2 text-gray-400">
        Choose an approved car-wash center near you.
      </p>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="mt-6 flex max-w-xl items-center gap-2 rounded-full border border-white/10 bg-white/5 py-2 pl-5 pr-2"
      >
        <span aria-hidden className="text-lg">📍</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by area or partner name…"
          aria-label="Search partners by area or name"
          className="w-full bg-transparent py-1.5 text-sm text-[#e9f2ec] outline-none placeholder:text-gray-500"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-gray-300 transition-colors hover:bg-white/15"
          >
            Clear
          </button>
        )}
      </form>

      <div className="mt-10 text-center">
        <h3 className="text-2xl font-bold md:text-3xl">Partner Locations</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-400">
          Check back often — we are continually adding partner washes to our
          network across Lagos.
        </p>
      </div>

      <div className="mt-6 rounded-3xl bg-[#20a957]/15 p-6">
        <div className="flex h-56 items-center justify-center rounded-2xl bg-[#152419] md:h-72">
          <div className="text-center">
            <div className="text-5xl">📍</div>
            <p className="mt-2 font-bold">WashSMART Partner Map</p>
            <p className="text-sm text-gray-300">
              {partners.length} approved partner{partners.length === 1 ? "" : "s"} near you ·
              live Google Maps integration in production.
            </p>
          </div>
        </div>
      </div>

      {query && (
        <p className="mt-6 text-sm text-gray-400">
          <span className="font-bold text-[#e9f2ec]">{filtered.length}</span>{" "}
          result{filtered.length === 1 ? "" : "s"} for{" "}
          <span className="font-bold text-[#e9f2ec]">“{q.trim()}”</span>
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="📍"
            title={query ? "No partners match your search" : "No partners yet"}
            body={
              query
                ? "Try a different area or partner name — new partners join regularly."
                : "Newly approved partners will appear here automatically."
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {filtered.map((p, i) => (
            <Reveal key={p.id} delay={Math.min(i, 5) * 75}>
              <PartnerCard partner={p} detailBase={detailBase} />
            </Reveal>
          ))}
        </div>
      )}

      {/* Request coverage — "Don't see a WashSMART location in your area?" */}
      <div className="mt-14 rounded-3xl border border-white/5 bg-[#0d130f] p-8 text-center shadow-[0_0_32px_5px_rgb(0_0_0/0.28)] md:p-10">
        <h3 className="text-2xl font-bold md:text-3xl">
          Don&rsquo;t see a WashSMART location in your area?
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-400">
          Let us know what neighborhood or city you&rsquo;d like to see next —
          we expand where subscribers ask us to.
        </p>

        {reqState === "done" ? (
          <div className="mx-auto mt-6 max-w-xl rounded-2xl bg-[#20a957]/10 p-5">
            <p className="font-bold text-[#48d87c]">Request received ✓</p>
            <p className="mt-1 text-sm text-gray-400">
              We&rsquo;ll prioritize <span className="font-semibold text-[#e9f2ec]">{reqArea.trim()}</span> as
              our network grows. Watch your inbox for launch news.
            </p>
          </div>
        ) : (
          <form
            onSubmit={sendRequest}
            className="mx-auto mt-6 flex max-w-2xl flex-col gap-3 sm:flex-row"
          >
            <input
              value={reqEmail}
              onChange={(e) => setReqEmail(e.target.value)}
              placeholder="Email"
              inputMode="email"
              autoComplete="email"
              aria-label="Email address"
              className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-[#e9f2ec] outline-none placeholder:text-gray-500 focus:border-[#20a957]"
            />
            <input
              value={reqArea}
              onChange={(e) => setReqArea(e.target.value)}
              placeholder="Neighborhood or city"
              aria-label="Neighborhood or city"
              className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-[#e9f2ec] outline-none placeholder:text-gray-500 focus:border-[#20a957]"
            />
            <button
              type="submit"
              disabled={!canSend}
              className={`shrink-0 rounded-full px-8 py-3 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] ${
                canSend
                  ? "bg-[#20a957] shadow-lg shadow-[#20a957]/20 hover:bg-[#1a8a47]"
                  : "cursor-not-allowed bg-white/15"
              }`}
            >
              {reqState === "sending" ? "Sending…" : "→ Send"}
            </button>
          </form>
        )}
        {reqState === "error" && (
          <p className="mt-3 text-sm font-semibold text-red-400">
            Couldn&rsquo;t send your request — please check your connection and
            try again.
          </p>
        )}
      </div>
    </div>
  );
}
