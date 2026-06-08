import { Resend } from "resend";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import { resolveSmtpConfig, safeRun } from "./email-smtp";

// Re-exported so existing importers (`@/lib/services/email`) are unchanged while
// the implementation lives in a pure, dependency-free, testable module.
export { paymentLinkForTier } from "./payment-link";

type EmailInput = {
  to: string;
  subject: string;
  template: string;
  text: string;
};

/**
 * Deliver one email through the configured provider:
 *   EMAIL_PROVIDER=smtp    -> nodemailer (SMTP; reads SMTP_* from env)
 *   EMAIL_PROVIDER=resend  -> Resend (requires RESEND_API_KEY)
 *   anything else / unset  -> console log (no real send)
 * Secrets (SMTP_PASSWORD / RESEND_API_KEY) are read from env only, never logged.
 */
async function deliver(from: string, input: EmailInput): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? "console";

  if (provider === "smtp") {
    const transporter = nodemailer.createTransport(resolveSmtpConfig());
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return;
  }

  if (provider === "resend" && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return;
  }

  console.log("[email:console]", {
    to: input.to,
    subject: input.subject,
    template: input.template,
    text: input.text,
  });
}

/**
 * Send one email and record an EmailEvent. Throws on delivery error (after
 * recording the failure). Callers that must not break on email failure should
 * use {@link safeSendEmail} instead.
 */
export async function sendEmail(input: EmailInput) {
  const from = process.env.EMAIL_FROM ?? "TenXPros <hello@tenxpros.com>";
  let status = "sent";
  let error: string | undefined;

  try {
    await deliver(from, input);
  } catch (err) {
    status = "error";
    error = err instanceof Error ? err.message : String(err);
  }

  await prisma.emailEvent.create({
    data: {
      to: input.to,
      subject: input.subject,
      template: input.template,
      status,
      error,
      sentAt: status === "sent" ? new Date() : null,
    },
  });

  if (error) throw new Error(error);
}

/**
 * Non-throwing wrapper around {@link sendEmail}. Email failures must never break
 * application intake or admin/status actions. sendEmail still records an
 * EmailEvent (status="error"), so failures remain operator-visible in
 * /admin/email; this additionally logs a concise redacted warning and returns a
 * result object instead of throwing.
 */
export function safeSendEmail(input: EmailInput) {
  return safeRun({ template: input.template, to: input.to }, () => sendEmail(input));
}
