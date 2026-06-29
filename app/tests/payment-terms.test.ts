import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertPaymentTransition,
  canTransitionPayment,
  formatPaymentMethod,
  formatPaymentStatus,
  parseAmount,
  parseApplicationPaymentOverride,
  parseCurrency,
  parseDueDate,
  parseDueDays,
  parseNote,
  parseOptionalUrl,
  parsePaymentMethod,
  parseTierPaymentDefaults,
  resolvePaymentTerms,
} from "../src/lib/payment-terms";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const ENV_KEYS = ["PAYMENT_LINK_FOUNDING", "PAYMENT_LINK_EARLY", "STRIPE_PAYMENT_LINK_FOUNDING"];
afterEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
});

describe("resolvePaymentTerms: precedence", () => {
  const tier = {
    tier: "EARLY",
    price: 1247,
    paymentCurrency: "EUR",
    paymentMethod: "BANK_TRANSFER",
    paymentLink: "https://tier.example/early",
    paymentInstructions: "Tier-default instructions.",
    paymentDueDays: 7,
  };

  it("per-application override beats tier default", () => {
    const terms = resolvePaymentTerms({
      record: {
        amount: 800,
        currency: "usd",
        method: "WISE",
        paymentLink: "https://record.example/pay",
        paymentInstructions: "Record instructions.",
      },
      tier,
    });
    expect(terms.amount).toBe(800);
    expect(terms.currency).toBe("USD"); // normalized to upper-case
    expect(terms.method).toBe("WISE");
    expect(terms.paymentLink).toBe("https://record.example/pay");
    expect(terms.paymentInstructions).toBe("Record instructions.");
  });

  it("falls back to tier default when the record has no override", () => {
    const terms = resolvePaymentTerms({ record: {}, tier });
    expect(terms.amount).toBe(1247);
    expect(terms.currency).toBe("EUR");
    expect(terms.method).toBe("BANK_TRANSFER");
    expect(terms.paymentLink).toBe("https://tier.example/early");
    expect(terms.paymentInstructions).toBe("Tier-default instructions.");
  });

  it("falls back to the env payment link when neither record nor tier set one", () => {
    process.env.PAYMENT_LINK_FOUNDING = "https://env.example/founding";
    const terms = resolvePaymentTerms({ record: {}, tier: { tier: "FOUNDING", price: 997 } });
    expect(terms.paymentLink).toBe("https://env.example/founding");
  });

  it("uses safe defaults (placeholder link, 997, USD) when nothing is configured", () => {
    const terms = resolvePaymentTerms({});
    expect(terms.amount).toBe(997);
    expect(terms.currency).toBe("USD");
    expect(terms.method).toBeNull();
    expect(terms.paymentLink).toBe("Manual payment link pending");
    expect(terms.supportEmail).toBe("support@tenxpros.com");
  });

  it("computes dueAt from tier dueDays + now, but the record's dueAt wins", () => {
    const now = new Date("2026-06-09T00:00:00.000Z");
    const fromTier = resolvePaymentTerms({ record: {}, tier, now });
    expect(fromTier.dueAt?.toISOString()).toBe("2026-06-16T00:00:00.000Z"); // +7 days
    expect(fromTier.dueDays).toBe(7);

    const explicit = new Date("2026-07-01T00:00:00.000Z");
    const fromRecord = resolvePaymentTerms({ record: { dueAt: explicit }, tier, now });
    expect(fromRecord.dueAt?.toISOString()).toBe(explicit.toISOString());
  });

  it("drops an unknown method to null", () => {
    expect(resolvePaymentTerms({ record: { method: "PAYPAL" } }).method).toBeNull();
  });
});

