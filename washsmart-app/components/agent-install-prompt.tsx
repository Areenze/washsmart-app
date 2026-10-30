"use client";

/* Agent install prompt: Android/Chrome uses beforeinstallprompt; iOS gets
 * Share → "Add to Home Screen" instructions. Hidden when already installed.
 * Agent pages carry manifest-agent.json, so installing from here adds the
 * "WashSMART Agent" app (opens straight into the agent login / dashboard
 * via agent.washsmart.ng or /agent — never the homepage). */

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export default function AgentInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
    );
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (isStandalone || dismissed) return null;

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  // iOS Safari: no beforeinstallprompt — show manual instructions.
  if (isIOS && !deferred) {
    return (
      <div className="rounded-3xl bg-[#111a14] p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold">📲 Put WashSMART Agent on your home screen</p>
            <p className="mt-1 text-sm text-gray-400">
              Tap the Share button <span aria-hidden>⎋</span> then "Add to Home
              Screen". Your referrals and earnings open in one tap — no
              homepage, no typing the address again.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="text-gray-500"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (!deferred) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-3xl bg-[#111a14] p-6">
      <div>
        <p className="font-bold">📲 Install the WashSMART Agent app</p>
        <p className="mt-1 text-sm text-gray-400">
          One tap from your home screen, straight to your referrals and
          earnings — no homepage in between.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="rounded-full px-3 py-2 text-sm text-gray-400"
        >
          Later
        </button>
        <button
          onClick={install}
          className="rounded-full bg-[#2ed06a] px-5 py-2 text-sm font-bold text-white"
        >
          Install
        </button>
      </div>
    </div>
  );
}
