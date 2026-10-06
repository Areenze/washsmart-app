/* POST /api/admin/welcome-agent — email the newly activated field agent.
 *
 * Body: { agentId: string }.
 * Verifies the caller is an admin, loads the agent, and sends the welcome
 * email (agent code + Agent App link + how-it-works). Best-effort: always
 * returns ok, with `sent` telling the caller whether the email went out
 * (false when RESEND_API_KEY is not configured).
 */

import { createClient } from "@supabase/supabase-js";
import { sendAgentWelcomeEmail } from "@/lib/welcome";

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

    const { agentId } = (await request.json().catch(() => ({}))) as {
      agentId?: string;
    };
    if (!agentId) return Response.json({ ok: false }, { status: 400 });

    const { data: agent } = await sb
      .from("agents")
      .select("code,name,email,user_id,status")
      .eq("id", agentId)
      .maybeSingle();
    const a = agent as any;
    if (!a || !a.email || !a.user_id) {
      return Response.json({ ok: true, sent: false });
    }

    const { sent } = await sendAgentWelcomeEmail({
      to: a.email,
      name: a.name ?? "there",
      code: a.code,
    });
    return Response.json({ ok: true, sent });
  } catch {
    return Response.json({ ok: true, sent: false });
  }
}
