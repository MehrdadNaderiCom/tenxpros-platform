import { describe, expect, it } from "vitest";
import { PROGRAM_CONFIG_DEFAULTS, mergeConfig, type EffectiveConfig } from "../src/lib/partner/config";
import {
  bpToCents,
  capBpForDeal,
  centsToBp,
  closingRateBp,
  computeDealCommission,
  convertCents,
  countableSeats,
  deliveryRateBp,
  deriveFunctionRate,
  focusBonusBp,
  focusBonusRecomputeAction,
  growthBonusBp,
  openerOriginationRateBp,
  originationOpener,
  originationOverrideBp,
  originationRateBp,
  proportionalReversalCents,
} from "../src/lib/partner/commission";

const cfg: EffectiveConfig = PROGRAM_CONFIG_DEFAULTS;
const USD_20K = 2_000_000; // $20,000 in cents

describe("bp <-> cents", () => {
  it("applies basis points to a cents base, rounded", () => {
    expect(bpToCents(USD_20K, 800)).toBe(160_000); // 8% of $20,000 = $1,600
    expect(bpToCents(USD_20K, 1200)).toBe(240_000); // 12% = $2,400
    expect(bpToCents(120_000, 833)).toBe(Math.round((120_000 * 833) / 10_000));
  });
  it("derives implied bp for a flat amount", () => {
    expect(centsToBp(160_000, USD_20K)).toBe(800);
    expect(centsToBp(100, 0)).toBe(0);
  });
});

describe("origination rate (incl. B2C strong seat gate)", () => {
  it("B2B uses the B2B rates, strong always available", () => {
    expect(originationRateBp({ strength: "QUALIFIED", dealKind: "B2B" }, cfg)).toBe(800);
    expect(originationRateBp({ strength: "STRONG", dealKind: "B2B" }, cfg)).toBe(1200);
  });
  it("B2C strong unlocks only after the seat threshold or by panel", () => {
    // below threshold, no panel -> falls back to qualified B2C (10%)
    expect(
      originationRateBp({ strength: "STRONG", dealKind: "B2C", seatsTowardStrongUnlock: 10 }, cfg),
    ).toBe(1000);
    // at/above threshold -> strong B2C (15%)
    expect(
      originationRateBp({ strength: "STRONG", dealKind: "B2C", seatsTowardStrongUnlock: 40 }, cfg),
    ).toBe(1500);
    // panel unlock overrides the seat gate
    expect(
      originationRateBp({ strength: "STRONG", dealKind: "B2C", seatsTowardStrongUnlock: 0, strongUnlockedByPanel: true }, cfg),
    ).toBe(1500);
    // qualified B2C is always 10%
    expect(originationRateBp({ strength: "QUALIFIED", dealKind: "B2C" }, cfg)).toBe(1000);
  });
});

describe("closing / delivery rates", () => {
  it("closing differs by deal kind", () => {
    expect(closingRateBp("B2C", cfg)).toBe(500);
    expect(closingRateBp("B2B", cfg)).toBe(1000);
  });
  it("delivery percent clamps to the configured band; fixed-fee mode yields 0 percent", () => {
    expect(deliveryRateBp(cfg, 600)).toBe(600);
    expect(deliveryRateBp(cfg, 200)).toBe(500); // clamp up to min
    expect(deliveryRateBp(cfg, 9999)).toBe(800); // clamp down to max
    const fixed = mergeConfig(cfg, { deliveryMode: "FIXED_FEE" });
    expect(deliveryRateBp(fixed, 700)).toBe(0);
  });
});

describe("computeDealCommission — the Schedule F worked example", () => {
  it("strong origination 12% + closing 10% on a $20k B2B deal = $4,400, under the 30% cap", () => {
    const r = computeDealCommission({
      netReceiptsCents: USD_20K,
      dealKind: "B2B",
      config: cfg,
      functions: [
        { function: "STRONG_ORIGINATION", rateBp: 1200 },
        { function: "CLOSING", rateBp: 1000 },
      ],
    });
    expect(r.totalCents).toBe(440_000); // $4,400
    expect(r.capped).toBe(false);
    expect(r.capCents).toBe(600_000); // 30% cap
    expect(r.entries.map((e) => e.amountCents)).toEqual([240_000, 200_000]);
  });
});

