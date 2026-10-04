/* POST /api/verify-phone/send — send a Termii OTP to the caller's number.
 *
 * Body: { phone }. The phone is normalized to E.164 server-side; Termii gets
 * it without the leading +. Rate-limited: max 5 sends per user per hour.
 * The Termii pin_id is stored server-side — the browser never sees it.
 */

import { userClient } from "@/lib/api-auth";
import { normalizePhone } from "@/lib/phone";
import { sendOtp } from "@/lib/termii";

const MAX_SENDS_PER_HOUR = 5;

export async function POST(request: Request) {
  const auth = await userClient(request);
  if (!auth) {
    return Response.json({ ok: false, error: "Please log in again." }, { status: 401 });
  }
  const { sb, userId } = auth;

  let body: { phone?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const e164 = normalizePhone(body.phone ?? "");
  if (!e164) {
    return Response.json(
      { ok: false, error: "Enter a valid Nigerian mobile number (e.g. 0803 123 4567)." },
      { status: 400 }
    );
  }

  // Rate limit: 5 sends per user per rolling hour.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await sb
    .from("phone_verifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= MAX_SENDS_PER_HOUR) {
    return Response.json(
      { ok: false, error: "Too many codes sent. Please wait a while and try again." },
      { status: 429 }
    );
  }

  let pinId: string;
  try {
    ({ pinId } = await sendOtp(e164.replace(/^\+/, "")));
  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message ?? "Could not send the code." },
      { status: 502 }
    );
  }

  const { error } = await sb.from("phone_verifications").insert({
    user_id: userId,
    phone: e164,
    pin_id: pinId,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) {
    return Response.json({ ok: false, error: "Could not start verification." }, { status: 500 });
  }
  return Response.json({ ok: true, phone: e164 });
}
