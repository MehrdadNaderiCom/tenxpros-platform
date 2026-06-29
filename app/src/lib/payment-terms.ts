/**
 * Pure payment-terms resolution + validation. No prisma / no network, so it can
 * be unit-tested in isolation and reused by the admin actions, the acceptance
 * email, and the payments UI.
 *
 * Resolution precedence (most specific wins):
 *   1. per-application override  (PaymentRecord payment* fields)
 *   2. tier default              (PricingTier payment* fields)
 *   3. env fallback              (paymentLinkForTier, link only)
 *   4. safe defaults             (never an empty/broken value)
 *
 * Amounts are integer USD-style minor-unit-free whole numbers (same convention
 * as pricing). This module never hard-codes a price beyond a last-resort default.
 */
import { paymentLinkForTier } from "./services/payment-link";

export const PAYMENT_METHODS = ["WISE", "STRIPE", "MANUAL_INVOICE", "BANK_TRANSFER", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  "PENDING",
  "INSTRUCTIONS_SENT",
  "PAID",
  "WAIVED",
  "FAILED",
  "CANCELLED",
  "REFUNDED",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Locked email identity: support inbox referenced in payment instructions. */
export const SUPPORT_EMAIL = "support@tenxpros.com";

export const DEFAULT_AMOUNT = 997;
export const DEFAULT_CURRENCY = "USD";
export const MAX_AMOUNT = 100000;
export const MAX_DUE_DAYS = 365;
export const MAX_NOTE_LENGTH = 2000;

const METHOD_LABELS: Record<string, string> = {
  WISE: "Wise",
  STRIPE: "Stripe",
  MANUAL_INVOICE: "Manual invoice",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  INSTRUCTIONS_SENT: "Instructions sent",
  PAID: "Paid",
  WAIVED: "Waived",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

/** Human label for a payment method (e.g. "MANUAL_INVOICE" -> "Manual invoice"). */
export function formatPaymentMethod(method?: string | null): string {
  if (!method) return "-";
  return METHOD_LABELS[method] ?? method;
}

/** Human label for a payment status (e.g. "INSTRUCTIONS_SENT" -> "Instructions sent"). */
export function formatPaymentStatus(status?: string | null): string {
  if (!status) return "-";
  return STATUS_LABELS[status] ?? status;
}

// ---------------------------------------------------------------------------
// Resolver
// ---------------------------------------------------------------------------

export type PaymentRecordTerms = {
  amount?: number | null;
  currency?: string | null;
  method?: string | null;
  paymentLink?: string | null;
  paymentInstructions?: string | null;
  dueAt?: Date | null;
  discountNote?: string | null;
  showDiscountNoteToApplicant?: boolean | null;
};

export type TierPaymentDefaults = {
  tier?: string | null;
  price?: number | null;
  paymentCurrency?: string | null;
  paymentMethod?: string | null;
  paymentLink?: string | null;
  paymentInstructions?: string | null;
  paymentDueDays?: number | null;
};

export type ResolvedPaymentTerms = {
  amount: number;
  currency: string;
  method: PaymentMethod | null;
  paymentLink: string;
  paymentInstructions: string | null;
  dueAt: Date | null;
  dueDays: number | null;
  discountNote: string | null;
  showDiscountNoteToApplicant: boolean;
  /** discountNote, but only when the admin marked it visible to the applicant. */
  publicDiscountNote: string | null;
  supportEmail: string;
};

function firstString(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return null;
}

function firstNumber(...values: Array<number | null | undefined>): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function normalizeMethod(method?: string | null): PaymentMethod | null {
  if (!method) return null;
  const upper = method.toUpperCase();
  return (PAYMENT_METHODS as readonly string[]).includes(upper) ? (upper as PaymentMethod) : null;
}

const MS_PER_DAY = 86_400_000;

/**
 * Resolve the effective payment terms from a per-application record, the tier
 * default, and the env fallback. `now` (optional) lets a tier `dueDays` default
 * become a concrete `dueAt`; the record's explicit `dueAt` always wins.
 */
export function resolvePaymentTerms(args: {
  record?: PaymentRecordTerms | null;
  tier?: TierPaymentDefaults | null;
  now?: Date;
}): ResolvedPaymentTerms {
  const record = args.record ?? {};
  const tier = args.tier ?? {};

  const amount = firstNumber(record.amount, tier.price) ?? DEFAULT_AMOUNT;
  const currency = (firstString(record.currency, tier.paymentCurrency) ?? DEFAULT_CURRENCY).toUpperCase();
  const method = normalizeMethod(record.method ?? tier.paymentMethod ?? null);
  // Link precedence: record -> tier -> env (paymentLinkForTier never returns empty).
  const paymentLink = firstString(record.paymentLink, tier.paymentLink) ?? paymentLinkForTier(tier.tier);
  const paymentInstructions = firstString(record.paymentInstructions, tier.paymentInstructions);
  const dueDays = firstNumber(tier.paymentDueDays);

  let dueAt = record.dueAt ?? null;
  if (!dueAt && dueDays != null && args.now) {
    dueAt = new Date(args.now.getTime() + dueDays * MS_PER_DAY);
  }

  const discountNote = firstString(record.discountNote);
  const showDiscountNoteToApplicant = Boolean(record.showDiscountNoteToApplicant);
  const publicDiscountNote = showDiscountNoteToApplicant ? discountNote : null;

  return {
    amount,
    currency,
    method,
    paymentLink,
    paymentInstructions,
    dueAt,
    dueDays,
    discountNote,
    showDiscountNoteToApplicant,
    publicDiscountNote,
    supportEmail: SUPPORT_EMAIL,
  };
}

/**
 * Format a deadline timestamp for applicant-facing emails. Rendered in UTC, the
 * timezone the deadline is stored and enforced in, with the exact date and time
 * so the displayed value matches the persisted dueAt exactly.
 * Example: "Wednesday, 1 July 2026 at 14:30 UTC".
 */
export function formatDeadlineUtc(date: Date): string {
  const datePart = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
  return `${datePart} at ${timePart} UTC`;
}

// ---------------------------------------------------------------------------
// Validators (each throws a clear, user-facing error on bad input)
// ---------------------------------------------------------------------------

/** A FormData-like source. `FormData` satisfies this, as does a plain Map. */
export type FormLike = { get(name: string): unknown };

export function parseAmount(input: unknown): number {
  const amount = Number(input);
  if (!Number.isInteger(amount) || amount <= 0 || amount >= MAX_AMOUNT) {
    throw new Error(`Amount must be a positive whole number under ${MAX_AMOUNT}.`);
  }
  return amount;
}

export function parseCurrency(input: unknown): string {
  const raw = String(input ?? "").trim().toUpperCase();
  if (!raw) return DEFAULT_CURRENCY;
  if (!/^[A-Z]{3}$/.test(raw)) throw new Error("Currency must be a 3-letter ISO code, e.g. USD.");
  return raw;
}

export function parsePaymentMethod(input: unknown): PaymentMethod | null {
  const raw = String(input ?? "").trim().toUpperCase();
  if (!raw) return null;
  if (!(PAYMENT_METHODS as readonly string[]).includes(raw)) {
    throw new Error(`Unknown payment method: ${raw}.`);
  }
  return raw as PaymentMethod;
}

export function parseOptionalUrl(input: unknown): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Payment link must be a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Payment link must be an http(s) URL.");
  }
  return raw;
}