describe("resolvePaymentTerms: discount note visibility", () => {
  it("hides the discount note from the applicant by default", () => {
    const terms = resolvePaymentTerms({ record: { discountNote: "Founder friend 20% off" } });
    expect(terms.discountNote).toBe("Founder friend 20% off"); // internal value retained
    expect(terms.showDiscountNoteToApplicant).toBe(false);
    expect(terms.publicDiscountNote).toBeNull(); // never shown unless explicitly enabled
  });

  it("exposes the discount note only when explicitly marked public", () => {
    const terms = resolvePaymentTerms({
      record: { discountNote: "Cohort scholarship", showDiscountNoteToApplicant: true },
    });
    expect(terms.publicDiscountNote).toBe("Cohort scholarship");
  });
});

describe("validators", () => {
  it("parseAmount accepts positive integers and rejects junk", () => {
    expect(parseAmount("997")).toBe(997);
    expect(() => parseAmount("0")).toThrow();
    expect(() => parseAmount("-5")).toThrow();
    expect(() => parseAmount("9.5")).toThrow();
    expect(() => parseAmount("abc")).toThrow();
    expect(() => parseAmount("100000")).toThrow();
  });

  it("parseCurrency defaults to USD, upper-cases, and rejects non-ISO", () => {
    expect(parseCurrency("")).toBe("USD");
    expect(parseCurrency("usd")).toBe("USD");
    expect(parseCurrency("eur")).toBe("EUR");
    expect(() => parseCurrency("US")).toThrow();
    expect(() => parseCurrency("DOLLAR")).toThrow();
  });

  it("parsePaymentMethod validates against the enum", () => {
    expect(parsePaymentMethod("wise")).toBe("WISE");
    expect(parsePaymentMethod("")).toBeNull();
    expect(() => parsePaymentMethod("paypal")).toThrow();
  });

  it("parseOptionalUrl requires http(s) or empty", () => {
    expect(parseOptionalUrl("")).toBeNull();
    expect(parseOptionalUrl("https://pay.example/x")).toBe("https://pay.example/x");
    expect(() => parseOptionalUrl("ftp://pay.example/x")).toThrow();
    expect(() => parseOptionalUrl("not a url")).toThrow();
  });

  it("parseDueDays accepts 1..365 integers or empty", () => {
    expect(parseDueDays("")).toBeNull();
    expect(parseDueDays("7")).toBe(7);
    expect(() => parseDueDays("0")).toThrow();
    expect(() => parseDueDays("400")).toThrow();
    expect(() => parseDueDays("3.5")).toThrow();
  });

  it("parseDueDate rejects invalid and past dates relative to now", () => {
    const now = new Date("2026-06-09T12:00:00.000Z");
    expect(parseDueDate("", now)).toBeNull();
    expect(parseDueDate("2026-07-01", now)?.toISOString().slice(0, 10)).toBe("2026-07-01");
    expect(() => parseDueDate("2020-01-01", now)).toThrow();
    expect(() => parseDueDate("not-a-date", now)).toThrow();
  });

  it("parseNote trims, returns null for empty, and rejects overlong text", () => {
    expect(parseNote("  ")).toBeNull();
    expect(parseNote("  hi  ")).toBe("hi");
    expect(() => parseNote("x".repeat(2001), "Note")).toThrow();
  });

  it("parseTierPaymentDefaults reads a form-like source", () => {
    const form = new Map<string, string>([
      ["paymentMethod", "wise"],
      ["paymentCurrency", "usd"],
      ["paymentLink", "https://pay.example/f"],
      ["paymentInstructions", "Send via Wise."],
      ["paymentDueDays", "7"],
    ]);
    expect(parseTierPaymentDefaults(form)).toEqual({
      paymentMethod: "WISE",
      paymentCurrency: "USD",
      paymentLink: "https://pay.example/f",
      paymentInstructions: "Send via Wise.",
      paymentDueDays: 7,
    });
  });

  it("parseApplicationPaymentOverride reads the per-application form", () => {
    const now = new Date("2026-06-09T00:00:00.000Z");
    const form = new Map<string, string>([
      ["amount", "800"],
      ["currency", "eur"],
      ["method", "bank_transfer"],
      ["paymentLink", "https://pay.example/a"],
      ["paymentInstructions", "IBAN below."],
      ["dueAt", "2026-07-01"],
      ["discountNote", "Scholarship"],
      ["showDiscountNoteToApplicant", "on"],
      ["internalNote", "Approved by founder."],
    ]);
    const parsed = parseApplicationPaymentOverride(form, now);
    expect(parsed.amount).toBe(800);
    expect(parsed.currency).toBe("EUR");
    expect(parsed.method).toBe("BANK_TRANSFER");
    expect(parsed.showDiscountNoteToApplicant).toBe(true);
    expect(parsed.internalNote).toBe("Approved by founder.");
  });
});

