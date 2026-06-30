import { safeSendEmail } from "./email";
import { superAdminEmail } from "@/lib/authz";
import { absoluteUrl } from "@/lib/utils";

/**
 * Email the program owner (the primary super admin, mail@mehrdadnaderi.com) when
 * something needs their attention: a new application, a partner who finished
 * onboarding and is awaiting confirmation, a new deal/request, or a certificate
 * earned. Non-throwing (uses safeSendEmail), so it never breaks the action that
 * triggered it; the send is still recorded as an EmailEvent in /admin/email.
 */
export async function notifyOwner(input: { subject: string; template: string; body: string; href?: string }): Promise<void> {
  const link = input.href ? `\n\nOpen: ${absoluteUrl(input.href)}` : "";
  await safeSendEmail({
    to: superAdminEmail(),
    subject: input.subject,
    template: input.template,
    text: input.body + link,
  });
}
