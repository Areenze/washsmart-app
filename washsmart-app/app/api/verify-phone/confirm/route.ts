/* POST /api/verify-phone/confirm — check the user-typed code with Termii.
 *
 * Body: { pin }. Uses the caller's most recent pending verification. On
 * success marks profiles.phone_verified and clears pending rows.
 */

import { userClient } from "@/lib/api-auth";
import { verifyOtp } from "@/lib/termii";

export async function POST(request: Request) {
  const auth = await userClient(request);
  if (!auth) {
    return Response.json({ ok: false, error: "Please log in again." }, { status: 401 });
  }
  const { sb, userId } = auth;

  let body: { pin?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const pin = (body.pin ?? "").replace(/\D/g, "");
  if (pin.length !== 6) {
    return Response.json({ ok: false, error: "Enter the 6-digit code." }, { status: 400 });
  }

  const { data: pending } = await sb
    .from("phone_verifications")
    .select("id, phone, pin_id, expires_at, attempts")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!pending) {
    return Response.json(
      { ok: false, error: "No active code. Please request a new one." },
      { status: 400 }
    );
  }

  await sb.from("phone_verifications").update({ attempts: pending.attempts + 1 }).eq("id", pending.id);

  let verified = false;
  try {
    verified = await verifyOtp(pending.pin_id, pin);
  } catch {
    verified = false;
  }
  if (!verified) {
    return Response.json({ ok: false, error: "Wrong code. Check the SMS and try again." }, { status: 400 });
  }

  const { error } = await sb
    .from("profiles")
    .update({
      phone: pending.phone,
      phone_verified: true,
      phone_verified_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) {
    return Response.json({ ok: false, error: "Could not save verification." }, { status: 500 });
  }
  await sb.from("phone_verifications").delete().eq("user_id", userId);
  return Response.json({ ok: true, phone: pending.phone });
}