describe("computeDealCommission — cap is an absolute ceiling", () => {
  it("a full function stack exactly at 30% is not clamped", () => {
    const r = computeDealCommission({
      netReceiptsCents: USD_20K,
      dealKind: "B2B",
      config: cfg,
      functions: [
        { function: "STRONG_ORIGINATION", rateBp: 1200 },
        { function: "CLOSING", rateBp: 1000 },
        { function: "DELIVERY", rateBp: 800 },
      ],
    });
    expect(r.rawTotalCents).toBe(600_000);
    expect(r.totalCents).toBe(600_000);
    expect(r.capped).toBe(false);
  });

  it("anything above the cap is scaled down to exactly the cap (cents-exact)", () => {
    const r = computeDealCommission({
      netReceiptsCents: USD_20K,
      dealKind: "B2B",
      config: cfg,
      functions: [
        { function: "STRONG_ORIGINATION", rateBp: 1200 },
        { function: "CLOSING", rateBp: 1000 },
        { function: "DELIVERY", rateBp: 800 },
        { function: "OVERRIDE", rateBp: 600 },
      ],
    });
    expect(r.rawTotalCents).toBe(720_000);
    expect(r.capped).toBe(true);
    expect(r.totalCents).toBe(600_000);
    // entries sum to the cap exactly
    expect(r.entries.reduce((s, e) => s + e.amountCents, 0)).toBe(600_000);
  });

  it("Tier-3 focus accounts may exceed the base cap up to the 35% ceiling, never higher", () => {
    expect(capBpForDeal({ dealKind: "B2B" }, cfg)).toBe(3000);
    expect(capBpForDeal({ dealKind: "B2B", focusActive: true }, cfg)).toBe(3500);
    const r = computeDealCommission({
      netReceiptsCents: USD_20K,
      dealKind: "B2B",
      focusActive: true,
      config: cfg,
      functions: [
        { function: "STRONG_ORIGINATION", rateBp: 1200 },
        { function: "CLOSING", rateBp: 1000 },
        { function: "DELIVERY", rateBp: 800 },
        { function: "FOCUS_BONUS", rateBp: 700 }, // 37% raw -> clamps to 35%
      ],
    });
    expect(r.capCents).toBe(700_000); // 35%
    expect(r.totalCents).toBe(700_000);
    expect(r.capped).toBe(true);
  });
});

describe("computeDealCommission — multi-partner stacking", () => {
  it("the cap applies across all partners on one deal", () => {
    const r = computeDealCommission({
      netReceiptsCents: USD_20K,
      dealKind: "B2B",
      config: cfg,
      functions: [
        { function: "STRONG_ORIGINATION", rateBp: 1200, partnerId: "A" },
        { function: "CLOSING", rateBp: 1000, partnerId: "B" },
        { function: "DELIVERY", rateBp: 800, partnerId: "C" },
        { function: "GROWTH_BONUS", rateBp: 100, partnerId: "A" },
      ],
    });
    // raw 3100bp > 3000 cap -> clamp; each partner's share scaled
    expect(r.capped).toBe(true);
    expect(r.totalCents).toBe(600_000);
    expect(r.entries.reduce((s, e) => s + e.amountCents, 0)).toBe(600_000);
  });

  it("supports a fixed delivery fee that still counts toward the cap", () => {
    const r = computeDealCommission({
      netReceiptsCents: USD_20K,
      dealKind: "B2B",
      config: cfg,
      functions: [
        { function: "STRONG_ORIGINATION", rateBp: 1200 },
        { function: "DELIVERY", flatCents: 50_000 }, // fixed $500 fee
      ],
    });
    expect(r.entries[1].amountCents).toBe(50_000);
    expect(r.entries[1].rateBp).toBe(centsToBp(50_000, USD_20K));
    expect(r.totalCents).toBe(290_000);
    expect(r.capped).toBe(false);
  });
});

