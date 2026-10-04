/* Nigerian phone number normalization + validation.
 *
 * Accepts the forms users actually type — 0803 123 4567, +234 803 123 4567,
 * 2348031234567 — and normalizes to E.164: +2348031234567.
 * Returns null when the input is not a valid Nigerian mobile number.
 */

export function normalizePhone(raw: string): string | null {
  const digits = (raw || "").replace(/\D/g, "");
  let d: string;
  if (digits.length === 13 && digits.startsWith("234")) {
    d = digits; // already international, missing +
  } else if (digits.length === 11 && digits.startsWith("0")) {
    d = "234" + digits.slice(1); // local format -> international
  } else if (digits.length === 10 && /^[789]/.test(digits)) {
    d = "234" + digits; // missing trunk 0, assume mobile
  } else {
    return null;
  }
  // Nigerian mobile: 234 + 10 digits starting with 7/8/9.
  if (!/^234[789]\d{9}$/.test(d)) return null;
  return "+" + d;
}

/** True when the input can be normalized to a valid Nigerian mobile. */
export function isValidPhone(raw: string): boolean {
  return normalizePhone(raw) !== null;
}

/** Display form: +234 803 123 4567. Falls back to the raw input. */
export function formatPhoneDisplay(raw: string): string {
  const n = normalizePhone(raw);
  if (!n) return raw;
  return `+234 ${n.slice(4, 7)} ${n.slice(7, 10)} ${n.slice(10)}`;
}

export const PHONE_HINT = "e.g. 0803 123 4567";
export const PHONE_ERROR =
  "Enter a valid Nigerian mobile number (e.g. 0803 123 4567).";
