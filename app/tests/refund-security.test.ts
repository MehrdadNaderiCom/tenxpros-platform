import { describe, expect, it } from "vitest";
import { refundIdempotencyKey, refundRequestFingerprint } from "../src/lib/partner/refunds";

const request = {
  closedDealId: "deal_1",
  type: "REFUND" as const,
  amountCents: 25_000,
  seatsRefunded: 1,
  sourceReference: "Provider refund rf_123",
  occurredAt: new Date("2026-08-07T00:00:00.000Z"),
  note: "Provider refund rf_123",
};

describe("refund idempotency fingerprints", () => {
  it("is stable for an exact retry after a timeout", () => {
    expect(refundRequestFingerprint(request)).toBe(refundRequestFingerprint({ ...request }));
  });

  it("derives the same deal-scoped key after a page refresh or cosmetic re-entry", () => {
    expect(refundIdempotencyKey("deal_1", " Provider REFUND   rf_123 ")).toBe(
      refundIdempotencyKey("deal_1", "provider refund rf_123"),
    );
    expect(refundIdempotencyKey("deal_1", "provider refund rf_123")).not.toBe(
      refundIdempotencyKey("deal_2", "provider refund rf_123"),
    );
  });

  it("detects reuse of a key with a different financial payload", () => {
    expect(refundRequestFingerprint(request)).not.toBe(
      refundRequestFingerprint({ ...request, amountCents: request.amountCents + 1 }),
    );
    expect(refundRequestFingerprint(request)).not.toBe(
      refundRequestFingerprint({ ...request, seatsRefunded: 2 }),
    );
    expect(refundRequestFingerprint(request)).not.toBe(
      refundRequestFingerprint({ ...request, type: "CHARGEBACK" }),
    );
  });
});