export function parseDueDays(input: unknown): number | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const days = Number(raw);
  if (!Number.isInteger(days) || days <= 0 || days > MAX_DUE_DAYS) {
    throw new Error(`Due days must be a whole number between 1 and ${MAX_DUE_DAYS}.`);
  }
  return days;
}

export function parseDueDate(input: unknown, now?: Date): Date | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error("Due date is not a valid date.");
  if (now) {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (date.getTime() < startOfToday) throw new Error("Due date cannot be in the past.");
  }
  return date;
}

export function parseNote(input: unknown, label = "Note"): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  if (raw.length > MAX_NOTE_LENGTH) {
    throw new Error(`${label} must be under ${MAX_NOTE_LENGTH} characters.`);
  }
  return raw;
}

function parseBool(input: unknown): boolean {
  return input === "on" || input === "true" || input === true || input === "1" || input === 1;
}

/** Validate the per-tier default payment terms (does not touch price/capacity). */
export function parseTierPaymentDefaults(form: FormLike): {
  paymentMethod: PaymentMethod | null;
  paymentCurrency: string;
  paymentLink: string | null;
  paymentInstructions: string | null;
  paymentDueDays: number | null;
} {
  return {
    paymentMethod: parsePaymentMethod(form.get("paymentMethod")),
    paymentCurrency: parseCurrency(form.get("paymentCurrency")),
    paymentLink: parseOptionalUrl(form.get("paymentLink")),
    paymentInstructions: parseNote(form.get("paymentInstructions"), "Payment instructions"),
    paymentDueDays: parseDueDays(form.get("paymentDueDays")),
  };
}

/** Validate the per-application payment override saved onto a PaymentRecord. */
export function parseApplicationPaymentOverride(
  form: FormLike,
  now?: Date,
): {
  amount: number;
  currency: string;
  method: PaymentMethod | null;
  paymentLink: string | null;
  paymentInstructions: string | null;
  dueAt: Date | null;
  discountNote: string | null;
  showDiscountNoteToApplicant: boolean;
  internalNote: string | null;
} {
  return {
    amount: parseAmount(form.get("amount")),
    currency: parseCurrency(form.get("currency")),
    method: parsePaymentMethod(form.get("method")),
    paymentLink: parseOptionalUrl(form.get("paymentLink")),
    paymentInstructions: parseNote(form.get("paymentInstructions"), "Payment instructions"),
    dueAt: parseDueDate(form.get("dueAt"), now),
    discountNote: parseNote(form.get("discountNote"), "Discount note"),
    showDiscountNoteToApplicant: parseBool(form.get("showDiscountNoteToApplicant")),
    internalNote: parseNote(form.get("internalNote"), "Internal note"),
  };
}

// ---------------------------------------------------------------------------
// Status transitions
// ---------------------------------------------------------------------------

/**
 * Allowed manual payment-status transitions. Terminal states (WAIVED/REFUNDED)
 * have no exits; a stuck FAILED/CANCELLED payment can be reopened to PENDING.
 * Enrolling (PAID) is driven by the enrollment action, not arbitrary edits.
 */
export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ["INSTRUCTIONS_SENT", "PAID", "WAIVED", "FAILED", "CANCELLED"],
  INSTRUCTIONS_SENT: ["PAID", "WAIVED", "FAILED", "CANCELLED"],
  PAID: ["REFUNDED"],
  WAIVED: [],
  FAILED: ["PENDING", "INSTRUCTIONS_SENT", "CANCELLED"],
  CANCELLED: ["PENDING"],
  REFUNDED: [],
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return true;
  return (PAYMENT_TRANSITIONS[from] ?? []).includes(to);
}

export function assertPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransitionPayment(from, to)) {
    throw new Error(`Cannot change payment status from ${from} to ${to}.`);
  }
}
