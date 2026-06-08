import { afterEach, describe, expect, it } from "vitest";
import { paymentLinkForTier } from "../src/lib/services/payment-link";

const KEYS = [
  "PAYMENT_LINK_FOUNDING",
  "PAYMENT_LINK_EARLY",
  "STRIPE_PAYMENT_LINK_FOUNDING",
  "STRIPE_PAYMENT_LINK_EARLY",
];

afterEach(() => {
  for (const k of KEYS) delete process.env[k];
});

describe("paymentLinkForTier (provider-agnostic)", () => {
  it("returns a safe placeholder when nothing is configured", () => {
    expect(paymentLinkForTier("FOUNDING")).toBe("Manual payment link pending");
    expect(paymentLinkForTier()).toBe("Manual payment link pending");
  });

  it("uses the generic PAYMENT_LINK_<tier> key (works for Wise/manual/Stripe URLs)", () => {
    process.env.PAYMENT_LINK_FOUNDING = "https://wise.example/founding";
    expect(paymentLinkForTier("FOUNDING")).toBe("https://wise.example/founding");
  });

  it("stays backward compatible with the legacy STRIPE_PAYMENT_LINK_<tier> key", () => {
    process.env.STRIPE_PAYMENT_LINK_EARLY = "https://pay.example/early";
    expect(paymentLinkForTier("EARLY")).toBe("https://pay.example/early");
  });

  it("prefers the generic key over the legacy Stripe key", () => {
    process.env.PAYMENT_LINK_FOUNDING = "https://wise.example/f";
    process.env.STRIPE_PAYMENT_LINK_FOUNDING = "https://stripe.example/f";
    expect(paymentLinkForTier("FOUNDING")).toBe("https://wise.example/f");
  });

  it("falls back to the FOUNDING link for an unconfigured tier", () => {
    process.env.PAYMENT_LINK_FOUNDING = "https://wise.example/founding";
    expect(paymentLinkForTier("STANDARD")).toBe("https://wise.example/founding");
  });
});
