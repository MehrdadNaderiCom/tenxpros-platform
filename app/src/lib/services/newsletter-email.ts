import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

/**
 * Newsletter delivery uses its own send-only mailbox and server
 * (NEWSLETTER_SMTP_*), separate from the transactional mail. Every message
 * carries RFC 8058 one-click List-Unsubscribe headers so Gmail and Outlook show
 * a native unsubscribe button, plus the in-body unsubscribe link. Replies are
 * not expected (send-only address).
 */
function newsletterTransport() {
  return nodemailer.createTransport({
    host: process.env.NEWSLETTER_SMTP_HOST,
    port: Number(process.env.NEWSLETTER_SMTP_PORT ?? "465"),
    secure: (process.env.NEWSLETTER_SMTP_SECURE ?? "true").toLowerCase() !== "false",
    auth: {
      user: process.env.NEWSLETTER_SMTP_USER,
      pass: process.env.NEWSLETTER_SMTP_PASSWORD,
    },
  });
}

export function newsletterFrom(): string {
  return process.env.NEWSLETTER_EMAIL_FROM ?? "TenXPros Newsletter <newsletter@tenxops.org>";
}

export async function sendNewsletterEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  let status = "sent";
  let error: string | undefined;
  try {
    if (!process.env.NEWSLETTER_SMTP_HOST) throw new Error("NEWSLETTER_SMTP_HOST is not configured.");
    await newsletterTransport().sendMail({
      from: newsletterFrom(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      headers: {
        "List-Unsubscribe": `<${input.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  } catch (err) {
    status = "error";
    error = err instanceof Error ? err.message : String(err);
  }

  await prisma.emailEvent.create({
    data: {
      to: input.to,
      subject: input.subject,
      template: "newsletter_campaign",
      status,
      error,
      sentAt: status === "sent" ? new Date() : null,
    },
  });

  return error ? { ok: false, error } : { ok: true };
}