describe("origination override (renewal tail)", () => {
  it("is 50% of the opening rate inside the window with active status", () => {
    expect(originationOverrideBp({ openRateBp: 1200, withinWindow: true, activeStatus: true }, cfg)).toBe(600);
    expect(originationOverrideBp({ openRateBp: 800, withinWindow: true, activeStatus: true }, cfg)).toBe(400);
  });
  it("is zero after the window OR when the partner is not active (vested trail still stays elsewhere)", () => {
    expect(originationOverrideBp({ openRateBp: 1200, withinWindow: false, activeStatus: true }, cfg)).toBe(0);
    expect(originationOverrideBp({ openRateBp: 1200, withinWindow: true, activeStatus: false }, cfg)).toBe(0);
  });
});

describe("renewal OVERRIDE opener rate (originationRateBpAtOpen source)", () => {
  const jan = new Date("2026-01-01T00:00:00Z");
  const mar = new Date("2026-03-01T00:00:00Z");

  it("a renewal on an account opened at the qualified rate trails a share of that qualified rate", () => {
    const openRate = openerOriginationRateBp([
      { signedAt: jan, originationRateBps: [cfg.qualifiedOriginationB2bBp] }, // opener at 8%
    ]);
    expect(openRate).toBe(cfg.qualifiedOriginationB2bBp);
    // The OVERRIDE line then pays overrideShareBp (config, 50%) of the opener rate.
    const overrideBp = originationOverrideBp({ openRateBp: openRate!, withinWindow: true, activeStatus: true }, cfg);
    expect(overrideBp).toBe(Math.round((cfg.qualifiedOriginationB2bBp * cfg.overrideShareBp) / 10000));
    expect(
      deriveFunctionRate("OVERRIDE", { dealKind: "B2B", cfg, openRateBp: openRate!, withinOriginationWindow: true, activeStatus: true }),
    ).toEqual({ kind: "PERCENT", rateBp: overrideBp });
  });

  it("a renewal on an account opened at the strong rate uses the strong rate", () => {
    const openRate = openerOriginationRateBp([
      { signedAt: jan, originationRateBps: [cfg.strongOriginationB2bBp] }, // opener at 12%
    ]);
    expect(openRate).toBe(cfg.strongOriginationB2bBp);
    expect(originationOverrideBp({ openRateBp: openRate!, withinWindow: true, activeStatus: true }, cfg)).toBe(
      Math.round((cfg.strongOriginationB2bBp * cfg.overrideShareBp) / 10000),
    );
  });

  it("the opener deal itself never trails an override (no earlier origination deal exists)", () => {
    // When the opener is recorded, the account has no prior deal with an origination line.
    expect(openerOriginationRateBp([])).toBeNull();
    expect(openerOriginationRateBp([{ signedAt: jan, originationRateBps: [] }])).toBeNull();
    // A null open rate feeds openRateBp 0 -> derived OVERRIDE rate is 0 -> the line is refused.
    expect(
      deriveFunctionRate("OVERRIDE", { dealKind: "B2B", cfg, openRateBp: 0, withinOriginationWindow: true, activeStatus: true }),
    ).toEqual({ kind: "PERCENT", rateBp: 0 });
  });

  it("an account whose opener has no origination line still refuses OVERRIDE", () => {
    // Opened via only an introduction or a closing: no origination rate to trail.
    const openRate = openerOriginationRateBp([
      { signedAt: jan, originationRateBps: [] },
      { signedAt: mar, originationRateBps: [] },
    ]);
    expect(openRate).toBeNull();
    expect(originationOverrideBp({ openRateBp: openRate ?? 0, withinWindow: true, activeStatus: true }, cfg)).toBe(0);
  });

  it("with more than one origination deal, the earliest by signedAt is the opener", () => {
    const openRate = openerOriginationRateBp([
      { signedAt: mar, originationRateBps: [cfg.strongOriginationB2bBp] }, // later deal
      { signedAt: jan, originationRateBps: [cfg.qualifiedOriginationB2bBp] }, // earliest -> the opener
    ]);
    expect(openRate).toBe(cfg.qualifiedOriginationB2bBp);
  });

  it("returns the OPENER's signedAt so the override window anchors to the account opening, not the renewal", () => {
    // The window must be measured from the opening (jan), never from a later
    // renewal, otherwise the override would never expire per account.
    const opener = originationOpener([
      { signedAt: mar, originationRateBps: [cfg.strongOriginationB2bBp] }, // later renewal
      { signedAt: jan, originationRateBps: [cfg.qualifiedOriginationB2bBp] }, // the opening
    ]);
    expect(opener).not.toBeNull();
    expect(opener!.rateBp).toBe(cfg.qualifiedOriginationB2bBp);
    expect(opener!.signedAt).toBe(jan); // recordClosedDeal anchors originationWindowStart to this
  });

  it("originationOpener returns null (no window/rate anchor) when no deal carries an origination line", () => {
    expect(originationOpener([])).toBeNull();
    expect(originationOpener([{ signedAt: jan, originationRateBps: [] }])).toBeNull();
  });

  it("the OVERRIDE line is still clamped by the per-deal cap like any other line", () => {
    // Opener qualified B2B (8%) -> override 4% (50%). On a renewal that already
    // stacks strong 12% + closing 10% + delivery 8% = the full 30% cap, the 4%
    // override pushes the raw total above the cap and must clamp back to it.
    const openRate = openerOriginationRateBp([{ signedAt: jan, originationRateBps: [cfg.qualifiedOriginationB2bBp] }])!;
    const overrideBp = originationOverrideBp({ openRateBp: openRate, withinWindow: true, activeStatus: true }, cfg);
    const r = computeDealCommission({
      netReceiptsCents: USD_20K,
      dealKind: "B2B",
      config: cfg,
      functions: [
        { function: "STRONG_ORIGINATION", rateBp: cfg.strongOriginationB2bBp },
        { function: "CLOSING", rateBp: cfg.closingB2bBp },
        { function: "DELIVERY", rateBp: cfg.deliveryPercentMaxBp },
        { function: "OVERRIDE", rateBp: overrideBp },
      ],
    });
    expect(r.rawTotalCents).toBeGreaterThan(r.capCents);
    expect(r.capped).toBe(true);
    expect(r.totalCents).toBe(r.capCents); // clamped to the 30% cap, override included
  });
});

