import type { PartnerTier } from "@prisma/client";
import type { EffectiveConfig } from "./config";
import { pipelineProtectionDaysForTier, quietAccountLapseDaysForTier } from "./config";

/**
 * Time-window and eligibility rules — pure functions. The "now" is always passed
 * in so the logic is deterministic and unit-testable (the wall clock is never
 * read inside these functions; callers inject the current time).
 */

// ---------------------------------------------------------------------------
// Date math — ALL in UTC so windows compute identically regardless of server
// timezone or DST. Partners are global; dates must be unambiguous. Every
// function uses the getUTC*/setUTC* family (never local-time setDate/getDay),
// so a deal in São Paulo, Tehran or Tokyo is treated identically.
// ---------------------------------------------------------------------------

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600 * 1000);
}

/** Add months, clamping the day to the target month's length (Jan 31 + 1mo → Feb 28/29), in UTC. */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, daysInMonth));
  return d;
}

/** Add N business days (skipping Saturday and Sunday), in UTC. */
export function addBusinessDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added += 1;
  }
  return d;
}

/** Whole UTC calendar days between two instants (DST-immune). */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / (24 * 3600 * 1000));
}

/** Number of FULL years elapsed from `from` to `to`, in UTC. */
export function fullYearsBetween(from: Date, to: Date): number {
  let years = to.getUTCFullYear() - from.getUTCFullYear();
  const monthDelta = to.getUTCMonth() - from.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && to.getUTCDate() < from.getUTCDate())) years -= 1;
  return Math.max(0, years);
}

/**
 * The continuously-held focus tenure year (1-based): year 1 in the first 12
 * months, year 2 thereafter, etc. Feed into focusBonusBp for the current bonus.
 */
export function focusTenureYear(continuouslyHeldSince: Date, at: Date): number {
  return fullYearsBetween(continuouslyHeldSince, at) + 1;
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
    // Both the cap AND the window length are config-driven and per-partner overridable.
    if (daysBetween(pilotStart, now) < cfg.pilotFirst30DaysWindowDays) {
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
