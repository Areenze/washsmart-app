/* POST /api/admin/welcome-partner — email the newly approved partner.
 *
 * Body: { ref: string } (partner application ref).
 * Called best-effort by the admin UI right after approve_partner_application
 * succeeds. Verifies the caller is an admin, loads the application + issued
 * Partner ID, and sends the welcome email to the application email address.
 * At approval time the partner has no auth user yet, so email is the only
 * channel. Never blocks approval: always returns ok.
 */

import { createClient } from "@supabase/supabase-js";
import { sendPartnerWelcomeEmail } from "@/lib/welcome";

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

    const { data: admin } = await sb.rpc("is_admin");
    if (admin !== true) return Response.json({ ok: false }, { status: 403 });

    const { ref } = (await request.json().catch(() => ({}))) as { ref?: string };
    if (!ref) return Response.json({ ok: false }, { status: 400 });

    const { data: app } = await sb
      .from("partner_applications")
      .select("ref,car_wash_name,email,status")
      .eq("ref", ref)
      .maybeSingle();
    if (!app || (app as any).status !== "approved" || !(app as any).email) {
      return Response.json({ ok: true });
    }
    const { data: partner } = await sb
      .from("partners")
      .select("partner_id")
      .eq("application_ref", ref)
      .maybeSingle();

    await sendPartnerWelcomeEmail({
      to: (app as any).email,
      carWashName: (app as any).car_wash_name ?? "Partner",
      partnerId: (partner as any)?.partner_id ?? "",
    });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}
