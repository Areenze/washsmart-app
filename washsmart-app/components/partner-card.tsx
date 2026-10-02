"use client";

import Link from "next/link";
import type { Partner } from "@/lib/db/types";

export default function PartnerCard({ partner }: { partner: Partner }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold">{partner.name}</h3>
          <p className="mt-1 text-sm text-gray-500">{partner.location}</p>
        </div>
        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700">
          Approved
        </span>
      </div>

      <div className="mt-5 flex justify-between text-sm">
        <span>
          ⭐ {partner.rating.toFixed(1)}{" "}
          <span className="text-gray-400">({partner.reviews})</span>
        </span>
        <span>{partner.distance}</span>
        <span
          className={
            partner.status === "Open"
              ? "font-semibold text-green-600"
              : "text-gray-400"
          }
        >
          {partner.status}
        </span>
      </div>

      <Link
        href={`/app/partners/${partner.id}`}
        className="mt-4 block w-full rounded-xl border border-[#20a957] py-2 text-center text-sm font-semibold text-[#168846]"
      >
        View Partner
      </Link>
    </div>
  );
}