describe("tier-3 focus bonus stepping & ceiling", () => {
  it("starts at 1% and steps up 1% per continuously-held year", () => {
    expect(focusBonusBp(0, cfg)).toBe(0); // no active focus
    expect(focusBonusBp(1, cfg)).toBe(100);
    expect(focusBonusBp(2, cfg)).toBe(200);
    expect(focusBonusBp(3, cfg)).toBe(300);
  });
  it("never exceeds the configured ceiling", () => {
    expect(focusBonusBp(50, cfg)).toBe(cfg.focusBonusCeilingBp);
  });
  it("resets to the start value after a lapse (caller passes yearsHeld=1)", () => {
    expect(focusBonusBp(1, cfg)).toBe(100);
  });
});

describe("focus bonus recompute action (no duplicate; a paid line is never re-scaled)", () => {
  it("creates the focus bonus when none exists and the bonus is positive", () => {
    expect(focusBonusRecomputeAction(100, null)).toBe("create");
  });
  it("does nothing when there is no line and no bonus", () => {
    expect(focusBonusRecomputeAction(0, null)).toBe("skip");
  });
  it("re-scales a still-open (ACCRUED or PAYABLE) focus bonus", () => {
    expect(focusBonusRecomputeAction(200, "ACCRUED")).toBe("update");
    expect(focusBonusRecomputeAction(200, "PAYABLE")).toBe("update");
  });
  it("pay-then-recompute: a PAID focus bonus is never mutated and never duplicated", () => {
    // The finding-1 fix: once a focus bonus is PAID, a later recompute must not
    // create a second one and must not re-scale the paid line.
    expect(focusBonusRecomputeAction(300, "PAID")).toBe("skip");
    expect(focusBonusRecomputeAction(999, "PAID")).toBe("skip"); // even if the bonus recomputes differently
  });
  it("a zero bonus leaves an open line as-is (unchanged prior behavior)", () => {
    expect(focusBonusRecomputeAction(0, "ACCRUED")).toBe("skip");
  });
});

describe("growth bonus", () => {
  it("applies to Tier 2/3 at/above the org threshold only", () => {
    expect(growthBonusBp(3, "TIER2", cfg)).toBe(100);
    expect(growthBonusBp(2, "TIER2", cfg)).toBe(0);
    expect(growthBonusBp(5, "TIER3", cfg)).toBe(100);
    expect(growthBonusBp(5, "TIER1", cfg)).toBe(0);
  });
});

