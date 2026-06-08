import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

// Re-exported so existing importers (`@/lib/services/email`) are unchanged while
// the implementation lives in a pure, dependency-free, testable module.
export { paymentLinkForTier } from "./payment-link";

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

