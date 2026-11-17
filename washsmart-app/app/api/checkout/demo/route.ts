/* POST /api/checkout/demo — demo-environment plan mint.
 *
 * Body: { planId }. Only works when payments are NOT configured on
 * the server (no PAYSTACK_SECRET_KEY): that is what "demo environment"
 * means, and the check is server-side so it cannot be spoofed from
 * the browser. In production the secret exists and this route refuses.
 * The mint runs through the service-role-only topup_subscription_for
 * RPC (migration_035).
 */

import { userClient } from "@/lib/api-auth";
import { adminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  if (process.env.PAYSTACK_SECRET_KEY) {
    return Response.json(
      { ok: false, error: "Demo minting is disabled when payments are configured." },
      { status: 403 }
    );
  }

  let body: { planId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const planId = body.planId?.trim();
  if (!planId) {
    return Response.json({ ok: false, error: "Missing plan." }, { status: 400 });
  }

  const auth = await userClient(request);
  if (!auth) {
    return Response.json(
      { ok: false, error: "You need to be signed in." },
      { status: 401 }
    );
  }

  const admin = adminClient();
  if (!admin) {
    console.error("checkout/demo: SUPABASE_SERVICE_ROLE_KEY not configured");
    return Response.json(
      { ok: false, error: "Demo minting is unavailable right now." },
      { status: 500 }
    );
  }

  const mint = await admin.rpc("topup_subscription_for", {
    p_user_id: auth.userId,
    p_plan_id: planId,
    p_method: "demo",
    p_reference: null,
    p_bonus_washes: 0,
  });
  if (mint.error) {
    return Response.json(
      { ok: false, error: "Could not activate your plan." },
      { status: 500 }
    );
  }
  return Response.json({ ok: true, subscriptionId: mint.data });
}
