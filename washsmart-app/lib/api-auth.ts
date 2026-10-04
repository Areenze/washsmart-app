/* Shared helper for API routes: build a user-scoped Supabase client from the
 * request's Bearer token (same pattern as /api/paystack/verify). RLS applies;
 * auth.uid() is the caller. Returns null when the token is missing/invalid. */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export async function userClient(
  request: Request
): Promise<{ sb: SupabaseClient; userId: string } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return null;
  const sb = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  return { sb, userId: user.id };
}
