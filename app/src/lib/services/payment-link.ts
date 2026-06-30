/**
 * Provider-agnostic payment-link resolution.
 *
 * A payment link is just a URL, it can point at Stripe, Wise, or any manual
 * checkout/instructions page. Configuration is resolved in this order:
 *   1. generic   PAYMENT_LINK_<TIER>            (preferred, provider-agnostic)
 *   2. legacy    STRIPE_PAYMENT_LINK_<TIER>     (backward compatible)
 *   3. generic   PAYMENT_LINK_FOUNDING          (fallback tier)
 *   4. legacy    STRIPE_PAYMENT_LINK_FOUNDING   (fallback tier, backward compatible)
 *   5. a safe placeholder string (never a broken/empty link)
 *
 * This changes only how the link is resolved/named. It does not change payment
 * or enrollment logic, and no value is ever hard-coded here.
 */
export function paymentLinkForTier(tier?: string | null): string {
  const t = (tier || "FOUNDING").toUpperCase();
  return (
    process.env[`PAYMENT_LINK_${t}`] ||
    process.env[`STRIPE_PAYMENT_LINK_${t}`] ||
    process.env.PAYMENT_LINK_FOUNDING ||
    process.env.STRIPE_PAYMENT_LINK_FOUNDING ||
    "Manual payment link pending"
  );
}
