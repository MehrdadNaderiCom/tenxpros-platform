/**
 * Branded, email-client-safe shell for newsletter campaigns. The body is rich
 * HTML authored in the admin rich-text editor and embedded as-is. The footer is
 * send-only (no reply) and carries a one-click unsubscribe link. Pure and
 * dependency-free so it can be unit-tested and rendered in a preview.
 */
export type NewsletterEmail = { subject: string; html: string; text: string };

/** Bumped when the branded shell or footer changes, so sent snapshots stay traceable. */
export const NEWSLETTER_TEMPLATE_VERSION = "nl-1";
/** Describes the unsubscribe mechanism baked into a sent campaign. */
export const NEWSLETTER_UNSUB_VERSION = "rfc8058-one-click-v1";

const NAVY = "#0B1F3A";
const GOLD = "#B58A3C";
const MUTED = "#94A3B8";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function esc(value: unknown): string {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Rough but safe HTML to plain-text for the text/plain fallback part. */
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/div|\/h[1-6]|\/li)\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildNewsletterEmail(params: {
  subject: string;
  bodyHtml: string;
  unsubscribeUrl: string;
}): NewsletterEmail {
  const { subject, bodyHtml, unsubscribeUrl } = params;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#EEF2F7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#EEF2F7;">${esc(subject)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF2F7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid #E3E8EF;border-radius:14px;overflow:hidden;font-family:${FONT};">
  <tr><td style="background:${NAVY};padding:22px 32px;">
    <span style="font-size:19px;font-weight:700;letter-spacing:0.03em;color:#ffffff;">TenXPros</span>
    <span style="font-size:12px;color:#9FB0C8;padding-left:10px;">Newsletter</span>
  </td></tr>
  <tr><td style="height:3px;background:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td style="padding:30px 32px 8px;color:#334155;font-size:15px;line-height:1.7;">
    <div class="nl-body">${bodyHtml}</div>
  </td></tr>
  <tr><td style="padding:8px 32px 30px;">
    <div style="border-top:1px solid #E3E8EF;margin-top:14px;padding-top:16px;font-size:12px;line-height:1.7;color:${MUTED};">
      You are receiving this because you subscribed to the TenXPros newsletter.
      <a href="${esc(unsubscribeUrl)}" style="color:#64748B;text-decoration:underline;">Unsubscribe in one click</a>.<br>
      This newsletter is sent from a send-only address. Please do not reply to this email.
    </div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    htmlToText(bodyHtml),
    "",
    "You are receiving this because you subscribed to the TenXPros newsletter.",
    `Unsubscribe in one click: ${unsubscribeUrl}`,
    "This newsletter is sent from a send-only address. Please do not reply to this email.",
  ].join("\n");

  return { subject, html, text };
}
