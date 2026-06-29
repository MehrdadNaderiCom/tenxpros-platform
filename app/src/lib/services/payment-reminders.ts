import { prisma } from "@/lib/prisma";
import { safeSendEmail } from "./email";
import { resolvePaymentTerms } from "@/lib/payment-terms";
import { paymentReminderEmail, paymentDeadlinePassedEmail } from "@/lib/email/templates";
import { needsReminder, needsExpiryNotice } from "@/lib/payment-reminders";

export interface ReminderRunResult {
  candidates: number;
  reminders: number;
  expiries: number;
}

type TierName = "FOUNDING" | "EARLY" | "LATE" | "FINAL" | "STANDARD";

/**
 * Send the accepted-but-unpaid payment reminders and deadline-passed notices.
 * Idempotent: each record is stamped (reminderSentAt / expiryNoticeSentAt) once
 * the matching email is sent, so re-running never double-sends. Only records that
 * are still awaiting payment (INSTRUCTIONS_SENT and not paid/waived/cancelled)
 * are considered. Designed to be called on a schedule (see the cron route).
 */
export async function processPaymentReminders(now: Date = new Date()): Promise<ReminderRunResult> {
  const candidates = await prisma.paymentRecord.findMany({
    where: {
      status: "INSTRUCTIONS_SENT",
      paidAt: null,
      waivedAt: null,
      cancelledAt: null,
      instructionsSentAt: { not: null },
    },
    include: { application: { select: { email: true, fullName: true, pricingTierAtApply: true } } },
  });

  let reminders = 0;
  let expiries = 0;

  for (const r of candidates) {
    if (!r.application) continue;
    const wantReminder = needsReminder(r, now);
    const wantExpiry = !wantReminder && needsExpiryNotice(r, now);
    if (!wantReminder && !wantExpiry) continue;

    const tier = await prisma.pricingTier.findFirst({
      where: { tier: (r.application.pricingTierAtApply ?? "FOUNDING") as TierName },
    });
    const terms = resolvePaymentTerms({ record: r, tier, now });

    if (wantReminder) {
      const mail = paymentReminderEmail({
        fullName: r.application.fullName,
        amount: terms.amount,
        currency: terms.currency,
        dueAt: terms.dueAt,
        paymentLink: terms.paymentLink,
        paymentInstructions: terms.paymentInstructions,
        method: terms.method,
        supportEmail: terms.supportEmail,
      });
      const res = await safeSendEmail({ to: r.application.email, subject: mail.subject, template: "payment_reminder", text: mail.text, html: mail.html });
      if (res.ok) {
        await prisma.paymentRecord.update({ where: { id: r.id }, data: { reminderSentAt: now } });
        reminders += 1;
      }
    } else {
      const mail = paymentDeadlinePassedEmail({ fullName: r.application.fullName, supportEmail: terms.supportEmail });
      const res = await safeSendEmail({ to: r.application.email, subject: mail.subject, template: "payment_deadline_passed", text: mail.text, html: mail.html });
      if (res.ok) {
        await prisma.paymentRecord.update({ where: { id: r.id }, data: { expiryNoticeSentAt: now } });
        expiries += 1;
      }
    }
  }

  return { candidates: candidates.length, reminders, expiries };
}
