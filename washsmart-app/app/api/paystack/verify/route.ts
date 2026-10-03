/* POST /api/paystack/verify — server-side Paystack payment verification.
 *
 * The client collects the payment with Paystack Inline (public key only) and
 * posts the transaction reference here. This route:
 *   1. verifies the transaction with Paystack using the SECRET key
 *      (server-only env var — never exposed to the browser),
 *   2. checks the paid amount (kobo) and currency against the plan,
 *   3. mints the subscription as the signed-in buyer via topup_subscription,
 *      recording method='paystack' and the verified reference.
 * Idempotent per Paystack reference: re-verifying returns the subscription
 * that was already created.
 */

import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return Response.json(
      { ok: false, error: "Payments are not configured yet." },
      { status: 500 }
    );
  }

  let body: { reference?: string; planId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const reference = body.reference?.trim();
  const planId = body.planId?.trim();
  if (!reference || !planId) {
    return Response.json(
      { ok: false, error: "Missing payment reference or plan." },
      { status: 400 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return Response.json(
      { ok: false, error: "You need to be signed in." },
      { status: 401 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return Response.json({ ok: false, error: "Server misconfigured." }, { status: 500 });
  }
  // User-scoped client: RLS applies and auth.uid() is the buyer.
  const sb = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  // Idempotency: this reference already minted a subscription.
  const { data: existing } = await sb
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
  const { data: plan } = await sb
    .from("plans")
    .select("id,amount")
    .eq("id", planId)
    .maybeSingle();
  if (!plan) {
    return Response.json({ ok: false, error: "Unknown plan." }, { status: 400 });
  }
  const expectedKobo = Math.round(Number(plan.amount) * 100);
  if (tx.currency !== "NGN" || Number(tx.amount) !== expectedKobo) {
    return Response.json(
      { ok: false, error: "Paid amount does not match the plan." },
      { status: 402 }
    );
  }

  // Mint the subscription as the buyer; the RPC records the payment row.
  const { data: subId, error } = await sb.rpc("topup_subscription", {
    p_plan_id: planId,
    p_method: "paystack",
    p_reference: reference,
  });
  if (error) {
    return Response.json(
      {
        ok: false,
        error:
          "Payment verified, but activation failed. Contact support with your payment reference.",
      },
      { status: 500 }
    );
  }
  return Response.json({ ok: true, subscriptionId: subId });
}
