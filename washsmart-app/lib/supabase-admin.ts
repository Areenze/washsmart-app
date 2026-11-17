/* Server-only Supabase client using the SERVICE ROLE key.
 *
 * Bypasses RLS — use ONLY inside API routes after the caller has been
 * authenticated and the action independently verified (e.g. Paystack
 * confirmed the payment, Termii confirmed the OTP). Never import this
 * from client code: the key must never reach the browser. Minting runs
 * through service-role-only RPCs (migration_035) so a browser client
 * can never grant itself subscriptions or washes.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function adminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
