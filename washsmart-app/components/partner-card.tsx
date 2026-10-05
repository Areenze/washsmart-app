"use client";

import Link from "next/link";
import type { Partner } from "@/lib/db/types";

export default function PartnerCard({
  partner,
  detailBase = "/app/partners",
}: {
  partner: Partner;
  detailBase?: string;
}) {
  return (
    <div className="rounded-2xl bg-[#111a14] p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold">{partner.name}</h3>
          <p className="mt-1 text-sm text-gray-400">{partner.location}</p>
        </div>
        <span className="rounded-full bg-[#34d186]/15 px-2 py-1 text-xs font-bold text-green-400">
          Approved
        </span>
      </div>

      <div className="mt-5 flex justify-between text-sm">
        <span>
          ⭐ {partner.rating.toFixed(1)}{" "}
          <span className="text-gray-500">({partner.reviews})</span>
        </span>
        <span>{partner.distance}</span>
        <span
          className={
            partner.status === "Open"
              ? "font-semibold text-green-400"
              : "text-gray-500"
          }
        >
          {partner.status}
        </span>
      </div>

      <Link
        href={`${detailBase}/${partner.id}`}
        className="mt-4 block w-full rounded-full border border-[#34d186] py-2 transition-all duration-200 hover:bg-[#34d186]/10 text-center text-sm font-semibold text-[#66dca4]"
      >
        View Partner
      </Link>
    </div>
  );
}
