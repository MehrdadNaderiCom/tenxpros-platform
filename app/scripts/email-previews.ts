/**
 * Render or send sample copies of every TenXPros email, using the exact same
 * templates the app sends in production.
 *
 *   pnpm tsx scripts/email-previews.ts                 # write HTML to /tmp/email-previews
 *   pnpm tsx scripts/email-previews.ts --send <email>  # send one of each to <email>
 *
 * For --send, SMTP_* env vars must be present (sourced from the running app
 * container so the credentials match production). Secrets are never printed.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import nodemailer from "nodemailer";
import { resolveSmtpConfig } from "../src/lib/services/email-smtp";
import {
  applicationReceivedEmail,
  applicationStatusEmail,
  enrollmentWelcomeEmail,
  paymentInstructionsEmail,
} from "../src/lib/email/templates";

const NAME = "Pegah Rostam";

const samples = [
  { tag: "application_received", ...applicationReceivedEmail({ fullName: NAME, applicationId: "cmq6hhd710003e19slfx20o2w" }) },
  {
    tag: "application_status_update",
    ...applicationStatusEmail({
      fullName: NAME,
      status: "REVISE_AND_REAPPLY",
      notes:
        "Please sharpen the problem statement: name the specific workflow, who is affected, and what a good outcome looks like. Then resubmit and we will review again.",
    }),
  },
  {
    tag: "application_accepted_payment_link",
    ...paymentInstructionsEmail({
      fullName: NAME,
      amount: 997,
      currency: "USD",
      dueAt: new Date("2026-06-11T00:00:00Z"),
      paymentLink: "Manual payment link pending",
      paymentInstructions:
        "The Founding Charter fee is USD 997. Our team will share manual invoice / payment details by reply. If you have any questions, contact support@tenxpros.com.",
      publicDiscountNote: null,
      supportEmail: "support@tenxpros.com",
    }),
  },
  {
    tag: "enrollment_welcome",
    ...enrollmentWelcomeEmail({
      fullName: NAME,
      setPasswordUrl: "https://tenxpros.com/set-password?email=you%40example.com&token=sample-token",
      portalUrl: "https://tenxpros.com/portal",
    }),
  },
];

async function main() {
  const sendIdx = process.argv.indexOf("--send");
  if (sendIdx !== -1) {
    const to = process.argv[sendIdx + 1];
    if (!to) throw new Error("Usage: --send <email>");
    const from = process.env.EMAIL_FROM ?? "TenXPros <hello@tenxpros.com>";
    const transporter = nodemailer.createTransport(resolveSmtpConfig());
    for (const sample of samples) {
      await transporter.sendMail({
        from,
        to,
        subject: `[SAMPLE] ${sample.subject}`,
        text: sample.text,
        html: sample.html,
      });
      console.log("sent:", sample.tag, "→", to);
    }
  } else {
    mkdirSync("/tmp/email-previews", { recursive: true });
    for (const sample of samples) {
      writeFileSync(`/tmp/email-previews/${sample.tag}.html`, sample.html);
      console.log("wrote:", sample.tag, "·", sample.subject);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
