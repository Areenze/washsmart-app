/* Server-only Termii OTP helpers (phone verification).
 *
 * Uses Termii's Token (OTP) API. Phone numbers are passed in international
 * format WITHOUT the leading + (Termii expects 2348031234567).
 * Never import this file from client components — it reads TERMII_API_KEY.
 */

const TERMII_BASE = "https://v3.api.termii.com";

function apiKey(): string {
  const k = process.env.TERMII_API_KEY;
  if (!k) throw new Error("Phone verification is not configured yet.");
  return k;
}

function senderId(): string {
  return process.env.TERMII_SENDER_ID || "WashSMART";
}

export interface OtpSendResult {
  pinId: string;
}

/** Send a 6-digit OTP via Termii. `to` must be like 2348031234567. */
export async function sendOtp(to: string): Promise<OtpSendResult> {
  const res = await fetch(`${TERMII_BASE}/api/sms/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey(),
      message_type: "NUMERIC",
      to,
      from: senderId(),
      // DND route: OTPs must reach numbers on Do-Not-Disturb in Nigeria.
      channel: "dnd",
      pin_attempts: 5,
      pin_time_to_live: 10,
      pin_length: 6,
      pin_placeholder: "< 123456 >",
      message_text: "Your WashSMART verification code is < 123456 >.",
      pin_type: "NUMERIC",
    }),
  });
  const data = await res.json().catch(() => ({}));
  const pinId: string | undefined = data.pinId ?? data.pin_id;
  if (!res.ok || !pinId) {
    throw new Error(
      typeof data?.message === "string" && data.message
        ? `Could not send the code: ${data.message}`
        : "Could not send the verification code. Please try again."
    );
  }
  return { pinId };
}

/** Verify a user-typed PIN against Termii. Returns true when it matches. */
export async function verifyOtp(pinId: string, pin: string): Promise<boolean> {
  const res = await fetch(`${TERMII_BASE}/api/sms/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey(), pin_id: pinId, pin }),
  });
  const data = await res.json().catch(() => ({}));
  // Termii returns { verified: true } on success (older: verified: "true").
  return data.verified === true || data.verified === "true";
}
