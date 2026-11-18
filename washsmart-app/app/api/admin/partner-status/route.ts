/* POST /api/admin/partner-status — suspend or reactivate a partner.
 *
 * Body: { partnerId: string, status: "suspended" | "approved" }
 *
 * Suspension is enforced by the status itself: the public
 * partner_directory view only lists status='approved', and redeem_wash
 * refuses any partner whose status is not 'approved' — so flipping the
 * status stops trading immediately (hidden from Find-a-wash, QR scans
 * refused) while the partner's record, earnings and settlement history
 * are kept, and the partner can still sign in to view them.
 *
 * The update runs on the service role: the migration_035 freeze
 * trigger lets service-role and admin writes through, while partners
 * themselves can never change their own status. Caller must be a
 * signed-in admin. The admin page writes the audit-log entry.
 */

import { createClient } from "@supabase/supabase-js";
import { adminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    // Caller must be a signed-in admin (same pattern as partner-login).
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

    const { partnerId, status } = (await request.json().catch(() => ({}))) as {
      partnerId?: string;
      status?: string;
    };
    if (!partnerId)
      return Response.json(
        { ok: false, error: "Missing partnerId." },
        { status: 400 }
      );
    if (status !== "suspended" && status !== "approved")
      return Response.json(
        { ok: false, error: "Status must be 'suspended' or 'approved'." },
        { status: 400 }
      );

    const admin = adminClient();
    if (!admin)
      return Response.json(
        { ok: false, error: "Admin service not configured." },
        { status: 500 }
      );

    // Load the partner server-side — the client only names the ID.
    const { data: partner, error: pErr } = await admin
      .from("partners")
      .select("id,partner_id,name,status")
      .eq("partner_id", partnerId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!partner)
      return Response.json(
        { ok: false, error: "Partner not found." },
        { status: 404 }
      );

    if (partner.status === status)
      return Response.json({ ok: true, status, unchanged: true });

    const { error } = await admin
      .from("partners")
      .update({ status })
      .eq("id", partner.id);
    if (error) throw error;

    return Response.json({ ok: true, status });
  } catch (e) {
    console.error("partner-status failed:", e);
    return Response.json(
      { ok: false, error: "Could not change the partner status. Try again." },
      { status: 500 }
    );
  }
}
