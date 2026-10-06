/* Automated welcome messages — subscriber + partner.
 *
 * Server-only. Every entry point is best-effort: it never throws and never
 * blocks the flow that triggered it (purchase, approval). Email dispatch
 * goes through lib/email.ts, which skips silently when RESEND_API_KEY is
 * absent — in-app notifications always work regardless.
 */

import { sendEmail } from "./email";

const APP_URL = "https://washsmart.ng";

type Db = {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, any>) => any;
};

function emailShell(inner: string): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f7f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 20px;">
<div style="background:#20a957;border-radius:16px 16px 0 0;padding:24px 28px;">
<span style="display:inline-block;background:#ffffff;color:#20a957;font-weight:800;font-size:22px;width:44px;height:44px;line-height:44px;text-align:center;border-radius:12px;">W</span>
<span style="color:#ffffff;font-weight:800;font-size:20px;margin-left:10px;vertical-align:middle;">WashSMART</span>
</div>
<div style="background:#ffffff;border-radius:0 0 16px 16px;padding:28px;color:#1c2420;font-size:15px;line-height:1.6;">
${inner}
<p style="color:#8a938d;font-size:12px;margin-top:28px;">WashSMART · Lagos, Nigeria<br/>Need help? Reply to this email or write to support@washsmart.ng</p>
</div></div></body></html>`;
}

function btn(href: string, label: string): string {
  return `<p style="margin:22px 0;"><a href="${href}" style="display:inline-block;background:#20a957;color:#ffffff;font-weight:700;font-size:15px;padding:13px 28px;border-radius:999px;text-decoration:none;">${label}</a></p>`;
}

/* ---------------- subscriber ---------------- */

function subscriberWelcomeHtml(opts: {
  firstName: string;
  planName: string;
  washes: number;
  renewsAt: string | null;
}): string {
  const expiry = opts.renewsAt
    ? new Date(opts.renewsAt).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "30 days from today";
  return emailShell(`
<h2 style="margin:0 0 12px;font-size:22px;">Welcome to WashSMART, ${opts.firstName} 🧽</h2>
<p>Your <strong>${opts.planName}</strong> plan is active with <strong>${opts.washes} washes</strong>. Your credits are valid until <strong>${expiry}</strong> — unused washes expire, so wash early and wash often.</p>
<p><strong>How it works:</strong></p>
<ol style="padding-left:20px;">
<li>Find an approved partner near you on the map.</li>
<li>At the wash, open your Wash QR on the dashboard.</li>
<li>The partner scans it — one wash is deducted. Done.</li>
</ol>
${btn(`${APP_URL}/app`, "Open my dashboard")}
<p style="color:#8a938d;font-size:13px;">One subscription covers all your registered cars, and every wash draws from the same credit pool.</p>`);
}

/** Send the first-time subscriber welcome (in-app + email). No-op for
 *  repeat purchases. Never throws. */
export async function maybeSendSubscriberWelcome(
  sb: Db,
  user: { id: string; email?: string }
): Promise<void> {
  try {
    const { count } = await sb
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id);
    if ((count ?? 0) !== 1) return; // welcome is for first-timers only

    const { data: sub } = await sb
      .from("subscriptions")
      .select("plan_name,washes_total,washes_remaining,renews_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: prof } = await sb
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    const firstName = String(prof?.name ?? "").split(" ")[0] || "there";
    const planName = String(sub?.plan_name ?? "WashSMART");
    const washes = Number(sub?.washes_remaining ?? sub?.washes_total ?? 0);
    const renewsAt = (sub?.renews_at as string | null) ?? null;

    await sb
      .rpc("notify_user", {
        p_user_id: user.id,
        p_kind: "welcome",
        p_title: "Welcome to WashSMART 🧽",
        p_body:
          `Your ${planName} plan is active with ${washes} washes. ` +
          `Find a partner on the map, show your Wash QR, and you're good to go.`,
        p_link: "/app",
        p_audience: "subscriber",
      })
      .catch(() => {});

    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: "Welcome to WashSMART 🧽",
        html: subscriberWelcomeHtml({ firstName, planName, washes, renewsAt }),
      });
    }
  } catch {
    /* welcome must never break signup/purchase */
  }
}

/* ---------------- partner ---------------- */

function partnerWelcomeHtml(opts: { carWashName: string; partnerId: string }): string {
  return emailShell(`
<h2 style="margin:0 0 12px;font-size:22px;">You're an approved WashSMART partner 🎉</h2>
<p>Congratulations, <strong>${opts.carWashName}</strong> — your application passed review and you're now live on the WashSMART network.</p>
<p><strong>Your Partner ID:</strong> <span style="font-family:monospace;font-size:16px;background:#eef4f0;padding:4px 10px;border-radius:8px;">${opts.partnerId}</span><br/>
Use it with your password to sign in to the Partner App.</p>
<p><strong>What happens next:</strong></p>
<ol style="padding-left:20px;">
<li>We'll link your Partner App login and confirm your payout details.</li>
<li>Subscribers find you on the map and show their Wash QR — you scan it in the Partner App to verify each wash.</li>
<li>Verified washes accrue as pending earnings and are paid out on WashSMART's settlement cycle.</li>
</ol>
${btn(`${APP_URL}/partner`, "Open the Partner App")}
<p style="color:#8a938d;font-size:13px;">Keep your listed hours and services up to date in the Partner App so subscribers always find you ready.</p>`);
}

/** Email the newly approved partner. Never throws. */
export async function sendPartnerWelcomeEmail(opts: {
  to: string;
  carWashName: string;
  partnerId: string;
}): Promise<void> {
  try {
    await sendEmail({
      to: opts.to,
      subject: "You're a WashSMART Approved Partner 🎉",
      html: partnerWelcomeHtml({
        carWashName: opts.carWashName,
        partnerId: opts.partnerId,
      }),
    });
  } catch {
    /* welcome must never break approval */
  }
}
