/* Promo codes — discounts and bonus washes on plan purchases. */

import { getSupabase } from "./supabase";
import { logAdminAction } from "./admin";

export interface PromoCode {
  id: string;
  code: string;
  kind: "percent" | "fixed" | "bonus_washes";
  value: number;
  planIds: string[] | null;
  maxUses: number | null;
  usedCount: number;
  maxPerUser: number;
  startsAt: string | null;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface ValidatedPromo {
  promoId: string;
  kind: "percent" | "fixed" | "bonus_washes";
  value: number;
  discountNaira: number;
  label: string;
}

function mapPromo(r: any): PromoCode {
  return {
    id: r.id,
    code: r.code,
    kind: r.kind,
    value: Number(r.value),
    planIds: r.plan_ids,
    maxUses: r.max_uses,
    usedCount: r.used_count ?? 0,
    maxPerUser: r.max_per_user ?? 1,
    startsAt: r.starts_at,
    expiresAt: r.expires_at,
    active: !!r.active,
    createdAt: r.created_at,
  };
}

/** Validate a code for the signed-in subscriber + plan. Null when unusable. */
export async function validatePromo(
  code: string,
  planId: string
): Promise<ValidatedPromo | null> {
  const { data, error } = await getSupabase().rpc("validate_promo_code", {
    p_code: code,
    p_plan_id: planId,
  });
  if (error) throw error;
  const row = (data as any[])?.[0];
  if (!row) return null;
  return {
    promoId: row.promo_id,
    kind: row.kind,
    value: Number(row.value),
    discountNaira: Number(row.discount_naira ?? 0),
    label: row.label,
  };
}

/** Record a redemption after a successful mint (throws when exhausted). */
export async function recordPromoRedemption(
  promoId: string,
  paymentId: string | null
): Promise<void> {
  const { error } = await getSupabase().rpc("record_promo_redemption", {
    p_promo_id: promoId,
    p_payment_id: paymentId,
  });
  if (error) throw error;
}

/** Grant bonus washes onto a freshly minted subscription. */
export async function applyPromoBonus(
  subscriptionId: string,
  washes: number
): Promise<void> {
  const { error } = await getSupabase().rpc("apply_promo_bonus", {
    p_subscription_id: subscriptionId,
    p_washes: washes,
  });
  if (error) throw error;
}

/* ---------------- admin ---------------- */

export async function adminListPromos(): Promise<PromoCode[]> {
  const { data, error } = await getSupabase()
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as any[]).map(mapPromo);
}

export async function adminCreatePromo(input: {
  code: string;
  kind: "percent" | "fixed" | "bonus_washes";
  value: number;
  planIds: string[] | null;
  maxUses: number | null;
  startsAt: string | null;
  expiresAt: string | null;
}): Promise<PromoCode> {
  const { data, error } = await getSupabase()
    .from("promo_codes")
    .insert({
      code: input.code.trim().toUpperCase(),
      kind: input.kind,
      value: input.value,
      plan_ids: input.planIds,
      max_uses: input.maxUses,
      starts_at: input.startsAt,
      expires_at: input.expiresAt,
    })
    .select("*")
    .single();
  if (error) throw error;
  await logAdminAction(
    "promo.create",
    "promo_code",
    (data as any).id,
    `Created code ${(data as any).code} (${input.kind} ${input.value})`
  ).catch(() => {});
  return mapPromo(data);
}

export async function adminTogglePromo(id: string, active: boolean): Promise<void> {
  const { error } = await getSupabase()
    .from("promo_codes")
    .update({ active })
    .eq("id", id);
  if (error) throw error;
  await logAdminAction(
    "promo.toggle",
    "promo_code",
    id,
    active ? "Activated" : "Deactivated"
  ).catch(() => {});
}