describe("formatters", () => {
  it("formats methods and statuses", () => {
    expect(formatPaymentMethod("MANUAL_INVOICE")).toBe("Manual invoice");
    expect(formatPaymentMethod(null)).toBe("-");
    expect(formatPaymentStatus("INSTRUCTIONS_SENT")).toBe("Instructions sent");
  });
});

describe("payment status transitions", () => {
  it("allows the manual operational flow", () => {
    expect(canTransitionPayment("PENDING", "INSTRUCTIONS_SENT")).toBe(true);
    expect(canTransitionPayment("PENDING", "PAID")).toBe(true);
    expect(canTransitionPayment("PENDING", "WAIVED")).toBe(true);
    expect(canTransitionPayment("INSTRUCTIONS_SENT", "PAID")).toBe(true);
    expect(canTransitionPayment("FAILED", "PENDING")).toBe(true);
  });

  it("blocks illegal transitions out of terminal states", () => {
    expect(canTransitionPayment("WAIVED", "PAID")).toBe(false);
    expect(canTransitionPayment("PAID", "PENDING")).toBe(false);
    expect(() => assertPaymentTransition("WAIVED", "PENDING")).toThrow();
  });

  it("treats a no-op transition as allowed", () => {
    expect(canTransitionPayment("PENDING", "PENDING")).toBe(true);
  });
});

describe("payment actions wiring (source regression)", () => {
  const adminSrc = read("src/lib/actions/admin.ts");
  const appSrc = read("src/lib/actions/applications.ts");

  it("updatePricingTierPaymentTerms requires admin, validates, audits, and revalidates", () => {
    const start = adminSrc.indexOf("export async function updatePricingTierPaymentTerms");
    expect(start).toBeGreaterThan(-1);
    const body = adminSrc.slice(start, start + 1400);
    expect(body).toContain("requireAdmin()");
    expect(body).toContain("parseTierPaymentDefaults");
    expect(body).toContain("auditLog.create");
    expect(body).toContain('safeRevalidatePath("/pricing")');
  });

  it("acceptance email resolves terms and routes through the shared sender", () => {
    expect(appSrc).toContain("resolvePaymentTerms");
    expect(appSrc).toContain("sendPaymentInstructionsEmail");
    expect(appSrc).toContain("terms.supportEmail");
    // sender stays hello@ via the email service default; the legacy direct
    // env-link call is gone (the resolver owns link fallback now).
    expect(appSrc).not.toContain("paymentLinkForTier(");
  });

  it("per-application payment terms action requires admin, validates, audits, and does not email", () => {
    const start = appSrc.indexOf("export async function upsertApplicationPaymentTerms");
    expect(start).toBeGreaterThan(-1);
    const body = appSrc.slice(start, start + 2200);
    expect(body).toContain("requireAdminUser()");
    expect(body).toContain("parseApplicationPaymentOverride");
    expect(body).toContain("auditLog.create");
    expect(body).not.toContain("safeSendEmail");
  });

  it("payment status transitions are guarded and audited", () => {
    const start = appSrc.indexOf("async function transitionPaymentStatus");
    expect(start).toBeGreaterThan(-1);
    const body = appSrc.slice(start, start + 1200);
    expect(body).toContain("requireAdminUser()");
    expect(body).toContain("assertPaymentTransition");
    expect(body).toContain("PAYMENT_STATUS_CHANGE");
  });
});
