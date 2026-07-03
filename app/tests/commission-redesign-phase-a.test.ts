import { describe, it, expect } from "vitest";
import { PROGRAM_CONFIG_DEFAULTS, CONFIG_FIELD_KEYS, mergeConfig } from "../src/lib/partner/config";
import { CONFIG_FIELD_META } from "../src/lib/partner/constants";
import { computeDealCommission, bpToCents } from "../src/lib/partner/commission";

const NEW_KEYS = ["deliveryPercentBp", "strongValueThresholdB2cCents", "strongValueThresholdB2bCents"] as const;

describe("Phase A: new config keys exist and default safely", () => {
  it("adds the three new keys with the spec starting values", () => {
    expect(PROGRAM_CONFIG_DEFAULTS.deliveryPercentBp).toBe(800);
    expect(PROGRAM_CONFIG_DEFAULTS.strongValueThresholdB2cCents).toBe(500000);
    expect(PROGRAM_CONFIG_DEFAULTS.strongValueThresholdB2bCents).toBe(1500000);
  });

  it("keeps every existing key intact (nothing dropped or repurposed)", () => {
    // The old delivery mode and band remain, additive and unused for now.
    expect(PROGRAM_CONFIG_DEFAULTS.deliveryMode).toBe("PERCENTAGE");
    expect(PROGRAM_CONFIG_DEFAULTS.deliveryPercentMinBp).toBe(500);
    expect(PROGRAM_CONFIG_DEFAULTS.deliveryPercentMaxBp).toBe(800);
  });

  it("exposes the new keys through the config key list and admin metadata", () => {
    for (const k of NEW_KEYS) {
      expect(CONFIG_FIELD_KEYS).toContain(k);
      expect(CONFIG_FIELD_META.some((f) => f.key === k)).toBe(true);
    }
    // The two thresholds render as currency (cents), the delivery rate as basis points.
    expect(CONFIG_FIELD_META.find((f) => f.key === "strongValueThresholdB2bCents")?.unit).toBe("cents");
    expect(CONFIG_FIELD_META.find((f) => f.key === "strongValueThresholdB2cCents")?.unit).toBe("cents");
    expect(CONFIG_FIELD_META.find((f) => f.key === "deliveryPercentBp")?.unit).toBe("bp");
  });

  it("moves the retired band and seat-unlock out of the live Commission rates group (still covered, not dropped)", () => {
    // Additive: still in config and still in the admin metadata (so META covers every
    // key), but no longer presented as a current commission rule.
    for (const k of ["strongOriginationUnlockSeats", "deliveryMode", "deliveryPercentMinBp", "deliveryPercentMaxBp"] as const) {
      expect(k in PROGRAM_CONFIG_DEFAULTS).toBe(true);
      const meta = CONFIG_FIELD_META.find((f) => f.key === k);
      expect(meta).toBeDefined();
      expect(meta?.group).not.toBe("Commission rates");
      expect(meta?.group.toLowerCase()).toContain("retired");
    }
  });

  it("mergeConfig carries the new keys through a per-partner override merge", () => {
    const merged = mergeConfig(PROGRAM_CONFIG_DEFAULTS, { strongValueThresholdB2bCents: 2000000 });
    expect(merged.strongValueThresholdB2bCents).toBe(2000000); // a non-null override wins
    expect(merged.strongValueThresholdB2cCents).toBe(500000); // an untouched key keeps the default
    expect(merged.deliveryPercentBp).toBe(800);
  });
});

describe("Phase A: the commission engine is unchanged (no behavior change yet)", () => {
  const cfg = PROGRAM_CONFIG_DEFAULTS;

  it("a legacy B2B deal that stacks to the cap still pays exactly the cap", () => {
    const net = 100000; // 1,000 dollars in cents
    const r = computeDealCommission({
      netReceiptsCents: net,
      dealKind: "B2B",
      config: cfg,
      functions: [
        { function: "STRONG_ORIGINATION", rateBp: cfg.strongOriginationB2bBp }, // 12%
        { function: "CLOSING", rateBp: cfg.closingB2bBp }, // 10%
        { function: "DELIVERY", rateBp: cfg.deliveryPercentMaxBp }, // 8%
      ],
    });
    expect(r.capBp).toBe(cfg.capB2bBp); // 3000 bp
    expect(r.totalCents).toBe(bpToCents(net, cfg.capB2bBp)); // 30% = 30000, exactly at the cap
    expect(r.capped).toBe(false); // 30% == cap, so not over
  });

  it("a legacy B2C deal under the cap pays the raw total, unclamped", () => {
    const net = 100000;
    const r = computeDealCommission({
      netReceiptsCents: net,
      dealKind: "B2C",
      config: cfg,
      functions: [
        { function: "QUALIFIED_ORIGINATION", rateBp: cfg.qualifiedOriginationB2cBp }, // 10%
        { function: "CLOSING", rateBp: cfg.closingB2cBp }, // 5%
        { function: "DELIVERY", rateBp: cfg.deliveryPercentMaxBp }, // 8%
      ],
    });
    expect(r.capped).toBe(false);
    expect(r.totalCents).toBe(bpToCents(net, 2300)); // 23% = 23000
  });
});
