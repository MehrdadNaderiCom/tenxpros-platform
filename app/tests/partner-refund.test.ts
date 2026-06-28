import { describe, expect, it } from "vitest";
import { proportionalReversalCents } from "../src/lib/partner/commission";

/**
 * The refund action reverses commission CUMULATIVELY and IDEMPOTENTLY: each
 * line's reversedCents is recomputed as its proportional share of the total
 * refunded-to-date. These tests cover that math directly (the action just
 * persists `reversedCents = reversedFor(line, cumulativeRefunded)`).
 */
const NET = 2_000_000; // deal net receipts (minor units)
const reversedFor = (amount: number, cumulativeRefunded: number) =>
  proportionalReversalCents(amount, Math.min(cumulativeRefunded, NET), NET);

describe("cumulative refund reversal is correct and idempotent", () => {
  const amount = 240_000; // one commission line

  it("reverses in proportion to the cumulative refund", () => {
    expect(reversedFor(amount, 0)).toBe(0);
    expect(reversedFor(amount, 500_000)).toBe(60_000); // 25% refunded
    expect(reversedFor(amount, 1_000_000)).toBe(120_000); // 50% refunded
    expect(reversedFor(amount, NET)).toBe(amount); // full refund -> fully reversed
  });

  it("two successive partial refunds equal one combined refund (no under/over-reversal)", () => {
    // 25% then another 25% -> cumulative 50%
    const afterFirst = reversedFor(amount, 500_000);
    const afterSecond = reversedFor(amount, 500_000 + 500_000);
    const single = reversedFor(amount, 1_000_000);
    expect(afterFirst).toBe(60_000);
    expect(afterSecond).toBe(120_000);
    expect(afterSecond).toBe(single);
  });

  it("re-applying the same cumulative refund changes nothing (idempotent)", () => {
    const once = reversedFor(amount, 1_000_000);
    const twice = reversedFor(amount, 1_000_000);
    expect(twice).toBe(once);
  });

  it("never reverses more than the line amount, and net stays non-negative", () => {
    for (const cum of [0, 250_000, 1_000_000, 1_999_999, NET, NET * 2]) {
      const reversed = reversedFor(amount, cum);
      expect(reversed).toBeLessThanOrEqual(amount);
      expect(amount - reversed).toBeGreaterThanOrEqual(0);
    }
  });

  it("reverses each line proportionally and consistently across the deal", () => {
    const lines = [240_000, 200_000, 50_000];
    const cumulative = 1_000_000; // 50% refunded
    const reversed = lines.map((l) => reversedFor(l, cumulative));
    expect(reversed).toEqual([120_000, 100_000, 25_000]);
    // Total reversed is 50% of total commission (within cent rounding).
    const totalCommission = lines.reduce((s, l) => s + l, 0);
    const totalReversed = reversed.reduce((s, r) => s + r, 0);
    expect(totalReversed).toBe(Math.round(totalCommission * 0.5));
  });
});
