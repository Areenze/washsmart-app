"use client";

/* Bell icon with unread count → notifications page.
 * audience='subscriber' (default) or 'partner'. */

import Link from "next/link";
import { useEffect, useState } from "react";
import { currentUserId } from "@/lib/db/store";
import { unreadCount } from "@/lib/db/notifications";

export default function NotificationBell({
  audience = "subscriber",
  href = "/app/notifications",
}: {
  audience?: "subscriber" | "partner";
  href?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let live = true;
    const refresh = async () => {
      const uid = await currentUserId().catch(() => null);
      if (!uid || !live) return;
      setCount(await unreadCount(uid, audience).catch(() => 0));
    };
    refresh();
    const t = window.setInterval(refresh, 60000);
    return () => {
      live = false;
      window.clearInterval(t);
    };
  }, [audience]);

  return (
    <Link
      href={href}
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
      className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#20a957]/10 text-lg"
    >
      🔔
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