describe("clawback reversal & FX & seats", () => {
  it("reverses commission in proportion to the refunded amount", () => {
    expect(proportionalReversalCents(160_000, 2_000_000, 2_000_000)).toBe(160_000); // full refund
    expect(proportionalReversalCents(160_000, 1_000_000, 2_000_000)).toBe(80_000); // half
    expect(proportionalReversalCents(160_000, 0, 2_000_000)).toBe(0);
    expect(proportionalReversalCents(160_000, 5_000_000, 2_000_000)).toBe(160_000); // clamps to base
  });
  it("converts cents at the cleared-date FX rate", () => {
    expect(convertCents(100_000, 0.9)).toBe(90_000);
    expect(convertCents(100_000, 1.27)).toBe(127_000);
  });
  it("counts only paid, collected, non-disregarded seats", () => {
    expect(
      countableSeats([
        { count: 10, status: "PAID_COLLECTED" },
        { count: 5, status: "PENDING" },
        { count: 3, status: "REFUNDED" },
        { count: 2, status: "CANCELLED" },
        { count: 4, status: "PAID_COLLECTED", disregardForTargets: true },
      ]),
    ).toBe(10);
  });
});

describe("per-partner config override flows through the engine", () => {
  it("an override changes the computed commission", () => {
    const overridden = mergeConfig(cfg, { qualifiedOriginationB2bBp: 1500 });
    expect(originationRateBp({ strength: "QUALIFIED", dealKind: "B2B" }, overridden)).toBe(1500);
    const r = computeDealCommission({
      netReceiptsCents: USD_20K,
      dealKind: "B2B",
      config: overridden,
      functions: [{ function: "QUALIFIED_ORIGINATION", rateBp: 1500 }],
    });
    expect(r.totalCents).toBe(300_000); // 15% of $20k
  });
});

describe("fixed-fee lines are committed and idempotent under the cap clamp", () => {
  it("scales only the percentage lines to the headroom left by a fixed fee", () => {
    // B2B net $20k, cap 30% = $6,000. Fixed delivery fee $5,000 + strong origination 12% ($2,400) = $7,400 raw.
    const r = computeDealCommission({
      netReceiptsCents: USD_20K,
      dealKind: "B2B",
      config: cfg,
      functions: [
        { function: "DELIVERY", flatCents: 500_000 },
        { function: "STRONG_ORIGINATION", rateBp: 1200 },
      ],
    });
    expect(r.capCents).toBe(600_000);
    expect(r.capped).toBe(true);
    const fee = r.entries.find((e) => e.function === "DELIVERY")!;
    const orig = r.entries.find((e) => e.function === "STRONG_ORIGINATION")!;
    expect(fee.amountCents).toBe(500_000); // fixed fee untouched
    expect(fee.isFlat).toBe(true);
    expect(orig.amountCents).toBe(100_000); // scaled to the remaining headroom
    expect(r.totalCents).toBe(600_000);
  });

  it("re-running the engine on its own output is stable (recompute idempotency)", () => {
    const inputs = {
      netReceiptsCents: USD_20K,
      dealKind: "B2B" as const,
      config: cfg,
      functions: [
        { function: "DELIVERY" as const, flatCents: 500_000 },
        { function: "STRONG_ORIGINATION" as const, rateBp: 1200 },
      ],
    };
    const a = computeDealCommission(inputs);
    const b = computeDealCommission({
      ...inputs,
      functions: a.entries.map((e) => (e.isFlat ? { function: e.function, flatCents: e.amountCents } : { function: e.function, rateBp: e.rateBp })),
    });
    expect(b.entries.map((e) => e.amountCents)).toEqual(a.entries.map((e) => e.amountCents));
  });

  it("flags overCap when fixed fees alone exceed the cap", () => {
    const r = computeDealCommission({
      netReceiptsCents: USD_20K,
      dealKind: "B2B",
      config: cfg,
      functions: [{ function: "DELIVERY", flatCents: 700_000 }],
    });
    expect(r.overCap).toBe(true);
    expect(r.capped).toBe(true);
  });
});

