"use client";

/* /admin — staff inbox: partner applications queue + coverage requests. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Brand, EmptyState, Logo } from "@/components/ui";
import {
  deleteLocationRequest,
  fmtDate,
  getProfile,
  isAdmin,
  listApplications,
  listLocationRequests,
  signOut,
} from "@/lib/db/store";
import type { LocationRequest, PartnerApplication } from "@/lib/db/types";

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"applications" | "requests">("applications");
  const [apps, setApps] = useState<PartnerApplication[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [requests, setRequests] = useState<LocationRequest[]>([]);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  const reload = async () => {
    const [a, r] = await Promise.all([
      listApplications().catch(() => [] as PartnerApplication[]),
      listLocationRequests().catch(() => [] as LocationRequest[]),
    ]);
    setApps(a);
    setRequests(r);
  };

  useEffect(() => {
    (async () => {
      const [admin, profile] = await Promise.all([
        isAdmin(),
        getProfile().catch(() => null),
      ]);
      setAuthorized(admin);
      setSignedInEmail(profile?.email ?? null);
      if (admin) reload();
    })();
  }, []);

  const switchAccount = async () => {
    await signOut();
    router.push("/app/login?next=/admin");
  };

  const removeRequest = async (id: string) => {
    if (!window.confirm("Delete this coverage request?")) return;
    await deleteLocationRequest(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  const visible = filter === "all" ? apps : apps.filter((a) => a.status === filter);
  const pendingCount = apps.filter((a) => a.status === "pending").length;

  const tone = (s: string) =>
    s === "approved" ? "green" : s === "rejected" ? "red" : "amber";

  return (
    <main className="min-h-screen bg-[#0a0f0c] text-[#e9f2ec]">
      <header className="border-b bg-[#111a14] px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <Brand />
          </Link>
          <span className="text-sm font-semibold text-gray-400">
            Admin
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-8">
        {authorized === null && <p className="text-gray-400">Loading…</p>}
        {authorized === false && (
          <div className="rounded-3xl bg-[#111a14] p-10 text-center shadow-sm">
            <p className="text-4xl">🔒</p>
            <h1 className="mt-3 text-2xl font-bold">Admin access required</h1>
            {signedInEmail ? (
              <>
                <p className="mt-2 text-sm text-gray-400">
                  You&rsquo;re signed in as{" "}
                  <span className="font-bold text-[#e9f2ec]">{signedInEmail}</span>,
                  which isn&rsquo;t a WashSMART staff account.
                </p>
                <button
                  onClick={switchAccount}
                  className="mt-6 inline-block rounded-full bg-[#20a957] px-8 py-3 font-bold text-white transition-all duration-200 hover:bg-[#1a8a47]"
                >
                  Switch account →
                </button>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-gray-400">
                  Sign in with a WashSMART staff account to view this page.
                </p>
                <Link
                  href="/app/login?next=/admin"
                  className="mt-6 inline-block rounded-full bg-[#20a957] px-8 py-3 font-bold text-white transition-all duration-200 hover:bg-[#1a8a47]"
                >
                  Log in →
                </Link>
              </>
            )}
          </div>
        )}
        {authorized === true && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              {(
                [
                  { id: "applications", label: `Applications${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
                  { id: "requests", label: `Coverage Requests${requests.length > 0 ? ` (${requests.length})` : ""}` },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${
                    tab === t.id
                      ? "bg-[#20a957] text-white"
                      : "bg-[#111a14] text-gray-400 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "applications" && (
              <>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-3xl font-bold">Partner Applications</h1>
                    <p className="mt-1 text-gray-400">
                      {pendingCount} application{pendingCount === 1 ? "" : "s"} awaiting
                      review. Approving adds the car wash to the user app immediately.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {(["pending", "approved", "rejected", "all"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${
                          filter === f
                            ? "bg-[#20a957] text-white"
                            : "bg-[#111a14] text-gray-400"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {visible.length === 0 ? (
                  <div className="mt-6">
                    <EmptyState
                      icon="📋"
                      title={`No ${filter} applications`}
                      body={
                        filter === "pending"
                          ? "New applications from the /join funnel will appear here."
                          : `No applications with status “${filter}”.`
                      }
                    />
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {visible.map((a) => (
                      <Link
                        key={a.ref}
                        href={`/admin/applications/${a.ref}`}
                        className="block rounded-2xl bg-[#111a14] p-5 shadow-sm hover:border hover:border-[#20a957]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-bold">{a.business.carWashName}</p>
                            <p className="text-sm text-gray-400">
                              {a.business.ownerName} · {a.location.area},{" "}
                              {a.location.lga} · {a.business.phone}
                            </p>
                            <p className="mt-1 font-mono text-xs text-gray-500">
                              {a.ref} · submitted {fmtDate(a.submittedAt)}
                            </p>
                          </div>
                          <Badge tone={tone(a.status) as "green" | "amber" | "red"}>
                            {a.status.toUpperCase()}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "requests" && (
              <>
                <div className="mt-6">
                  <h1 className="text-3xl font-bold">Coverage Requests</h1>
                  <p className="mt-1 text-gray-400">
                    Subscribers asking for WashSMART in their neighborhood — expand
                    where they ask you to.
                  </p>
                </div>

                {requests.length === 0 ? (
                  <div className="mt-6">
                    <EmptyState
                      icon="📍"
                      title="No coverage requests"
                      body="Requests from the “Don't see a WashSMART location in your area?” form will appear here."
                    />
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {requests.map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#111a14] p-5 shadow-sm"
                      >
                        <div>
                          <p className="font-bold">{r.area}</p>
                          <p className="text-sm text-gray-400">{r.email}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            requested {fmtDate(r.createdAt)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeRequest(r.id)}
                          className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-gray-400 transition-colors hover:border-red-400/50 hover:text-red-400"
                        >
                          Dismiss
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
