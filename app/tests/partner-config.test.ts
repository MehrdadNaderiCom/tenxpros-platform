import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONFIG_FIELD_KEYS,
  PROGRAM_CONFIG_DEFAULTS,
  diffConfigFromDefaults,
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

// ---------------------------------------------------------------------------
// The config drift alarm: the engine pays from the live DB row while the
// public surfaces render the compile-time defaults; this check is the alarm
// that they have diverged.
// ---------------------------------------------------------------------------

describe("diffConfigFromDefaults", () => {
  it("reports in sync when the live row matches the defaults exactly", () => {
    const live = { ...PROGRAM_CONFIG_DEFAULTS } as Record<string, unknown>;
    expect(diffConfigFromDefaults(live)).toEqual([]);
  });

  it("reports exactly the diverging field with both values", () => {
    const live = { ...PROGRAM_CONFIG_DEFAULTS, capB2cBp: 2500 } as Record<string, unknown>;
    expect(diffConfigFromDefaults(live)).toEqual([
      { field: "capB2cBp", live: 2500, default: PROGRAM_CONFIG_DEFAULTS.capB2cBp },
    ]);
  });

  it("ignores bookkeeping columns by construction (only CONFIG_FIELD_KEYS are compared)", () => {
    const live = {
      ...PROGRAM_CONFIG_DEFAULTS,
      id: "singleton",
      updatedAt: new Date(0),
      updatedBy: "someone else entirely",
    } as Record<string, unknown>;
    expect(diffConfigFromDefaults(live)).toEqual([]);
    expect(CONFIG_FIELD_KEYS).not.toContain("updatedAt");
    expect(CONFIG_FIELD_KEYS).not.toContain("updatedBy");
  });
});

describe("config drift wiring (source inspection)", () => {
  const root = join(__dirname, "..");
  const health = readFileSync(join(root, "src/app/api/health/route.ts"), "utf8");
  const server = readFileSync(join(root, "src/lib/partner/config-server.ts"), "utf8");

  it("the health endpoint surfaces the drift without ever failing on it", () => {
    expect(health).toContain("configDrift");
    expect(health).toContain("checkConfigDrift");
    // Drift or a failed check never flips liveness: the container healthcheck
    // curls this endpoint, and a deliberate DB-side change must not kill it.
    expect(health).toContain("ok: true, configDrift");
    expect(health).toContain('"check_failed"');
    expect(health).toContain('export const dynamic = "force-dynamic"');
  });

  it("a missing singleton row is a reported status, never a throw", () => {
    expect(server).toContain('return { status: "row_missing", differences: [] };');
  });
});
