"use client";

/* PartnersSection — the full partner finder (search + map pins + coverage
 * request form). Partners are pins on the map, not cards — the list would
 * be unusable at hundreds of partners. Used inline on /app (continuous
 * scroll), as the body of the /app/partners route, and on /find-a-wash. */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { EmptyState } from "@/components/ui";
import {
  getProfile,
  listApprovedPartners,
  submitLocationRequest,
} from "@/lib/db/store";
import type { Partner } from "@/lib/db/types";

/** "lat,lng" → [lat, lng], or null when the record has no usable pin. */
function parseGps(gps?: string): [number, number] | null {
  if (!gps) return null;
  const m = gps.split(",").map((s) => parseFloat(s.trim()));
  if (m.length !== 2 || m.some((n) => Number.isNaN(n))) return null;
  const [lat, lng] = m;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

function haversineKm(
  a: [number, number],
  b: [number, number]
): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const PAGE_SIZE = 10;

const PartnerMap = dynamic(
  () => import("@/components/partner-map").then((m) => m.PartnerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[62vh] min-h-[420px] items-center justify-center rounded-3xl border border-white/10 bg-[#0d130f]">
        <p className="text-sm text-gray-500">Loading map…</p>
      </div>
    ),
  }
);

export function PartnersSection({
  detailBase = "/app/partners",
  mapLight = false,
}: {
  detailBase?: string;
  /** Light basemap tiles (subscriber light theme). */
  mapLight?: boolean;
}) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [q, setQ] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqArea, setReqArea] = useState("");
  const [reqState, setReqState] = useState<
    "idle" | "sending" | "done" | "error"
  >("idle");
  /** The subscriber's registered Lagos area (signed-in only). */
  const [profileArea, setProfileArea] = useState<string | null>(null);
  /** Live device position, once the subscriber shares it. */
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [locState, setLocState] = useState<
    "idle" | "asking" | "ready" | "denied"
  >("idle");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    // Support deep links like /app/partners?q=lekki or /app?q=lekki.
    try {
      const params = new URLSearchParams(window.location.search);
      setQ(params.get("q") ?? "");
    } catch {
      /* ignore */
    }
    (async () => setPartners(await listApprovedPartners()))();
    (async () => {
      try {
        const profile = await getProfile();
        if (profile?.area?.trim()) setProfileArea(profile.area.trim());
      } catch {
        /* public visitor or no profile — proximity falls back below */
      }
    })();
  }, []);

  const askLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocState("denied");
      return;
    }
    setLocState("asking");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos([p.coords.latitude, p.coords.longitude]);
        setLocState("ready");
      },
      () => setLocState("denied"),
      { timeout: 10_000, maximumAge: 300_000 }
    );
  };

  const query = q.trim().toLowerCase();
  const filtered = query
    ? partners.filter((p) =>
        `${p.name} ${p.location}`.toLowerCase().includes(query)
      )
    : partners;

  /* Proximity list (Mm, 2026-11-19): the list under the map must NOT be
   * the whole network — at hundreds of partners it would scroll forever.
   * Default view = partners near the subscriber: live device location
   * when shared (nearest first by straight-line distance), else the
   * subscriber's registered area. A text search always overrides and
   * shows every match. Partners without a GPS pin can only be placed
   * by area — they ride along when their area matches, and always via
   * search. */
  const { rows, listHeading, listNote } = useMemo(() => {
    const areaLc = profileArea?.toLowerCase() ?? null;
    const areaMatch = (p: Partner) =>
      !!areaLc &&
      (p.area.toLowerCase().includes(areaLc) ||
        areaLc.includes(p.area.toLowerCase()) ||
        p.lga.toLowerCase().includes(areaLc));
    const withDist = filtered.map((p) => {
      const pin = pos ? parseGps(p.gps) : null;
      return { p, distKm: pin && pos ? haversineKm(pos, pin) : null };
    });
    const byDistThenName = (
      a: { p: Partner; distKm: number | null },
      b: { p: Partner; distKm: number | null }
    ) =>
      (a.distKm ?? Number.POSITIVE_INFINITY) -
        (b.distKm ?? Number.POSITIVE_INFINITY) ||
      a.p.name.localeCompare(b.p.name);

    if (query) {
      return {
        rows: [...withDist].sort(byDistThenName),
        listHeading: `Matching partners (${filtered.length})`,
        listNote: null as string | null,
      };
    }
    if (pos) {
      const near = withDist
        .filter((r) => r.distKm !== null)
        .sort(byDistThenName);
      const pinless = withDist
        .filter((r) => r.distKm === null && areaMatch(r.p))
        .sort(byDistThenName);
      return {
        rows: [...near, ...pinless],
        listHeading: "Partners near you",
        listNote:
          "Nearest first, based on your current location. Search an area or partner name to look further afield.",
      };
    }
    if (areaLc) {
      const inArea = withDist.filter((r) => areaMatch(r.p));
      if (inArea.length > 0) {
        return {
          rows: inArea.sort(byDistThenName),
          listHeading: `Partners in ${profileArea}`,
          listNote:
            "Based on the area on your profile. Share your location or search to see partners elsewhere.",
        };
      }
    }
    return {
      rows: [...withDist].sort(byDistThenName),
      listHeading: `All partner locations (${filtered.length})`,
      listNote: null as string | null,
    };
  }, [filtered, pos, profileArea, query]);

  // A new search or a fresh location starts the list from the top.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [query, pos]);

  const visibleRows = rows.slice(0, visibleCount);

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
          Every green pin is an approved WashSMART partner. Tap a pin for
          details, or browse the nearby list below — we are continually
          adding partner washes across Lagos.
        </p>
      </div>

      <div className="mt-6">
        <PartnerMap partners={filtered} detailBase={detailBase} light={mapLight} />
      </div>

      {/* Proximity list under the map — nearby partners only by default
          (see the rows memo above), nearest first, 10 at a time. It is
          also the safety net for partners without a GPS pin: they show
          here by area match and always via search, even though the map
          cannot pin them (WS-2026-0003 was invisible before this list). */}
      {rows.length > 0 && (
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold">{listHeading}</h3>
            {!pos && locState !== "denied" && (
              <button
                type="button"
                onClick={askLocation}
                disabled={locState === "asking"}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-[#e9f2ec] transition-colors hover:bg-white/10 disabled:opacity-60"
              >
                {locState === "asking"
                  ? "Getting your location…"
                  : "📍 Use my location"}
              </button>
            )}
          </div>
          {listNote && (
            <p className="mt-1 text-sm text-gray-500">{listNote}</p>
          )}
          {locState === "denied" && !pos && (
            <p className="mt-1 text-sm text-gray-500">
              Location not shared — showing partners for your registered
              area instead.
            </p>
          )}
          <ul className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-white/5">
            {visibleRows.map(({ p, distKm }) => (
              <li key={p.id} className="border-b border-white/10 last:border-b-0">
                <Link
                  href={`${detailBase}/${p.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[#e9f2ec]">
                      {p.name}
                      {p.cacNumber && (
                        <span className="ml-2 align-middle text-xs font-bold text-[#48d87c]">
                          ✓ Verified Business
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-gray-400">
                      {p.address} · {p.location}
                      {distKm !== null &&
                        ` · ${
                          distKm < 1
                            ? `${Math.max(50, Math.round(distKm * 1000))} m`
                            : `${distKm.toFixed(1)} km`
                        } away`}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {p.hours}
                      {!p.gps && " · Map pin pending — visit at the address above"}
                    </p>
                  </div>
                  {p.status === "Open" && (
                    <span className="shrink-0 rounded-full bg-[#20a957]/15 px-3 py-1 text-xs font-bold text-[#48d87c]">
                      Open now
                    </span>
                  )}
                  <span aria-hidden className="shrink-0 text-gray-500">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {rows.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="mt-4 w-full rounded-full border border-white/10 bg-white/5 py-3 text-sm font-bold text-[#e9f2ec] transition-colors hover:bg-white/10"
            >
              Show more partners ({rows.length - visibleCount} more)
            </button>
          )}
        </div>
      )}

      {!query && partners.length > 0 && rows.length === 0 && (
        <p className="mt-8 text-center text-sm text-gray-400">
          No partners near you yet — search an area above to look further
          afield, or request coverage below.
        </p>
      )}

      {query && filtered.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon="📍"
            title="No partners match your search"
            body="Try a different area or partner name — new partners join regularly."
          />
        </div>
      )}

      {!query && partners.length === 0 && (
        <div className="mt-6">
          <EmptyState
            icon="📍"
            title="No partners yet"
            body="Newly approved partners will appear here automatically."
          />
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
