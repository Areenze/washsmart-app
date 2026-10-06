/* Server-only email sender via the Resend HTTP API.
 *
 * Best-effort by design: when RESEND_API_KEY is not set the send is skipped
 * (with a console warning) and the caller continues. Never throws for
 * missing config; returns { sent: false } on any failure so callers can
 * decide what to do. Never import this from client components.
 */

interface SendEmailOpts {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(
  opts: SendEmailOpts
): Promise<{ sent: boolean; skipped?: boolean }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY not set — skipping email to ${opts.to}`);
    return { sent: false, skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WashSMART <noreply@washsmart.ng>",
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[email] Resend rejected the send:", res.status, text.slice(0, 200));
      return { sent: false };
    }
    return { sent: true };
  } catch (e) {
    console.warn("[email] send failed:", e instanceof Error ? e.message : e);
    return { sent: false };
  }
}
