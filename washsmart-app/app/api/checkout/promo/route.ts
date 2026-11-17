/* POST /api/checkout/promo — redeem a 100%-off promo code.
 *
 * Body: { planId, promoCode }. The code is re-validated server-side
 * (validate_promo_code runs as the buyer, so per-user caps apply) and
 * must cover the FULL plan price; the mint then runs through the
 * service-role-only topup_subscription_for RPC (migration_035) so the
 * browser can never grant itself a free plan with an arbitrary code —
 * or with none. Partial discounts go through Paystack + /api/paystack/
 * verify as usual.
 *
 * Until SUPABASE_SERVICE_ROLE_KEY is configured and migration_035 is
 * applied, this route answers { legacy: true } and the pay page falls
 * back to the previous client-side flow.
 */

import { userClient } from "@/lib/api-auth";
import { adminClient } from "@/lib/supabase-admin";

function isMissingFn(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  return (
    !!e &&
    (e.code === "PGRST202" ||
      e.code === "42883" ||
      (e.message ?? "").includes("topup_subscription_for"))
  );
}

export async function POST(request: Request) {
  let body: { planId?: string; promoCode?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const planId = body.planId?.trim();
  const promoCode = body.promoCode?.trim().toUpperCase() || null;
  if (!planId || !promoCode) {
    return Response.json(
      { ok: false, error: "Missing plan or promo code." },
      { status: 400 }
    );
  }

  const auth = await userClient(request);
  if (!auth) {
    return Response.json(
      { ok: false, error: "You need to be signed in." },
      { status: 401 }
    );
  }
  const { sb, userId } = auth;

  const admin = adminClient();
  if (!admin) return Response.json({ ok: false, legacy: true });

  const { data: plan } = await sb
    .from("plans")
    .select("id,name,amount,washes")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) {
    return Response.json({ ok: false, error: "Unknown plan." }, { status: 400 });
  }

  const { data: v } = await sb.rpc("validate_promo_code", {
    p_code: promoCode,
    p_plan_id: planId,
  });
  const promo = (v as any[])?.[0] ?? null;
  if (!promo) {
    return Response.json(
      { ok: false, error: "That code isn't valid for this plan." },
      { status: 400 }
    );
  }
  if (Number(promo.discount_naira ?? 0) < Number(plan.amount)) {
    return Response.json(
      { ok: false, error: "That code doesn't cover the full price." },
      { status: 402 }
    );
  }

  // One redemption per subscriber per code (also DB-unique; this is
  // the friendly check before minting).
  const { data: prior } = await admin
    .from("promo_redemptions")
    .select("id")
    .eq("promo_id", promo.promo_id)
    .eq("subscriber_id", userId)
    .maybeSingle();
  if (prior) {
    return Response.json(
      { ok: false, error: "You've already used that code." },
      { status: 400 }
    );
  }

  const reference = `PROMO-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
  const bonusWashes =
    promo.kind === "bonus_washes" ? Math.round(Number(promo.value)) : 0;

  const mint = await admin.rpc("topup_subscription_for", {
    p_user_id: userId,
    p_plan_id: planId,
    p_method: "promo",
    p_reference: reference,
    p_bonus_washes: bonusWashes,
  });
  if (mint.error) {
    if (isMissingFn(mint.error)) return Response.json({ ok: false, legacy: true });
    return Response.json(
      { ok: false, error: "Could not redeem that code. Please try again." },
      { status: 500 }
    );
  }
  const subId = mint.data as string;

  // Link the redemption to the payment row the mint just recorded
  // (best-effort — the subscription is already granted).
  try {
    const { data: payRow } = await admin
      .from("payments")
      .select("id")
      .eq("reference", reference)
      .maybeSingle();
    await admin.rpc("record_promo_redemption_for", {
      p_promo_id: promo.promo_id,
      p_user_id: userId,
      p_payment_id: (payRow as any)?.id ?? null,
    });
  } catch {
    /* the mint stands; redemption bookkeeping is best-effort */
  }

  return Response.json({ ok: true, subscriptionId: subId });
}
