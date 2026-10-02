"use client";

/* /admin/applications/[ref] — application detail + Approve / Reject.
 * Approving promotes the application to a live partner, which appears
 * immediately in the user app's partner list (same store).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Badge, Brand, Card, EmptyState, Logo } from "@/components/ui";
import {
  approveApplication,
  fmtDate,
  getApplication,
  isAdmin,
  rejectApplication,
} from "@/lib/db/store";
import type { PartnerApplication } from "@/lib/db/types";

export default function ApplicationDetailPage() {
  const params = useParams<{ ref: string }>();
  const router = useRouter();
  const [app, setApp] = useState<PartnerApplication | null | undefined>(undefined);
  const [acting, setActing] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      setAuthorized(await isAdmin());
      setApp((await getApplication(decodeURIComponent(params.ref))) ?? null);
    })();
  }, [params.ref]);

  const decide = (kind: "approve" | "reject") => {
    if (!app || acting) return;
    setActing(true);
    window.setTimeout(async () => {
      try {
        if (kind === "approve") {
          const partnerId = await approveApplication(app.ref);
          alert(`Approved! Partner ID issued: ${partnerId}`);
        } else {
          await rejectApplication(app.ref);
        }
      } catch (e) {
        alert(e instanceof Error ? e.message : "Action failed.");
        setActing(false);
        return;
      }
      router.push("/admin");
    }, 700);
  };

  return (
    <main className="min-h-screen bg-[#f5f8f6] text-[#10251c]">
      <header className="border-b bg-white px-5 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <Brand />
          </Link>
          <Link href="/admin" className="text-sm font-semibold text-[#168846]">
            ← All applications
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-8">
        {authorized === false && (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-4xl">🔒</p>
            <h1 className="mt-3 text-2xl font-bold">Admin access required</h1>
            <p className="mt-2 text-sm text-gray-500">
              Sign in with a WashSMART staff account to review this application.
            </p>
          </div>
        )}
        {authorized !== false && app === undefined && <p className="text-gray-500">Loading…</p>}

        {authorized !== false && app === null && (
          <EmptyState
            icon="🔍"
            title="Application not found"
            body="The reference may be wrong or the application was removed."
            action={
              <Link
                href="/admin"
                className="inline-block rounded-xl bg-[#20a957] px-6 py-3 font-bold text-white"
              >
                Back to Admin
              </Link>
            }
          />
        )}

        {authorized !== false && app && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-gray-400">{app.ref}</p>
                <h1 className="mt-1 text-3xl font-bold">
                  {app.business.carWashName}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Submitted {fmtDate(app.submittedAt)}
                </p>
              </div>
              <Badge
                tone={
                  app.status === "approved"
                    ? "green"
                    : app.status === "rejected"
                      ? "red"
                      : "amber"
                }
              >
                {app.status.toUpperCase()}
              </Badge>
            </div>

            <Card className="mt-6">
              <Section h="Business information" />
              <Rows
                rows={[
                  ["Car wash name", app.business.carWashName],
                  ["Owner / manager", app.business.ownerName],
                  ["Phone", app.business.phone],
                  ["WhatsApp", app.business.whatsapp || "—"],
                  ["Email", app.business.email],
                ]}
              />
              <Section h="Location" />
              <Rows
                rows={[
                  ["Address", app.location.address],
                  ["Area", app.location.area],
                  ["LGA", app.location.lga],
                  ["State", app.location.state],
                  ["GPS", app.location.gps || "—"],
                ]}
              />
              <Section h="Operations" />
              <Rows
                rows={[
                  ["Opening hours", app.operations.openingHours || "—"],
                  ["Wash bays", app.operations.washBays || "—"],
                  ["Daily capacity", app.operations.dailyCapacity || "—"],
                  ["Years operating", app.operations.yearsOperating || "—"],
                  ["Staff count", app.operations.staffCount || "—"],
                ]}
              />
              <Section h="Services" />
              <div className="flex flex-wrap gap-2">
                {[...app.services, app.otherService]
                  .filter(Boolean)
                  .map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-[#edf8f1] px-3 py-1.5 text-sm font-semibold text-[#168846]"
                    >
                      {s}
                    </span>
                  ))}
              </div>
              <Section h="Verification photos" />
              {app.photos.business.length + app.photos.location.length === 0 ? (
                <p className="text-sm text-gray-500">No photos attached.</p>
              ) : (
                <ul className="space-y-1 text-sm text-gray-600">
                  {app.photos.business.map((n) => (
                    <li key={n}>🏪 {n}</li>
                  ))}
                  {app.photos.location.map((n) => (
                    <li key={n}>📍 {n}</li>
                  ))}
                </ul>
              )}
            </Card>

            {app.status === "pending" ? (
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => decide("reject")}
                  disabled={acting}
                  className="flex-1 rounded-xl border border-red-300 py-3 font-bold text-red-600 disabled:opacity-50"
                >
                  {acting ? "Working…" : "Reject"}
                </button>
                <button
                  onClick={() => decide("approve")}
                  disabled={acting}
                  className="flex-1 rounded-xl bg-[#20a957] py-3 font-bold text-white disabled:opacity-50"
                >
                  {acting ? "Working…" : "✓ Approve Partner"}
                </button>
              </div>
            ) : (
              <p className="mt-6 rounded-2xl bg-white p-4 text-center text-sm text-gray-500 shadow-sm">
                This application was {app.status}.{" "}
                <Link href="/admin" className="font-bold text-[#168846]">
                  Back to queue
                </Link>
              </p>
            )}
            {app.status === "pending" && (
              <p className="mt-3 text-center text-xs text-gray-400">
                Approving publishes this car wash to the user app immediately.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function Section({ h }: { h: string }) {
  return <h2 className="mb-3 mt-6 text-sm font-bold text-gray-500 first:mt-0">{h.toUpperCase()}</h2>;
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <div className="divide-y rounded-2xl bg-[#f5f8f6]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
          <span className="text-gray-500">{k}</span>
          <span className="text-right font-semibold">{v}</span>
        </div>
      ))}
    </div>
  );
}
