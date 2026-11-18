/* POST /api/admin/partner-login — create (or repair) a partner's app login.
 *
 * Body: { partnerId: string } — the issued Partner ID (WS-2026-XXXX).
 *
 * Approval alone never created a login: the partner row existed with no
 * auth user and no password (reported by Mm on Sparkle Wash WS-2026-0001,
 * 2026-11-18). This route closes the gap, idempotently:
 *   1. find the auth user for the partner's email, or create one
 *      (email confirmed, no password yet — the partner sets their own);
 *   2. link partners.user_id to that auth user (service role, so the
 *      migration_035 freeze trigger lets it through);
 *   3. generate a recovery (set-password) link to /partner/reset-password
 *      and email it to the partner.
 * Calling it again for an already-linked partner simply re-sends a fresh
 * set-password email. Caller must be a signed-in admin.
 */

import { createClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/supabase-admin";
import { sendPartnerSetPasswordEmail } from "@/lib/welcome";

export async function POST(request: Request) {
  try {
    // Caller must be a signed-in admin (same pattern as welcome-agent).
    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token)
      return Response.json(
        { ok: false, error: "Not signed in." },
        { status: 401 }
      );

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey)
      return Response.json(
        { ok: false, error: "Server not configured." },
        { status: 500 }
      );

    const sb = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user)
      return Response.json(
        { ok: false, error: "Not signed in." },
        { status: 401 }
      );
    const { data: isAdmin } = await sb.rpc("is_admin");
    if (isAdmin !== true)
      return Response.json(
        { ok: false, error: "Admins only." },
        { status: 403 }
      );

    const { partnerId } = (await request.json().catch(() => ({}))) as {
      partnerId?: string;
    };
    if (!partnerId)
      return Response.json(
        { ok: false, error: "Missing partnerId." },
        { status: 400 }
      );

    const admin = adminClient();
    if (!admin)
      return Response.json(
        { ok: false, error: "Login service not configured." },
        { status: 500 }
      );

    // Load the partner server-side — never trust a client-sent email.
    const { data: partner, error: pErr } = await admin
      .from("partners")
      .select("id,partner_id,name,email,phone,user_id,status")
      .eq("partner_id", partnerId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!partner)
      return Response.json(
        { ok: false, error: "Partner not found." },
        { status: 404 }
      );

    const email = String(partner.email ?? "").trim().toLowerCase();
    if (!email)
      return Response.json(
        {
          ok: false,
          error: "This partner has no email on record — add one first.",
        },
        { status: 400 }
      );

    // Find the auth user for that email (page through the user list;
    // the base is small, the cap is just a safety net).
    let userId: string | null = null;
    let created = false;
    for (let page = 1; page <= 10 && !userId; page++) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw error;
      const found = data.users.find(
        (u) => (u.email ?? "").toLowerCase() === email
      );
      if (found) userId = found.id;
      if (data.users.length < 200) break;
    }

    // …or create it (confirmed, passwordless until the partner sets one).
    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          name: partner.name,
          phone: partner.phone ?? undefined,
          partner_id: partner.partner_id,
        },
      });
      if (error) throw error;
      userId = data.user.id;
      created = true;
    }

    // Link the partner row to the auth user.
    let linked = false;
    if (partner.user_id !== userId) {
      const { error } = await admin
        .from("partners")
        .update({ user_id: userId })
        .eq("id", partner.id);
      if (error) throw error;
      linked = true;
    }

    // Fresh set-password link (recovery flow, same landing as
    // /partner/forgot-password).
    const { data: linkData, error: linkErr } =
      await admin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: "https://washsmart.ng/partner/reset-password",
        },
      });
    if (linkErr) throw linkErr;
    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) throw new Error("Could not generate the set-password link.");

    const mail = await sendPartnerSetPasswordEmail({
      to: email,
      carWashName: partner.name ?? "Partner",
      partnerId: partner.partner_id,
      actionLink,
    });

    return Response.json({
      ok: true,
      created,
      linked,
      sent: mail.sent,
      // Surface WHY the email failed so an admin is not left guessing
      // (the send itself stays best-effort — the login already exists).
      emailError: mail.sent
        ? undefined
        : mail.skipped
          ? "Email service is not configured (RESEND_API_KEY missing)."
          : (mail.error ?? "Email send failed."),
    });
  } catch (e) {
    console.error("partner-login failed:", e);
    return Response.json(
      { ok: false, error: "Could not create the partner login. Try again." },
      { status: 500 }
    );
  }
}
