import type { PartnerTier, ProgramConfig } from "@prisma/client";

/**
 * Two-layer program configuration.
 *
 * This module is PURE (no DB, no I/O) so the commission engine, rules and unit
 * tests can import it freely. The DB-backed resolvers live in `config-server.ts`.
 *
 * `ProgramConfig` (a single "singleton" row) holds the global defaults. Each
 * `Partner` may have a `PartnerConfig` whose non-null fields override the global
 * value. {@link resolvePartnerConfig} merges the two and is the ONLY way the
 * commission engine and rules read commercial numbers — there are no hard-coded
 * rates anywhere else.
 *
 * Money is integer CENTS; rates and caps are integer BASIS POINTS (1% = 100 bp).
 */

/** Effective config = every configurable field, fully resolved (non-null). */
export type EffectiveConfig = Omit<ProgramConfig, "id" | "updatedAt" | "updatedBy">;

/**
 * The single source of default values, mirroring the `@default(...)` directives
 * in schema.prisma. The DB row carries these defaults already; this object backs
 * the resolver's self-heal path and is the canonical reference for the admin UI.
 */
export const PROGRAM_CONFIG_DEFAULTS: EffectiveConfig = {
  // Commission rates by function (basis points)
  basicIntroductionBp: 500,
  qualifiedOriginationB2cBp: 1000,
  qualifiedOriginationB2bBp: 800,
  strongOriginationB2cBp: 1500,
  strongOriginationB2bBp: 1200,
  strongOriginationUnlockSeats: 40,
  closingB2cBp: 500,
  closingB2bBp: 1000,
  deliveryMode: "PERCENTAGE",
  deliveryPercentMinBp: 500,
  deliveryPercentMaxBp: 800,
  // Caps (basis points)
  capB2cBp: 2500,
  capB2bBp: 3000,
  tier3FocusHardCeilingBp: 3500,
  // Origination window & override
  originationWindowMonths: 12,
  overrideShareBp: 5000,
  majorNewEngagementMinSeats: 15,
  trailPeriodMonths: 12,
  // Tier eligibility
  tierQualifyingWindowMonths: 12,
  tier2SeatThreshold: 40,
  tier3FocusSeatThreshold: 15,
  // Tier 3 focus bonus
  focusBonusStartBp: 100,
  focusBonusAnnualIncrementBp: 100,
  focusBonusCeilingBp: 3500,
  // Growth bonus
  growthBonusOrgThreshold: 3,
  growthBonusBp: 100,
  // Pipeline & account limits (per tier)
  maxOpenAccountsTier1: 3,
  maxOpenAccountsTier2: 5,
  maxOpenAccountsTier3: 10,
  pilotFirst30DaysMaxAccountsTier1: 2,
  pipelineProtectionDaysTier1: 120,
  pipelineProtectionDaysTier2: 150,
  pipelineProtectionDaysTier3: 180,
  quietAccountLapseDaysTier1: 30,
  quietAccountLapseDaysTier2: 45,
  quietAccountLapseDaysTier3: 60,
  firstRightHours: 48,
  dealConfirmationWindowBusinessDays: 5,
  // Active Status
  activeStatusResponseBusinessDays: 5,
  activeStatusCureDaysTier1: 30,
  activeStatusCureDaysTier2: 45,
  activeStatusCureDaysTier3: 60,
  transitionDays: 30,
  // Payment
  currency: "USD",
  paymentBusinessDays: 30,
  smallPayoutThresholdCents: 2500,
  smallPayoutCarryForward: true,
  // Clawback
  clawbackDays: 120,
  // Pilot & termination
  pilotDays: 90,
  pilotTerminationNoticeDays: 7,
  postPilotTerminationNoticeDays: 30,
  materialBreachCureDays: 15,
  windDownDays: 30,
  programAmendmentNoticeDays: 30,
  // Post-termination restrictions
  nonCircumventionMonths: 24,
  nonSolicitationMonths: 12,
  lateStageTailDays: 90,
};

/** Runtime list of every configurable field key. */
export const CONFIG_FIELD_KEYS = Object.keys(PROGRAM_CONFIG_DEFAULTS) as (keyof EffectiveConfig)[];

/** A nullable shape (per-partner override) of every configurable field. */
export type PartnerConfigOverride = Partial<
  Record<keyof EffectiveConfig, EffectiveConfig[keyof EffectiveConfig] | null>
>;

/**
 * Pure merge: for every field, a non-null override wins, else the global value.
 * An explicit `false` override is respected (only null/undefined falls back).
 */
export function mergeConfig(
  global: EffectiveConfig,
  override: PartnerConfigOverride | null | undefined,
): EffectiveConfig {
  const result = {} as EffectiveConfig;
  for (const key of CONFIG_FIELD_KEYS) {
    const o = override ? override[key] : null;
    (result as Record<string, unknown>)[key] = o ?? (global as Record<string, unknown>)[key];
  }
  return result;
}

/** Strip a ProgramConfig/PartnerConfig DB row down to just the config fields. */
export function pickConfigFields<T extends Partial<EffectiveConfig>>(row: T): PartnerConfigOverride {
  const out: PartnerConfigOverride = {};
  for (const key of CONFIG_FIELD_KEYS) {
    if (key in row) {
      (out as Record<string, unknown>)[key] = (row as Record<string, unknown>)[key];
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Per-tier accessors (limits/protection/cure differ by tier)
// ---------------------------------------------------------------------------

export function maxOpenAccountsForTier(cfg: EffectiveConfig, tier: PartnerTier): number {
  return tier === "TIER3"
    ? cfg.maxOpenAccountsTier3
    : tier === "TIER2"
      ? cfg.maxOpenAccountsTier2
      : cfg.maxOpenAccountsTier1;
}

export function pipelineProtectionDaysForTier(cfg: EffectiveConfig, tier: PartnerTier): number {
  return tier === "TIER3"
    ? cfg.pipelineProtectionDaysTier3
    : tier === "TIER2"
      ? cfg.pipelineProtectionDaysTier2
      : cfg.pipelineProtectionDaysTier1;
}

export function quietAccountLapseDaysForTier(cfg: EffectiveConfig, tier: PartnerTier): number {
  return tier === "TIER3"
    ? cfg.quietAccountLapseDaysTier3
    : tier === "TIER2"
      ? cfg.quietAccountLapseDaysTier2
      : cfg.quietAccountLapseDaysTier1;
}

export function activeStatusCureDaysForTier(cfg: EffectiveConfig, tier: PartnerTier): number {
  return tier === "TIER3"
    ? cfg.activeStatusCureDaysTier3
    : tier === "TIER2"
      ? cfg.activeStatusCureDaysTier2
      : cfg.activeStatusCureDaysTier1;
}
