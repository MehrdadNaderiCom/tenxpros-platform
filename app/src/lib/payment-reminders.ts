/**
 * Pure selection logic for the accepted-but-unpaid payment reminder flow, kept
 * dependency-free so it is unit-testable in isolation. The service layer queries
 * the records and sends the emails; this only decides who is due for what.
 *
 * Timeline for an accepted applicant who has been sent payment instructions:
 *  - At instructionsSentAt: the instructions email goes out (existing behavior).
 *  - 24 hours later, if still unpaid and before the deadline: a reminder.
 *  - At the payment deadline (dueAt), if still unpaid: a deadline-passed notice
 *    asking the applicant to coordinate with support before paying.
 */

export const REMINDER_AFTER_HOURS = 24;
const MS_PER_HOUR = 60 * 60 * 1000;

export interface ReminderCandidate {
  status: string;
  instructionsSentAt: Date | null;
  dueAt: Date | null;
  paidAt: Date | null;
  waivedAt: Date | null;
  cancelledAt: Date | null;
  reminderSentAt: Date | null;
  expiryNoticeSentAt: Date | null;
}

/** Still genuinely awaiting payment: instructions sent, not paid/waived/cancelled. */
export function isAwaitingPayment(r: ReminderCandidate): boolean {
  return r.status === "INSTRUCTIONS_SENT" && !r.paidAt && !r.waivedAt && !r.cancelledAt;
}

/**
 * A reminder is due when payment instructions were sent at least
 * REMINDER_AFTER_HOURS ago, the record is still unpaid, no reminder has been sent
 * yet, and the deadline has not already passed (the expiry notice covers that).
 */
export function needsReminder(r: ReminderCandidate, now: Date, hours: number = REMINDER_AFTER_HOURS): boolean {
  if (!isAwaitingPayment(r)) return false;
  if (r.reminderSentAt) return false;
  if (!r.instructionsSentAt) return false;
  const elapsedMs = now.getTime() - r.instructionsSentAt.getTime();
  if (elapsedMs < hours * MS_PER_HOUR) return false;
  if (r.dueAt && now.getTime() >= r.dueAt.getTime()) return false;
  return true;
}

/**
 * The deadline-passed notice is due once the payment deadline has been reached,
 * the record is still unpaid, and the notice has not been sent yet.
 */
export function needsExpiryNotice(r: ReminderCandidate, now: Date): boolean {
  if (!isAwaitingPayment(r)) return false;
  if (r.expiryNoticeSentAt) return false;
  if (!r.dueAt) return false;
  return now.getTime() >= r.dueAt.getTime();
}
