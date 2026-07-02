import type { PartnerFunction, PartnerTier, SeatStatus } from "@prisma/client";
import type { EffectiveConfig } from "./config";

/**
 * The commission engine, pure functions only. No database, no I/O, no clock.
 * Every commercial number comes from the resolved {@link EffectiveConfig}, never
 * a hard-coded constant. Money is integer CENTS; rates/caps are integer BASIS
 * POINTS (1% = 100 bp). All rounding is explicit and deterministic.
 */

export type DealKind = "B2C" | "B2B";
export type OriginationStrength = "QUALIFIED" | "STRONG";

/** Apply a basis-points rate to a cents base, rounded to the nearest cent. */
export function bpToCents(baseCents: number, bp: number): number {
  return Math.round((baseCents * bp) / 10000);
}

/** Implied basis points for a flat cents amount against a cents base. */
export function centsToBp(amountCents: number, baseCents: number): number {
  if (baseCents <= 0) return 0;
  return Math.round((amountCents * 10000) / baseCents);
}

// ---------------------------------------------------------------------------
// Per-function rates
// ---------------------------------------------------------------------------

export function basicIntroRateBp(cfg: EffectiveConfig): number {
  return cfg.basicIntroductionBp;
}

/**
 * Origination rate. B2B strong is always available; B2C strong only unlocks
 * after `strongOriginationUnlockSeats` paid seats OR an explicit Panel
 * Confirmation, otherwise B2C strong falls back to the qualified B2C rate.
 */
export function originationRateBp(
  args: {
    strength: OriginationStrength;
    dealKind: DealKind;
    seatsTowardStrongUnlock?: number;
    strongUnlockedByPanel?: boolean;
  },
  cfg: EffectiveConfig,
): number {
  if (args.dealKind === "B2B") {
    return args.strength === "STRONG" ? cfg.strongOriginationB2bBp : cfg.qualifiedOriginationB2bBp;
  }
  if (args.strength === "STRONG") {
    const unlocked =
      (args.seatsTowardStrongUnlock ?? 0) >= cfg.strongOriginationUnlockSeats ||
      Boolean(args.strongUnlockedByPanel);
    return unlocked ? cfg.strongOriginationB2cBp : cfg.qualifiedOriginationB2cBp;
  }
  return cfg.qualifiedOriginationB2cBp;
}

export function closingRateBp(dealKind: DealKind, cfg: EffectiveConfig): number {
  return dealKind === "B2C" ? cfg.closingB2cBp : cfg.closingB2bBp;
}

/**
 * Delivery/coaching percentage rate. Zero when delivery is paid by a fixed fee
 * (the fixed fee is supplied as `flatCents` on the function input instead). When
 * PERCENTAGE, an approved rate is clamped to the configured [min, max] band.
 */
export function deliveryRateBp(cfg: EffectiveConfig, approvedBp?: number | null): number {
  if (cfg.deliveryMode === "FIXED_FEE") return 0;
  const bp = approvedBp ?? cfg.deliveryPercentMinBp;
  return Math.min(Math.max(bp, cfg.deliveryPercentMinBp), cfg.deliveryPercentMaxBp);
}

/**
 * Origination Override on a renewal: a share of the rate the account was opened
 * at, payable only inside the Origination Window AND while the partner holds
 * Active Status. Zero otherwise.
 */
export function originationOverrideBp(
  args: { openRateBp: number; withinWindow: boolean; activeStatus: boolean },
  cfg: EffectiveConfig,
): number {
  if (!args.withinWindow || !args.activeStatus) return 0;
  return Math.round((args.openRateBp * cfg.overrideShareBp) / 10000);
}

export interface OriginationOpener {
  rateBp: number;
  signedAt: Date | null;
}

/**
 * The account's OPENER for the renewal OVERRIDE: the earliest closed deal (by
 * signedAt) that carries an origination line (QUALIFIED_ORIGINATION or
 * STRONG_ORIGINATION). Returns both its origination rate (the higher, if it
 * carries more than one line) AND its signedAt, so the caller can pay a share of
 * that rate AND anchor the origination window to the account OPENING rather than
 * to the renewal (otherwise the override would never expire per account). Pass
 * the account's EXISTING closed deals; the deal being recorded has no lines yet,
 * so it is never itself the opener. Returns null when no deal on the account
 * carries an origination line, so the OVERRIDE safely refuses (nothing to trail).
 * A `signedAt` of null sorts last, so a dated opener is always preferred. Pure:
 * it takes already-derived rates and returns one of them.
 */
