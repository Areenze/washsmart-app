/* POST /api/paystack/verify — server-side Paystack payment verification.
 *
 * The client collects the payment with Paystack Inline (public key only) and
 * posts the transaction reference here. This route:
 *   1. verifies the transaction with Paystack using the SECRET key
 *      (server-only env var — never exposed to the browser),
 *   2. checks the paid amount (kobo) and currency against the plan,
 *   3. mints the subscription via the service-role-only
 *      topup_subscription_for RPC (migration_035) — the browser can
 *      never mint directly, so Paystack cannot be bypassed.
 * Idempotent per Paystack reference: re-verifying returns the subscription
 * that was already created (checked globally via the service role, so a
 * reference paid by one account cannot be re-claimed by another).
 */

import { userClient } from "@/lib/api-auth";
import { adminClient } from "@/lib/supabase-admin";
import { maybeSendSubscriberWelcome } from "@/lib/welcome";

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return Response.json(
      { ok: false, error: "Payments are not configured yet." },
      { status: 500 }
    );
  }

  let body: { reference?: string; planId?: string; promoCode?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const reference = body.reference?.trim();
  const planId = body.planId?.trim();
  const promoCode = body.promoCode?.trim().toUpperCase() || null;
  if (!reference || !planId) {
    return Response.json(
      { ok: false, error: "Missing payment reference or plan." },
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

  // Idempotency: this reference already minted a subscription. Checked
  // with the service role so the answer covers every account, not just
  // the caller's own payments.
  const payReader = admin ?? sb;
  const { data: existing } = await payReader
    .from("payments")
    .select("subscription_id")
    .eq("reference", reference)
    .maybeSingle();
  if (existing?.subscription_id) {
    return Response.json({
      ok: true,
      subscriptionId: existing.subscription_id,
      duplicate: true,
    });
  }

  // Verify the transaction with Paystack.
  let verification: {
    status?: boolean;
    data?: { status?: string; amount?: number; currency?: string };
  };
  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
        // Fail fast instead of hanging the serverless function.
        signal: AbortSignal.timeout(8000),
      }
    );
    verification = await res.json();
  } catch {
    return Response.json(
      { ok: false, error: "Could not reach Paystack. Please try again." },
      { status: 502 }
    );
  }
  const tx = verification?.data;
  if (!verification?.status || tx?.status !== "success") {
    return Response.json(
      { ok: false, error: "Payment was not successful." },
      { status: 402 }
    );
  }

  // Amount guard: Paystack reports kobo; plans store whole naira.
  // A promo code is re-validated here server-side — the client can lie.
  const { data: plan } = await sb
    .from("plans")
    .select("id,name,amount,washes")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) {
    return Response.json({ ok: false, error: "Unknown plan." }, { status: 400 });
  }
  let promo: {
    promo_id: string;
    kind: string;
    value: number;
    discount_naira: number;
  } | null = null;
  if (promoCode) {
    const { data: v } = await sb.rpc("validate_promo_code", {
      p_code: promoCode,
      p_plan_id: planId,
    });
    promo = (v as any[])?.[0] ?? null;
    // If the code died between checkout and verification, fall back to the
    // full price rather than punishing the buyer — they paid what Paystack
    // shows, and we validate against that.
  }
  const discountNaira = promo ? Number(promo.discount_naira ?? 0) : 0;
  const expectedKobo = Math.round((Number(plan.amount) - discountNaira) * 100);
  if (tx.currency !== "NGN" || Number(tx.amount) !== expectedKobo) {
    return Response.json(
      { ok: false, error: "Paid amount does not match the plan." },
      { status: 402 }
    );
  }

  const bonusWashes =
    promo?.kind === "bonus_washes" ? Math.round(Number(promo.value)) : 0;

  // Mint the subscription. Privileged path (service role): the only
  // caller allowed to grant washes. Legacy fallback covers the window
  // before SUPABASE_SERVICE_ROLE_KEY is configured / migration_035 is
  // applied; once both land, the legacy RPC is revoked and unreachable.
  let subId: string | null = null;
  let mintError: unknown = null;
  if (admin) {
    const r = await admin.rpc("topup_subscription_for", {
      p_user_id: userId,
      p_plan_id: planId,
      p_method: "paystack",
      p_reference: reference,
      p_bonus_washes: bonusWashes,
    });
    subId = (r.data as string) ?? null;
    mintError = r.error;
  } else {
    const r = await sb.rpc("topup_subscription", {
      p_plan_id: planId,
      p_method: "paystack",
      p_reference: reference,
    });
    subId = (r.data as string) ?? null;
    mintError = r.error;
  }
  if (mintError || !subId) {
    // Log the underlying code for support diagnosis (never the raw
    // message to the client — just the Postgres/PostgREST code).
    const code =
      (mintError as { code?: string } | null)?.code ?? "no-admin-client";
    console.error("paystack verify: mint failed", {
      code,
      via: admin ? "service" : "legacy",
      reference,
    });
    return Response.json(
      {
        ok: false,
        error:
          "Payment verified, but activation failed. Contact support with your payment reference.",
        detail: code,
      },
      { status: 500 }
    );
  }

  const {
    data: { user },
  } = await sb.auth.getUser();

  // Record the promo redemption (best-effort). Bonus washes on the
  // privileged path were already granted inside topup_subscription_for,
  // with the count derived from the promo row — never from the client.
  if (promo && user) {
    const { data: payRow } = await payReader
      .from("payments")
      .select("id")
      .eq("reference", reference)
      .maybeSingle();
    try {
      if (admin) {
        await admin.rpc("record_promo_redemption_for", {
          p_promo_id: promo.promo_id,
          p_user_id: userId,
          p_payment_id: (payRow as any)?.id ?? null,
        });
      } else {
        await sb.rpc("record_promo_redemption", {
          p_promo_id: promo.promo_id,
          p_payment_id: (payRow as any)?.id ?? null,
        });
        if (bonusWashes > 0) {
          await sb.rpc("apply_promo_bonus", {
            p_subscription_id: subId,
            p_washes: bonusWashes,
          });
        }
      }
    } catch {
      /* a failed promo must never block a paid subscription */
    }
  }

  if (user) {
    void (async () => {
      try {
        await sb.rpc("notify_user", {
          p_user_id: user.id,
          p_kind: "payment_success",
          p_title: `Payment successful — ${plan.name}`,
          p_body:
            `₦${Number((tx.amount ?? 0) / 100).toLocaleString("en-NG")} received. ` +
            `Your subscription is active with ${plan.washes}${
              bonusWashes > 0 ? `+${bonusWashes} bonus` : ""
            } washes.`,
          p_link: "/app",
        });
      } catch {
        /* notifications are best-effort */
      }
      // First-time buyers also get the automated welcome (in-app + email).
      await maybeSendSubscriberWelcome(sb, {
        id: user.id,
        email: user.email ?? undefined,
      });
    })();
  }
  return Response.json({ ok: true, subscriptionId: subId });
}
