"use client";

/**
 * TEMPORARY fit diagnostic (added 2026-11-18, remove after the 320px
 * overflow is fixed). Renders ONLY when the URL has ?fit=1: measures the
 * live page on the real device and lists every element sticking out past
 * the viewport, so a screenshot names the culprit.
 */
import { useEffect, useState } from "react";

interface FitReport {
  vw: number;
  docSW: number;
  bodySW: number;
  screenW: number;
  dpr: number;
  vvW: number;
  vvScale: number;
  lines: string[];
}

function measure(): FitReport {
  const vw = window.innerWidth;
  const vv = window.visualViewport;
  const lines: string[] = [];
  document.querySelectorAll("*").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5)) {
      let cls = "";
      try {
        const cn: unknown = el.className;
        cls =
          typeof cn === "string"
            ? cn
            : String((cn as { baseVal?: string }).baseVal || "");
      } catch {
        cls = "";
      }
      lines.push(
        `${el.tagName} L${Math.round(r.left)} R${Math.round(r.right)} W${Math.round(r.width)} .${cls.slice(0, 60)} "${(el.textContent || "").trim().slice(0, 24)}"`
      );
    }
  });
  return {
    vw,
    docSW: document.documentElement.scrollWidth,
    bodySW: document.body ? document.body.scrollWidth : -1,
    screenW: window.screen ? window.screen.width : -1,
    dpr: window.devicePixelRatio || -1,
    vvW: vv ? Math.round(vv.width) : -1,
    vvScale: vv ? Math.round(vv.scale * 100) / 100 : -1,
    lines: lines.slice(0, 8),
  };
}

export default function FitDebug() {
  const [report, setReport] = useState<FitReport | null>(null);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("fit")) return;
    const timers = [800, 2000, 3500].map((ms) =>
      window.setTimeout(() => setReport(measure()), ms)
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  if (!report) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[200] max-h-[70vh] overflow-y-auto bg-black/95 p-2 font-mono text-[11px] leading-snug text-lime-300">
      <div>
        FIT vw={report.vw} doc={report.docSW} body={report.bodySW} wide=
        {report.lines.length}
      </div>
      <div>
        screen={report.screenW} dpr={report.dpr} vv={report.vvW} scale=
        {report.vvScale}
      </div>
      {report.lines.map((l, i) => (
        <div key={i} className="whitespace-pre-wrap break-all">
          {l}
        </div>
      ))}
      {report.lines.length === 0 && <div>no wide elements</div>}
    </div>
  );
}
