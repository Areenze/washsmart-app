"use client";

/* PartnerMap — Leaflet map of approved WashSMART partners (dark theme).
 *
 * Free, keyless tiles (CARTO dark matter over OpenStreetMap data) so there
 * is no Google billing to manage. Pins cluster automatically at scale
 * (500+ partners collapse into numbered green clusters). Tapping a pin
 * shows the partner card popup with a link to its detail page.
 *
 * Partners without GPS coordinates are skipped — the count line under the
 * map says how many are plotted.
 */

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import Link from "next/link";
import type { Partner } from "@/lib/db/types";
import "leaflet/dist/leaflet.css";

/* Lagos fallback center. */
const LAGOS: [number, number] = [6.5244, 3.3792];

function parseGps(gps?: string): [number, number] | null {
  if (!gps) return null;
  const m = gps.split(",").map((s) => parseFloat(s.trim()));
  if (m.length !== 2 || m.some((n) => !Number.isFinite(n))) return null;
  const [lat, lng] = m;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

/* Single green pin, WashSMART brand. */
const pinIcon = L.divIcon({
  className: "ws-pin",
  html: `<div style="
      width:30px;height:30px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:#20a957;
      border:3px solid #0d1f14;
      box-shadow:0 2px 8px rgba(0,0,0,.5);
    "><div style="
      width:10px;height:10px;border-radius:50%;
      background:#e9f2ec;
      position:absolute;top:7px;left:7px;
    "></div></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 28],
  popupAnchor: [0, -26],
});

function clusterIcon(cluster: any) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 40 : count < 100 ? 48 : 56;
  return L.divIcon({
    html: `<div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:rgba(32,169,87,.92);
        border:3px solid #0d1f14;
        color:#06130c;font-weight:800;font-size:${size > 44 ? 15 : 13}px;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 10px rgba(0,0,0,.5);
      ">${count}</div>`,
    iconSize: [size, size],
    className: "ws-cluster",
  });
}

export function PartnerMap({
  partners,
  detailBase,
}: {
  partners: Partner[];
  detailBase: string;
}) {
  const plotted = useMemo(
    () =>
      partners
        .map((p) => ({ partner: p, pos: parseGps(p.gps) }))
        .filter((x) => x.pos !== null) as {
        partner: Partner;
        pos: [number, number];
      }[],
    [partners]
  );

  const center: [number, number] = useMemo(() => {
    if (plotted.length === 0) return LAGOS;
    const lat = plotted.reduce((s, x) => s + x.pos[0], 0) / plotted.length;
    const lng = plotted.reduce((s, x) => s + x.pos[1], 0) / plotted.length;
    return [lat, lng];
  }, [plotted]);

  return (
    <div>
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <MapContainer
          center={center}
          zoom={plotted.length > 0 ? 12 : 11}
          scrollWheelZoom={true}
          style={{ height: "62vh", minHeight: 420, width: "100%", background: "#0d130f" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={clusterIcon}
            showCoverageOnHover={false}
            maxClusterRadius={48}
          >
            {plotted.map(({ partner: p, pos }) => (
              <Marker key={p.id} position={pos} icon={pinIcon}>
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <p style={{ fontWeight: 800, fontSize: 14, margin: "0 0 2px" }}>
                      {p.name}
                    </p>
                    <p style={{ fontSize: 12, color: "#555", margin: "0 0 6px" }}>
                      {p.location}
                      {p.rating > 0
                        ? ` · ★ ${p.rating.toFixed(1)} (${p.reviews})`
                        : ""}
                    </p>
                    <Link
                      href={`${detailBase}/${p.id}`}
                      style={{
                        display: "inline-block",
                        background: "#20a957",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 12,
                        padding: "6px 14px",
                        borderRadius: 999,
                        textDecoration: "none",
                      }}
                    >
                      View Partner →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
      <p className="mt-2 text-center text-xs text-gray-500">
        {plotted.length} of {partners.length} approved partner
        {partners.length === 1 ? "" : "s"} shown on the map
        {plotted.length < partners.length
          ? " — some locations are still being mapped"
          : ""}
        . Pinch or scroll to zoom, drag to explore.
      </p>
    </div>
  );
}
