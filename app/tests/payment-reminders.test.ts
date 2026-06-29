import { describe, it, expect } from "vitest";
import {
  needsReminder,
  needsExpiryNotice,
  isAwaitingPayment,
  REMINDER_AFTER_HOURS,
  type ReminderCandidate,
} from "../src/lib/payment-reminders";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = new Date("2026-06-29T12:00:00Z");

function rec(overrides: Partial<ReminderCandidate> = {}): ReminderCandidate {
  return {
    status: "INSTRUCTIONS_SENT",
    instructionsSentAt: new Date(NOW.getTime() - 25 * HOUR),
    dueAt: new Date(NOW.getTime() + 5 * DAY),
    paidAt: null,
    waivedAt: null,
    cancelledAt: null,
    reminderSentAt: null,
    expiryNoticeSentAt: null,
    ...overrides,
  };
}

describe("isAwaitingPayment", () => {
  it("is true only for INSTRUCTIONS_SENT and not paid/waived/cancelled", () => {
    expect(isAwaitingPayment(rec())).toBe(true);
    expect(isAwaitingPayment(rec({ status: "PENDING" }))).toBe(false);
    expect(isAwaitingPayment(rec({ status: "PAID" }))).toBe(false);
    expect(isAwaitingPayment(rec({ paidAt: NOW }))).toBe(false);
    expect(isAwaitingPayment(rec({ waivedAt: NOW }))).toBe(false);
    expect(isAwaitingPayment(rec({ cancelledAt: NOW }))).toBe(false);
  });
});

describe("needsReminder", () => {
  it("fires once 24h have passed since instructions, before the deadline", () => {
    expect(needsReminder(rec(), NOW)).toBe(true);
  });

  it("does not fire before 24h have elapsed", () => {
    expect(needsReminder(rec({ instructionsSentAt: new Date(NOW.getTime() - 23 * HOUR) }), NOW)).toBe(false);
  });

  it("does not fire twice (reminderSentAt already set)", () => {
    expect(needsReminder(rec({ reminderSentAt: new Date(NOW.getTime() - HOUR) }), NOW)).toBe(false);
  });

  it("does not fire once the deadline has already passed", () => {
    expect(needsReminder(rec({ dueAt: new Date(NOW.getTime() - HOUR) }), NOW)).toBe(false);
  });

  it("still fires when there is no deadline at all", () => {
    expect(needsReminder(rec({ dueAt: null }), NOW)).toBe(true);
  });

  it("never fires for a paid or non-instructions record", () => {
    expect(needsReminder(rec({ paidAt: NOW }), NOW)).toBe(false);
    expect(needsReminder(rec({ status: "PENDING", instructionsSentAt: null }), NOW)).toBe(false);
  });

  it("uses the configured 24 hour threshold exactly", () => {
    expect(REMINDER_AFTER_HOURS).toBe(24);
    expect(needsReminder(rec({ instructionsSentAt: new Date(NOW.getTime() - 24 * HOUR) }), NOW)).toBe(true);
  });
});

describe("needsExpiryNotice", () => {
  it("fires once the deadline is reached and still unpaid", () => {
    expect(needsExpiryNotice(rec({ dueAt: new Date(NOW.getTime() - HOUR) }), NOW)).toBe(true);
    expect(needsExpiryNotice(rec({ dueAt: NOW }), NOW)).toBe(true);
  });

  it("does not fire before the deadline", () => {
    expect(needsExpiryNotice(rec({ dueAt: new Date(NOW.getTime() + HOUR) }), NOW)).toBe(false);
  });

  it("does not fire twice (expiryNoticeSentAt already set)", () => {
    expect(needsExpiryNotice(rec({ dueAt: new Date(NOW.getTime() - HOUR), expiryNoticeSentAt: NOW }), NOW)).toBe(false);
  });

  it("does not fire when there is no deadline", () => {
    expect(needsExpiryNotice(rec({ dueAt: null }), NOW)).toBe(false);
  });

  it("does not fire once the applicant has paid", () => {
    expect(needsExpiryNotice(rec({ dueAt: new Date(NOW.getTime() - HOUR), paidAt: NOW }), NOW)).toBe(false);
  });
});

describe("reminder and expiry are mutually exclusive in a single run", () => {
  it("past the deadline, only the expiry notice is due", () => {
    const r = rec({ instructionsSentAt: new Date(NOW.getTime() - 10 * DAY), dueAt: new Date(NOW.getTime() - HOUR) });
    expect(needsReminder(r, NOW)).toBe(false);
    expect(needsExpiryNotice(r, NOW)).toBe(true);
  });
});
