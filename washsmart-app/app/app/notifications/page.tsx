"use client";

/* /app/notifications — the subscriber's notification center. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { currentUserId } from "@/lib/db/store";
import {
  listNotifications,
  markAllRead,
  type Notification,
} from "@/lib/db/notifications";

const KIND_ICON: Record<string, string> = {
  payment_success: "💳",
  subscription_activated: "🎟️",
  credit_redeemed: "🚗",
  credits_low: "⚠️",
  subscription_expiring: "⏰",
  ticket_update: "🎧",
  settlement_paid: "🏦",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[] | null>(null);

  const load = async () => {
    const uid = await currentUserId().catch(() => null);
    if (!uid) {
      setItems([]);
      return;
    }
    setItems(await listNotifications(uid).catch(() => []));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readAll = async () => {
    const uid = await currentUserId().catch(() => null);
    if (!uid) return;
    await markAllRead(uid);
    setItems((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
  };

  if (items === null) return <p className="py-8 text-gray-400">Loading…</p>;

  return (
    <section className="mx-auto max-w-2xl px-5 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
        {items.some((n) => !n.read) && (
          <button
            onClick={readAll}
            className="text-sm font-bold text-[#48d87c]"
          >
            Mark all read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="🔔"
            title="You're all caught up"
            body="Payment confirmations, credit alerts, and subscription reminders will appear here."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {items.map((n) => {
            const inner = (
              <div
                className={`flex gap-3 rounded-2xl p-4 ${
                  n.read ? "bg-[#111a14]" : "bg-[#20a957]/10"
                }`}
              >
                <span className="text-2xl">{KIND_ICON[n.kind] ?? "🔔"}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{n.title}</p>
                  {n.body && (
                    <p className="mt-1 text-sm text-gray-400">{n.body}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(n.createdAt).toLocaleString("en-NG", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {!n.read && (
                  <span className="h-2.5 w-2.5 shrink-0 self-center rounded-full bg-[#20a957]" />
                )}
              </div>
            );
            return n.link ? (
              <Link key={n.id} href={n.link} className="block">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </section>
  );
}