describe("computeDealCommission — already-committed (PAID) amounts consume cap headroom", () => {
  // B2C net $20k, cap 25% = $5,000. A CLOSING line was already PAID at 5% = $1,000
  // and is excluded from the recompute set. The operator then adds strong
  // origination 15% ($3,000) + delivery 8% ($1,600) = $4,600 of new percentage lines.
  it("clamps recomputed lines so PAID + recomputed can never breach the per-deal cap (pay-then-add ordering)", () => {
    const paidCents = 100_000; // $1,000 already PAID, outside the recompute set
    const r = computeDealCommission({
      netReceiptsCents: USD_20K,
      dealKind: "B2C",
      config: cfg,
      committedExternalCents: paidCents,
      functions: [
        { function: "STRONG_ORIGINATION", rateBp: cfg.strongOriginationB2cBp }, // 15% = $3,000
        { function: "DELIVERY", rateBp: cfg.deliveryPercentMaxBp }, // 8% = $1,600
      ],
    });
    expect(r.capCents).toBe(bpToCents(USD_20K, cfg.capB2cBp)); // $5,000
    expect(r.rawTotalCents).toBe(460_000); // $4,600 of new lines
    // Without the fix this would stay $4,600 (it fits under $5,000 alone) and
    // $1,000 + $4,600 = $5,600 would breach. With the paid $1,000 consuming
    // headroom, the new lines clamp to the remaining $4,000.
    expect(r.capped).toBe(true);
    expect(r.totalCents).toBe(400_000);
    expect(paidCents + r.totalCents).toBe(r.capCents); // exactly at the cap
    expect(paidCents + r.totalCents).toBeLessThanOrEqual(r.capCents); // never above it
  });

  it("is backward compatible: committedExternalCents of 0 (or omitted) is unchanged", () => {
    const base = {
      netReceiptsCents: USD_20K,
      dealKind: "B2C" as const,
      config: cfg,
      functions: [
        { function: "STRONG_ORIGINATION" as const, rateBp: cfg.strongOriginationB2cBp },
        { function: "DELIVERY" as const, rateBp: cfg.deliveryPercentMaxBp },
      ],
    };
    const omitted = computeDealCommission(base);
    const zero = computeDealCommission({ ...base, committedExternalCents: 0 });
    expect(zero.totalCents).toBe(omitted.totalCents);
    expect(omitted.totalCents).toBe(460_000); // $4,600, under the $5,000 cap, not clamped
    expect(omitted.capped).toBe(false);
  });

  it("when PAID lines already fill the cap, further recomputed rate lines clamp to zero", () => {
    const r = computeDealCommission({
      netReceiptsCents: USD_20K,
      dealKind: "B2C",
      config: cfg,
      committedExternalCents: bpToCents(USD_20K, cfg.capB2cBp), // already at the full 25% cap
      functions: [{ function: "QUALIFIED_ORIGINATION", rateBp: cfg.qualifiedOriginationB2cBp }],
    });
    expect(r.totalCents).toBe(0);
    expect(r.capped).toBe(true);
    expect(r.entries[0].amountCents).toBe(0);
  });
});

