import { Logo } from "@/components/ui";

export const metadata = {
  title: "Coming soon — WashSMART",
  description:
    "WashSMART is launching soon: one subscription, multiple washes, at approved car-wash partners across Lagos.",
};

/* Public holding page shown on washsmart.ng while the app is in testing.
 * Static server component. All calls to action stay visibly inactive. */
export default function ComingSoonPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-16 text-center text-[#101613]">
      <Logo size={76} />
      <p className="mt-6 text-xl font-bold tracking-tight">
        Wash<span className="text-[#20a957]">SMART</span>
      </p>

      <h1 className="mt-8 max-w-xl text-4xl font-extrabold tracking-tight sm:text-5xl">
        Coming soon
      </h1>
      <p className="mt-4 max-w-md text-base leading-relaxed text-[#4b5751]">
        One subscription. Multiple washes. A growing network of approved
        car-wash partners across Lagos. We&apos;re putting the finishing
        touches on the shine — check back at launch.
      </p>

      <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Available at launch"
          className="w-full cursor-not-allowed rounded-full bg-[#20a957] px-6 py-3.5 text-base font-semibold text-white opacity-40"
        >
          I&apos;m a Car Owner
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Available at launch"
          className="w-full cursor-not-allowed rounded-full border-2 border-[#101613] px-6 py-3.5 text-base font-semibold text-[#101613] opacity-40"
        >
          I&apos;m a Car Wash
        </button>
        <p className="mt-1 text-xs text-[#8a948e]">
          Buttons activate at launch.
        </p>
      </div>

      <footer className="mt-16 text-xs text-[#8a948e]">
        © 2026 WashSMART · support@washsmart.ng
      </footer>
    </main>
  );
}
