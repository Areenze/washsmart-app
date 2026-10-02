"use client";

/* Install prompt: Android/Chrome uses beforeinstallprompt; iOS gets the
 * Share → "Add to Home Screen" instructions. Hidden when already installed.
 */

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export default function InstallPrompt() {
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
      <div className="rounded-2xl bg-[#063c28] p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-bold">Install the WashSMART app</p>
            <p className="mt-1 text-sm text-white/70">
              Tap the Share button <span aria-hidden>⎋</span> then "Add to Home
              Screen" to install WashSMART like a native app.
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="text-white/50"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  if (!deferred) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#063c28] p-5 text-white">
      <div>
        <p className="font-bold">Install the WashSMART app</p>
        <p className="mt-1 text-sm text-white/70">
          Add WashSMART to your home screen for one-tap access.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="rounded-full px-3 py-2 text-sm text-white/60"
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
