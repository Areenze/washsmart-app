/* /offline — shown by the service worker when the network is unavailable. */

import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f8f6] px-5 text-[#10251c]">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#edf8f1] text-3xl">
          📡
        </div>
        <h1 className="mt-4 text-2xl font-bold">You're offline</h1>
        <p className="mt-2 text-sm text-gray-500">
          WashSMART needs an internet connection to verify subscriptions and
          load partners. Please reconnect and try again.
        </p>
        <Link
          href="/"
          className="mt-6 block w-full rounded-xl bg-[#20a957] py-3 font-bold text-white"
        >
          Try Again
        </Link>
      </div>
    </main>
  );
}
