"use client";

/* Real QR code rendered on canvas with the `qrcode` library.
 * Falls back to a deterministic pseudo-QR if the library fails.
 */

import { useEffect, useRef, useState } from "react";
import QRCodeLib from "qrcode";

export default function QRCode({
  text,
  size = 224,
}: {
  text: string;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !text) return;
    setFailed(false);
    QRCodeLib.toCanvas(canvas, text, {
      width: size,
      margin: 2,
      color: { dark: "#10251c", light: "#ffffff" },
    }).catch(() => {
      drawPseudo(canvas, text, size);
      setFailed(true);
    });
  }, [text, size]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="WashSMART QR code"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="rounded-2xl"
      data-fallback={failed ? "pseudo" : "real"}
    />
  );
}

/* Deterministic pseudo-QR fallback (same look as the original prototype). */
function drawPseudo(canvas: HTMLCanvasElement, seed: string, size: number) {
  const N = 25;
  const scale = size / N;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let h = 2166136261;
  for (const c of seed) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const inFinderZone = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#10251c";
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (inFinderZone(x, y)) continue;
      if (rand() < 0.45) ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  const finder = (fx: number, fy: number) => {
    ctx.fillStyle = "#10251c";
    ctx.fillRect(fx * scale, fy * scale, 7 * scale, 7 * scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect((fx + 1) * scale, (fy + 1) * scale, 5 * scale, 5 * scale);
    ctx.fillStyle = "#10251c";
    ctx.fillRect((fx + 2) * scale, (fy + 2) * scale, 3 * scale, 3 * scale);
  };
  finder(0, 0);
  finder(N - 7, 0);
  finder(0, N - 7);
}
