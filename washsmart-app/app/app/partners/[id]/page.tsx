"use client";

/* /app/partners/[id] — partner detail inside the subscriber app shell. */

import { useParams } from "next/navigation";
import PartnerDetail from "@/components/partner-detail";

export default function PartnerDetailPage() {
  const params = useParams<{ id: string }>();
  return <PartnerDetail partnerId={params.id} backHref="/app/partners" />;
}
