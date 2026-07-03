import { describe, expect, it } from "vitest";
import {
  CONFIG_FIELD_KEYS,
  PROGRAM_CONFIG_DEFAULTS,
  activeStatusCureDaysForTier,
  maxOpenAccountsForTier,
  mergeConfig,
  pickConfigFields,
  pipelineProtectionDaysForTier,
  quietAccountLapseDaysForTier,
  type EffectiveConfig,
} from "../src/lib/partner/config";
import { CONFIG_FIELD_META } from "../src/lib/partner/constants";

const base: EffectiveConfig = PROGRAM_CONFIG_DEFAULTS;

describe("config defaults", () => {
  it("match the documented program defaults", () => {
    expect(base.qualifiedOriginationB2bBp).toBe(800);
    expect(base.strongOriginationB2bBp).toBe(1200);
    expect(base.closingB2bBp).toBe(1000);
    expect(base.capB2cBp).toBe(2800);
    expect(base.capB2bBp).toBe(3000);
    expect(base.tier3FocusHardCeilingBp).toBe(3500);
    expect(base.overrideShareBp).toBe(5000);
    expect(base.originationWindowMonths).toBe(12);
    expect(base.trailPeriodMonths).toBe(12);
    expect(base.pilotDays).toBe(90);
    expect(base.currency).toBe("USD");
    expect(base.nonCircumventionMonths).toBe(24);
    expect(base.nonSolicitationMonths).toBe(12);
    expect(base.pilotFirst30DaysWindowDays).toBe(30);
  });

  it("CONFIG_FIELD_KEYS and CONFIG_FIELD_META cover exactly the same fields", () => {
    const keys = [...CONFIG_FIELD_KEYS].sort();
    const metaKeys = CONFIG_FIELD_META.map((m) => m.key).sort();
    expect(metaKeys).toEqual(keys);
    // every meta key is unique
    expect(new Set(metaKeys).size).toBe(metaKeys.length);
  });
});

describe("mergeConfig precedence", () => {
  it("a non-null override beats the global default", () => {
    const merged = mergeConfig(base, { qualifiedOriginationB2bBp: 1500, capB2bBp: 4000 });
    expect(merged.qualifiedOriginationB2bBp).toBe(1500);
    expect(merged.capB2bBp).toBe(4000);
    // untouched fields fall back
    expect(merged.closingB2bBp).toBe(base.closingB2bBp);
  });

  it("a null/undefined override falls back to the global", () => {
    const merged = mergeConfig(base, { qualifiedOriginationB2bBp: null });
    expect(merged.qualifiedOriginationB2bBp).toBe(base.qualifiedOriginationB2bBp);
  });

  it("an explicit false boolean override is respected (not treated as fallback)", () => {
    expect(base.smallPayoutCarryForward).toBe(true);
    const merged = mergeConfig(base, { smallPayoutCarryForward: false });
    expect(merged.smallPayoutCarryForward).toBe(false);
  });

  it("a null override leaves the resolved config fully populated", () => {
    const merged = mergeConfig(base, null);
    for (const key of CONFIG_FIELD_KEYS) {
      expect(merged[key]).not.toBeNull();
      expect(merged[key]).not.toBeUndefined();
    }
  });
});

describe("pickConfigFields", () => {
  it("keeps only config keys and drops metadata", () => {
    const row = { ...base, id: "singleton", updatedAt: new Date(), updatedBy: "x", partnerId: "p1" };
    const picked = pickConfigFields(row as unknown as EffectiveConfig);
    expect("id" in picked).toBe(false);
    expect("updatedAt" in picked).toBe(false);
    expect("partnerId" in picked).toBe(false);
    expect(picked.capB2bBp).toBe(base.capB2bBp);
  });
});

describe("per-tier accessors", () => {
  it("max open accounts step up by tier", () => {
    expect(maxOpenAccountsForTier(base, "TIER1")).toBe(3);
    expect(maxOpenAccountsForTier(base, "TIER2")).toBe(5);
    expect(maxOpenAccountsForTier(base, "TIER3")).toBe(10);
  });
  it("pipeline protection, lapse and cure step up by tier", () => {
    expect(pipelineProtectionDaysForTier(base, "TIER1")).toBe(120);
    expect(pipelineProtectionDaysForTier(base, "TIER3")).toBe(180);
    expect(quietAccountLapseDaysForTier(base, "TIER2")).toBe(45);
    expect(activeStatusCureDaysForTier(base, "TIER3")).toBe(60);
  });
});
