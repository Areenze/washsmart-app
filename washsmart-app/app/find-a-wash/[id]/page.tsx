"use client";

/* /find-a-wash/[id] — public partner detail on the marketing site. */

import Link from "next/link";
import { useParams } from "next/navigation";
import { Brand, Logo } from "@/components/ui";
import PartnerDetail from "@/components/partner-detail";

export default function PublicPartnerDetailPage() {
  const params = useParams<{ id: string }>();
  return (
    <main className="min-h-screen bg-[#0a0f0c] text-[#e9f2ec]">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#111a14]/90 backdrop-blur-md px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="WashSMART home">
            <Logo />
            <Brand />
          </Link>
          <Link
            href="/app/signup"
            className="rounded-full bg-[#34d186] px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-[#27ab6c]"
          >
            Subscribe
          </Link>
        </div>
      </header>
      <PartnerDetail partnerId={params.id} backHref="/find-a-wash" />
      <footer className="border-t border-white/5 bg-[#111a14] px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-gray-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo />
            <Brand />
          </div>
          <div className="flex gap-6">
            <Link href="/#plans" className="hover:text-white">Plans</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