export function originationOpener(
  deals: Array<{ signedAt: Date | null; originationRateBps: number[] }>,
): OriginationOpener | null {
  const withOrigination = deals
    .filter((d) => d.originationRateBps.length > 0)
    .sort(
      (a, b) =>
        (a.signedAt ? a.signedAt.getTime() : Number.POSITIVE_INFINITY) -
        (b.signedAt ? b.signedAt.getTime() : Number.POSITIVE_INFINITY),
    );
  if (withOrigination.length === 0) return null;
  const opener = withOrigination[0];
  return { rateBp: Math.max(...opener.originationRateBps), signedAt: opener.signedAt };
}

/** Convenience wrapper: just the opener's origination rate (or null). */
export function openerOriginationRateBp(
  deals: Array<{ signedAt: Date | null; originationRateBps: number[] }>,
): number | null {
  return originationOpener(deals)?.rateBp ?? null;
}

/**
 * Tier-3 focus bonus: starts at `focusBonusStartBp`, +increment per additional
 * full continuously-held year, clamped to the ceiling. `yearsHeld < 1` (no
 * active focus, or a lapse that reset the clock) yields zero.
 */
export function focusBonusBp(yearsHeld: number, cfg: EffectiveConfig): number {
  if (yearsHeld < 1) return 0;
  const bp = cfg.focusBonusStartBp + cfg.focusBonusAnnualIncrementBp * (Math.floor(yearsHeld) - 1);
  return Math.min(bp, cfg.focusBonusCeilingBp);
}

/** Growth bonus (Tier 2/3 only) when ≥ threshold new B2B orgs in a rolling year. */
export function growthBonusBp(orgCountRolling12: number, tier: PartnerTier, cfg: EffectiveConfig): number {
  if (tier === "TIER1") return 0;
  return orgCountRolling12 >= cfg.growthBonusOrgThreshold ? cfg.growthBonusBp : 0;
}

/** The hard cap (bp) for a deal. Tier-3 focus accounts use the focus ceiling. */
export function capBpForDeal(args: { dealKind: DealKind; focusActive?: boolean }, cfg: EffectiveConfig): number {
  if (args.focusActive) return cfg.tier3FocusHardCeilingBp;
  return args.dealKind === "B2C" ? cfg.capB2cBp : cfg.capB2bBp;
}

// ---------------------------------------------------------------------------
// Per-line rate derivation (single source of truth: no operator-typed rate)
// ---------------------------------------------------------------------------

/**
 * The outcome of deriving a commission line's rate from config + context:
 *  - PERCENT: a config-derived basis-points rate to apply to net receipts.
 *  - FLAT: delivery under FIXED_FEE mode; the operator supplies the fixed amount.
 *  - AUTO_ONLY: the line is applied by another flow (e.g. the focus bonus on
 *    recompute), so a manual add is refused with a clear reason.
 */
export type DerivedRate =
  | { kind: "PERCENT"; rateBp: number }
  | { kind: "FLAT" }
  | { kind: "AUTO_ONLY"; reason: string };

export interface DeriveContext {
  dealKind: DealKind;
  cfg: EffectiveConfig;
  // Strong-origination B2C gate:
  seatsTowardStrongUnlock?: number;
  strongUnlockedByPanel?: boolean;
  // Delivery percentage: an operator-approved rate, clamped into the band.
  deliveryApprovedBp?: number | null;
  // Override (renewal) context:
  openRateBp?: number;
  withinOriginationWindow?: boolean;
  activeStatus?: boolean;
  // Growth bonus context:
  newB2bOrgsRolling12?: number;
  tier?: PartnerTier;
}

/**
 * Derive the rate for a commission function purely from config + deal/partner
 * context, using the per-function helpers above. This is the single place a
 * line's rate comes from: no operator types a percentage anywhere.
 */