describe("deriveFunctionRate (single source of truth, no operator-typed rates)", () => {
  it("basic intro is the config rate for both kinds", () => {
    expect(deriveFunctionRate("BASIC_INTRO", { dealKind: "B2C", cfg })).toEqual({ kind: "PERCENT", rateBp: cfg.basicIntroductionBp });
    expect(deriveFunctionRate("BASIC_INTRO", { dealKind: "B2B", cfg })).toEqual({ kind: "PERCENT", rateBp: cfg.basicIntroductionBp });
  });
  it("qualified origination splits B2C vs B2B", () => {
    expect(deriveFunctionRate("QUALIFIED_ORIGINATION", { dealKind: "B2C", cfg })).toEqual({ kind: "PERCENT", rateBp: cfg.qualifiedOriginationB2cBp });
    expect(deriveFunctionRate("QUALIFIED_ORIGINATION", { dealKind: "B2B", cfg })).toEqual({ kind: "PERCENT", rateBp: cfg.qualifiedOriginationB2bBp });
  });
  it("closing pays more for B2B than B2C (per config)", () => {
    expect(deriveFunctionRate("CLOSING", { dealKind: "B2C", cfg }).kind === "PERCENT" && deriveFunctionRate("CLOSING", { dealKind: "B2C", cfg })).toMatchObject({ rateBp: cfg.closingB2cBp });
    expect(deriveFunctionRate("CLOSING", { dealKind: "B2B", cfg })).toEqual({ kind: "PERCENT", rateBp: cfg.closingB2bBp });
    expect(cfg.closingB2bBp).toBeGreaterThan(cfg.closingB2cBp);
  });
  it("strong origination: B2B always strong; B2C gated by the seat threshold or panel unlock", () => {
    // B2B strong is always available.
    expect(deriveFunctionRate("STRONG_ORIGINATION", { dealKind: "B2B", cfg })).toEqual({ kind: "PERCENT", rateBp: cfg.strongOriginationB2bBp });
    // B2C strong below the gate falls back to the qualified B2C rate.
    expect(deriveFunctionRate("STRONG_ORIGINATION", { dealKind: "B2C", cfg, seatsTowardStrongUnlock: cfg.strongOriginationUnlockSeats - 1 })).toEqual({
      kind: "PERCENT",
      rateBp: cfg.qualifiedOriginationB2cBp,
    });
    // B2C strong at/above the gate unlocks the strong B2C rate.
    expect(deriveFunctionRate("STRONG_ORIGINATION", { dealKind: "B2C", cfg, seatsTowardStrongUnlock: cfg.strongOriginationUnlockSeats })).toEqual({
      kind: "PERCENT",
      rateBp: cfg.strongOriginationB2cBp,
    });
    // Panel unlock overrides the seat gate.
    expect(deriveFunctionRate("STRONG_ORIGINATION", { dealKind: "B2C", cfg, seatsTowardStrongUnlock: 0, strongUnlockedByPanel: true })).toEqual({
      kind: "PERCENT",
      rateBp: cfg.strongOriginationB2cBp,
    });
  });
  it("delivery: FLAT under fixed-fee mode, else clamped into the band", () => {
    expect(deriveFunctionRate("DELIVERY", { dealKind: "B2C", cfg: { ...cfg, deliveryMode: "FIXED_FEE" } })).toEqual({ kind: "FLAT" });
    expect(deriveFunctionRate("DELIVERY", { dealKind: "B2C", cfg })).toEqual({ kind: "PERCENT", rateBp: cfg.deliveryPercentMinBp });
    expect(deriveFunctionRate("DELIVERY", { dealKind: "B2C", cfg, deliveryApprovedBp: 99999 })).toEqual({ kind: "PERCENT", rateBp: cfg.deliveryPercentMaxBp });
  });
  it("override is zero outside the window or when inactive, else a share of the open rate", () => {
    expect(deriveFunctionRate("OVERRIDE", { dealKind: "B2B", cfg, openRateBp: 1200, withinOriginationWindow: false, activeStatus: true })).toEqual({ kind: "PERCENT", rateBp: 0 });
    expect(deriveFunctionRate("OVERRIDE", { dealKind: "B2B", cfg, openRateBp: 1200, withinOriginationWindow: true, activeStatus: false })).toEqual({ kind: "PERCENT", rateBp: 0 });
    const r = deriveFunctionRate("OVERRIDE", { dealKind: "B2B", cfg, openRateBp: 1200, withinOriginationWindow: true, activeStatus: true });
    expect(r).toEqual({ kind: "PERCENT", rateBp: originationOverrideBp({ openRateBp: 1200, withinWindow: true, activeStatus: true }, cfg) });
  });
  it("growth bonus derives from rolling org count and tier", () => {
    expect(deriveFunctionRate("GROWTH_BONUS", { dealKind: "B2B", cfg, newB2bOrgsRolling12: cfg.growthBonusOrgThreshold, tier: "TIER2" })).toEqual({ kind: "PERCENT", rateBp: cfg.growthBonusBp });
    expect(deriveFunctionRate("GROWTH_BONUS", { dealKind: "B2B", cfg, newB2bOrgsRolling12: cfg.growthBonusOrgThreshold, tier: "TIER1" })).toEqual({ kind: "PERCENT", rateBp: 0 });
  });
  it("focus bonus is auto-only (never a manual line)", () => {
    expect(deriveFunctionRate("FOCUS_BONUS", { dealKind: "B2B", cfg }).kind).toBe("AUTO_ONLY");
  });
});
