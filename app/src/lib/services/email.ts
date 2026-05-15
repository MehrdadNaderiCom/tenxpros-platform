import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

type EmailInput = {
  to: string;
  subject: string;
  template: string;
  text: string;
};

export async function sendEmail(input: EmailInput) {
  const from = process.env.EMAIL_FROM ?? "TenXPros <hello@tenxpros.com>";
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  let status = "sent";
  let error: string | undefined;

  try {
    if (provider === "resend" && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
      });
    } else {
      console.log("[email:console]", {
        to: input.to,
        subject: input.subject,
        template: input.template,
        text: input.text,
      });
    }
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

export function paymentLinkForTier(tier?: string | null) {
  const key = tier ? `STRIPE_PAYMENT_LINK_${tier}` : "STRIPE_PAYMENT_LINK_FOUNDING";
  return process.env[key] || process.env.STRIPE_PAYMENT_LINK_FOUNDING || "Manual payment link pending";
}