export function deriveFunctionRate(fn: PartnerFunction, ctx: DeriveContext): DerivedRate {
  switch (fn) {
    case "BASIC_INTRO":
      return { kind: "PERCENT", rateBp: basicIntroRateBp(ctx.cfg) };
    case "QUALIFIED_ORIGINATION":
      return { kind: "PERCENT", rateBp: originationRateBp({ strength: "QUALIFIED", dealKind: ctx.dealKind }, ctx.cfg) };
    case "STRONG_ORIGINATION":
      return {
        kind: "PERCENT",
        rateBp: originationRateBp(
          {
            strength: "STRONG",
            dealKind: ctx.dealKind,
            seatsTowardStrongUnlock: ctx.seatsTowardStrongUnlock,
            strongUnlockedByPanel: ctx.strongUnlockedByPanel,
          },
          ctx.cfg,
        ),
      };
    case "CLOSING":
      return { kind: "PERCENT", rateBp: closingRateBp(ctx.dealKind, ctx.cfg) };
    case "DELIVERY":
      if (ctx.cfg.deliveryMode === "FIXED_FEE") return { kind: "FLAT" };
      return { kind: "PERCENT", rateBp: deliveryRateBp(ctx.cfg, ctx.deliveryApprovedBp) };
    case "OVERRIDE":
      return {
        kind: "PERCENT",
        rateBp: originationOverrideBp(
          {
            openRateBp: ctx.openRateBp ?? 0,
            withinWindow: ctx.withinOriginationWindow ?? false,
            activeStatus: ctx.activeStatus ?? false,
          },
          ctx.cfg,
        ),
      };
    case "GROWTH_BONUS":
      return { kind: "PERCENT", rateBp: growthBonusBp(ctx.newB2bOrgsRolling12 ?? 0, ctx.tier ?? "TIER1", ctx.cfg) };
    case "FOCUS_BONUS":
      return { kind: "AUTO_ONLY", reason: "The focus bonus is applied automatically when you recompute the deal." };
    default:
      return { kind: "AUTO_ONLY", reason: "This function is not added manually." };
  }
}

// ---------------------------------------------------------------------------
// Deal-level computation with cap clamp
// ---------------------------------------------------------------------------

export interface FunctionInput {
  function: PartnerFunction;
  /** Percent of net receipts (basis points). Ignored when `flatCents` is set. */
  rateBp?: number;
  /** Fixed fee in cents (e.g. fixed delivery fee). Overrides `rateBp`. */
  flatCents?: number;
  /** Which partner earns this line (deals may stack functions across partners). */
  partnerId?: string;
}

export interface ComputedEntry {
  function: PartnerFunction;
  partnerId?: string;
  rateBp: number;
  baseAmountCents: number;
  amountCents: number;
  isFlat: boolean;
}

export interface DealCommissionResult {
  entries: ComputedEntry[];
  capBp: number;
  capCents: number;
  rawTotalCents: number;
  totalCents: number;
  capped: boolean;
  /** True when fixed fees alone already exceed the cap (operator must adjust). */
  overCap: boolean;
}

/** Scale a list of integer amounts down to sum exactly to `target` (cents-exact). */
function scaleToTarget(amounts: number[], target: number): number[] {
  const total = amounts.reduce((s, a) => s + a, 0);
  if (total <= target || total === 0) return amounts.slice();
  const scaled = amounts.map((a) => Math.floor((a * target) / total));
  let remainder = target - scaled.reduce((s, a) => s + a, 0);
  const order = amounts.map((a, i) => [a, i] as const).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
  for (let k = 0; remainder > 0 && k < order.length; k++) {
    scaled[order[k]] += 1;
    remainder -= 1;
  }
  return scaled;
}

