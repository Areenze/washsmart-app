/* POST /api/welcome — fire the first-time subscriber welcome.
 *
 * Used by the client after a 100%-off promo mint (which never touches the
 * Paystack verify route). Authenticated; the welcome helper itself checks
 * that this really is the user's first subscription, so duplicate calls
 * are harmless. Best-effort: always returns ok.
 */

import { createClient } from "@supabase/supabase-js";
import { maybeSendSubscriberWelcome } from "@/lib/welcome";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return Response.json({ ok: false }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return Response.json({ ok: false }, { status: 500 });

    const sb = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return Response.json({ ok: false }, { status: 401 });

    await maybeSendSubscriberWelcome(sb, {
      id: user.id,
      email: user.email ?? undefined,
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}
