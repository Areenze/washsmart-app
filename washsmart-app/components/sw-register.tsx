"use client";

/* Registers /sw.js once on the client. */

import { useEffect } from "react";

export default function SwRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* service worker unavailable — app still works online */
      });
    }
  }, []);
  return null;
}
