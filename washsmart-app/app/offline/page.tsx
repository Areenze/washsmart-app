/* /offline — shown by the service worker when the network is unavailable. */

import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0f0c] px-5 text-[#e9f2ec]">
      <div className="w-full max-w-md rounded-3xl bg-[#111a14] p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#34d186]/10 text-3xl">
          📡
        </div>
        <h1 className="mt-4 text-2xl font-bold">You're offline</h1>
        <p className="mt-2 text-sm text-gray-400">
          WashSMART needs an internet connection to verify subscriptions and
          load partners. Please reconnect and try again.
        </p>
        <Link
          href="/"
          className="mt-6 block w-full rounded-xl bg-[#34d186] py-3 font-bold text-white"
        >
          Try Again
        </Link>
      </div>
    </main>
  );
}
