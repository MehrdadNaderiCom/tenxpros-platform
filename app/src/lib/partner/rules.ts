import type { PartnerTier } from "@prisma/client";
import type { EffectiveConfig } from "./config";
import { pipelineProtectionDaysForTier, quietAccountLapseDaysForTier } from "./config";

/**
 * Time-window and eligibility rules — pure functions. The "now" is always passed
 * in so the logic is deterministic and unit-testable (the wall clock is never
 * read inside these functions; callers inject the current time).
 */

// ---------------------------------------------------------------------------
// Date math
// ---------------------------------------------------------------------------

/** The spec-fixed first window of a Tier-1 pilot (see maxOpenAccountsNow). */
export const PILOT_FIRST_WINDOW_DAYS = 30;

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600 * 1000);
}

/** Add months, clamping the day to the target month's length (Jan 31 + 1mo → Feb 28/29). */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, daysInMonth));
  return d;
}

/** Add N business days (skipping Saturday and Sunday). */
export function addBusinessDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added += 1;
  }
  return d;
}

export function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 3600 * 1000));
}

// ---------------------------------------------------------------------------
// Windows derived from config
// ---------------------------------------------------------------------------

export function trailPeriodEnd(signedAt: Date, cfg: EffectiveConfig): Date {
  return addMonths(signedAt, cfg.trailPeriodMonths);
}

export function originationWindowEnd(firstCloseAt: Date, cfg: EffectiveConfig): Date {
  return addMonths(firstCloseAt, cfg.originationWindowMonths);
}

export function withinOriginationWindow(firstCloseAt: Date, at: Date, cfg: EffectiveConfig): boolean {
  return at.getTime() < originationWindowEnd(firstCloseAt, cfg).getTime();
}

export function pipelineProtectionExpiry(confirmedAt: Date, tier: PartnerTier, cfg: EffectiveConfig): Date {
  return addDays(confirmedAt, pipelineProtectionDaysForTier(cfg, tier));
}

export function firstRightExpiry(confirmedAt: Date, cfg: EffectiveConfig): Date {
  return addHours(confirmedAt, cfg.firstRightHours);
}

export function clawbackWindowEnd(closeAt: Date, cfg: EffectiveConfig): Date {
  return addDays(closeAt, cfg.clawbackDays);
}

export function lateStageTailEnd(terminationAt: Date, cfg: EffectiveConfig): Date {
  return addDays(terminationAt, cfg.lateStageTailDays);
}

/**
 * Commission becomes payable N business days after the LATER of (a) delivery and
 * (b) cleared payment. Null until both have happened.
 */
export function commissionPayableOn(
  deliveredAt: Date | null | undefined,
  paymentClearedAt: Date | null | undefined,
  cfg: EffectiveConfig,
): Date | null {
  if (!deliveredAt || !paymentClearedAt) return null;
  const later = deliveredAt.getTime() >= paymentClearedAt.getTime() ? deliveredAt : paymentClearedAt;
  return addBusinessDays(later, cfg.paymentBusinessDays);
}

// ---------------------------------------------------------------------------
// Pilot & scorecard
// ---------------------------------------------------------------------------

export function pilotEndDate(pilotStart: Date, cfg: EffectiveConfig): Date {
  return addDays(pilotStart, cfg.pilotDays);
}

/** 1-based day number within the pilot (day 1 = the pilot start date). */
export function pilotDayNumber(pilotStart: Date, now: Date): number {
  return daysBetween(pilotStart, now) + 1;
}

// ---------------------------------------------------------------------------
// Accounts: limits, lapse, major-new-engagement
// ---------------------------------------------------------------------------

/**
 * Maximum open registered accounts for a partner right now. During the first 30
 * days of a Tier-1 pilot the cap is lower until meaningful progress is shown.
 */
export function maxOpenAccountsNow(args: {
  tier: PartnerTier;
  pilotStart?: Date | null;
  now: Date;
  meaningfulProgress?: boolean;
  cfg: EffectiveConfig;
}): number {
  const { tier, pilotStart, now, meaningfulProgress, cfg } = args;
  const base =
    tier === "TIER3"
      ? cfg.maxOpenAccountsTier3
      : tier === "TIER2"
        ? cfg.maxOpenAccountsTier2
        : cfg.maxOpenAccountsTier1;
  if (tier === "TIER1" && pilotStart && !meaningfulProgress) {
    // The 30-day window is fixed by the program spec (the config field itself is
    // named pilotFirst30DaysMaxAccountsTier1); only the cap is tunable/overridable.
    if (daysBetween(pilotStart, now) < PILOT_FIRST_WINDOW_DAYS) {
      return Math.min(base, cfg.pilotFirst30DaysMaxAccountsTier1);
    }
  }
  return base;
}

/** A quiet account lapses if no meaningful update within the tier's cadence. */
export function accountIsLapsed(
  lastMeaningfulUpdateAt: Date | null | undefined,
  tier: PartnerTier,
  now: Date,
  cfg: EffectiveConfig,
): boolean {
  if (!lastMeaningfulUpdateAt) return false;
  const lapseAt = addDays(lastMeaningfulUpdateAt, quietAccountLapseDaysForTier(cfg, tier));
  return now.getTime() > lapseAt.getTime();
}

/**
 * A major new engagement (a genuinely new B2B engagement, or an expansion adding
 * ≥ the configured seat threshold) opens its own fresh 12-month window. A same-
 * scope renewal does not.
 */
export function isMajorNewEngagement(
  args: { isNewEngagement: boolean; expansionSeats?: number },
  cfg: EffectiveConfig,
): boolean {
  return args.isNewEngagement || (args.expansionSeats ?? 0) >= cfg.majorNewEngagementMinSeats;
}

// ---------------------------------------------------------------------------
// Tier eligibility (panel confirmation still required to actually promote)
// ---------------------------------------------------------------------------

export interface TierEligibility {
  eligibleForTier2: boolean;
  eligibleForTier3: boolean;
}

export function tierEligibility(
  args: {
    currentTier: PartnerTier;
    paidSeatsInWindow: number;
    focusSeatsInWindow: number;
    holdsTier2: boolean;
  },
  cfg: EffectiveConfig,
): TierEligibility {
  return {
    eligibleForTier2: args.paidSeatsInWindow >= cfg.tier2SeatThreshold,
    eligibleForTier3: args.holdsTier2 && args.focusSeatsInWindow >= cfg.tier3FocusSeatThreshold,
  };
}