/**
 * Compute every commission line for a deal and clamp total partner compensation
 * (across all partners and functions, including override and bonuses) to the
 * deal cap, an ABSOLUTE ceiling (25% B2C / 30% B2B; a Tier-3 focus account may
 * reach 35%). Fixed-fee lines are treated as committed (counted toward the cap
 * but never scaled, so recompute is idempotent); only percentage lines are
 * scaled down, cents-exact, to fit the remaining headroom under the cap.
 *
 * `committedExternalCents` is commission already locked in lines NOT passed in
 * `functions` (for example already-PAID lines that recompute must not re-scale).
 * Those consume cap headroom too, so the recomputed lines may only fill what is
 * left under the cap: committed + recomputed can never exceed the absolute cap.
 * Amounts are in the DEAL's currency minor units (the engine is scale-agnostic).
 */
export function computeDealCommission(args: {
  netReceiptsCents: number;
  dealKind: DealKind;
  functions: FunctionInput[];
  config: EffectiveConfig;
  focusActive?: boolean;
  committedExternalCents?: number;
}): DealCommissionResult {
  const { netReceiptsCents, dealKind, functions, config } = args;
  const committedExternalCents = Math.max(0, args.committedExternalCents ?? 0);
  const capBp = capBpForDeal({ dealKind, focusActive: args.focusActive }, config);
  const capCents = bpToCents(netReceiptsCents, capBp);
  // Headroom under the absolute per-deal cap after amounts already locked in
  // (e.g. PAID lines outside this recompute) are subtracted. The recomputed
  // lines may only fill this remainder, so paid + recomputed stays within the cap.
  const capAvailable = Math.max(0, capCents - committedExternalCents);

  const raw: ComputedEntry[] = functions.map((f) => {
    const isFlat = f.flatCents != null;
    const amount = isFlat ? (f.flatCents as number) : bpToCents(netReceiptsCents, f.rateBp ?? 0);
    const rateBp = isFlat ? centsToBp(f.flatCents as number, netReceiptsCents) : (f.rateBp ?? 0);
    return { function: f.function, partnerId: f.partnerId, rateBp, baseAmountCents: netReceiptsCents, amountCents: amount, isFlat };
  });

  const flatTotal = raw.filter((e) => e.isFlat).reduce((s, e) => s + e.amountCents, 0);
  const rateAmounts = raw.filter((e) => !e.isFlat).map((e) => e.amountCents);
  const rateRaw = rateAmounts.reduce((s, a) => s + a, 0);
  const rawTotalCents = flatTotal + rateRaw;
  const capForRate = Math.max(0, capAvailable - flatTotal);
  const overCap = flatTotal > capAvailable;

  if (rateRaw <= capForRate) {
    const totalCents = flatTotal + rateRaw;
    return { entries: raw, capBp, capCents, rawTotalCents, totalCents, capped: committedExternalCents + totalCents > capCents, overCap };
  }

  // Scale only the percentage lines to fit the headroom left by the fixed fees
  // and any already-committed amounts.
  const scaledRate = scaleToTarget(rateAmounts, capForRate);
  let ri = 0;
  const entries = raw.map((e) => (e.isFlat ? e : { ...e, amountCents: scaledRate[ri++] }));
  const totalCents = flatTotal + capForRate;
  return { entries, capBp, capCents, rawTotalCents, totalCents, capped: true, overCap };
}

// ---------------------------------------------------------------------------
// Clawback / FX / seats
// ---------------------------------------------------------------------------

/**
 * The commission to reverse when `refundedCents` of a deal's `baseCents` net
 * receipts is refunded/charged back/cancelled, proportional to the refund.
 */
export function proportionalReversalCents(
  commissionCents: number,
  refundedCents: number,
  baseCents: number,
): number {
  if (baseCents <= 0) return 0;
  const refunded = Math.min(Math.max(refundedCents, 0), baseCents);
  return Math.round((commissionCents * refunded) / baseCents);
}

/** Convert a cents amount at an FX rate (rate applied at the cleared date). */
export function convertCents(cents: number, rate: number): number {
  return Math.round(cents * rate);
}

export interface SeatLike {
  count: number;
  status: SeatStatus;
  disregardForTargets?: boolean;
}

/** Only paid, collected, non-refunded, non-disregarded seats count anywhere. */
export function countableSeats(seats: SeatLike[]): number {
  return seats.reduce(
    (sum, s) => sum + (s.status === "PAID_COLLECTED" && !s.disregardForTargets ? s.count : 0),
    0,
  );
}
