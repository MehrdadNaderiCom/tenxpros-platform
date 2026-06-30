/**
 * Single source of truth for payment-safety disclosure copy.
 *
 * TenXPros is the product/program brand; Naprolity OÜ is the legal operating
 * company and Stripe merchant of record / legal payee. These facts, and the
 * customer-safety messaging that surrounds them, must read identically across
 * every public page and every email, so they live here once and are imported
 * everywhere. Pure strings only (no prisma / no network), so this is safe to
 * import from the dependency-free email templates and from server components.
 *
 * The actual payment-link URL is NOT stored here on purpose: it is resolved at
 * runtime from env/DB by `paymentLinkForTier` (see services/payment-link.ts), so
 * no real link is ever committed to the repository.
 */
import { SUPPORT_EMAIL } from "./payment-terms";

export { SUPPORT_EMAIL };

/** Legal operating company / Stripe merchant of record / payee. */
export const LEGAL_OPERATOR = "Naprolity OÜ";
/** Payment processor for card payments. */
export const PAYMENT_PROCESSOR = "Stripe";
/** Public product/program name for the founding window. */
export const OFFICIAL_PRODUCT = "TenXPros Founding Charter";
/** Founding Charter price, formatted for display. */
export const OFFICIAL_PRICE_LABEL = "$997.00 USD";
/** Domain the official Stripe payment link lives on (for recognition, not the full URL). */
export const OFFICIAL_PAYMENT_DOMAIN = "buy.stripe.com";

// A) Payee / processor clarification, appears wherever payment is discussed.
export const PAYEE_NOTICE =
  `TenXPros is operated by ${LEGAL_OPERATOR}. Secure payments are processed by ${PAYMENT_PROCESSOR}. ` +
  `Your ${PAYMENT_PROCESSOR} checkout or card statement may show ${LEGAL_OPERATOR} as the legal payee.`;

// B) Safety warning, never pay an unofficial link.
export const SAFETY_WARNING =
  `For your security, please do not pay any link unless it is sent through an official TenXPros/Naprolity ` +
  `communication channel and matches the official payment details. If you are unsure, contact ${SUPPORT_EMAIL} before paying.`;

// D) Post-application expectation, no payment at submission; official link follows acceptance.
export const POST_APPLICATION_NOTICE =
  `Submitting an application does not require any payment. If your application is accepted, we will email you the ` +
  `official ${PAYMENT_PROCESSOR} payment link and next-step instructions. Please do not pay any unofficial or unexpected payment request.`;

// E) Support fallback, verify anything you are unsure about.
export const SUPPORT_FALLBACK =
  `If you have any questions about payment, enrollment, access, or whether a payment link is legitimate, contact ${SUPPORT_EMAIL}.`;

/**
 * Payee/processor clarification, aware of the resolved payment method. The
 * Founding Charter is paid via Stripe, so an unset or STRIPE method yields the
 * full Stripe wording; manual methods (Wise / invoice / bank transfer) drop the
 * Stripe-specific "card statement" framing but still name Naprolity OÜ as payee.
 */
export function payeeNoticeForMethod(method?: string | null): string {
  const isStripe = !method || method.toUpperCase() === "STRIPE";
  if (isStripe) return PAYEE_NOTICE;
  return (
    `TenXPros is operated by ${LEGAL_OPERATOR}, the legal operating company and payee. ` +
    `Your payment confirmation or statement may show ${LEGAL_OPERATOR} as the payee.`
  );
}
