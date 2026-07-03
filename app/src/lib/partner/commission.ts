import type { PartnerFunction, PartnerTier, SeatStatus } from "@prisma/client";
import type { EffectiveConfig } from "./config";
import { addMonths } from "./rules";

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
 * RETIRED helper, kept for back-compat and its unit tests. The CURRENT rule does
 * NOT use this: origination strength is decided objectively by
 * {@link classifyOrigination} (domain newness + sale amount vs the high-value
 * threshold), and the live server action never calls this. The old B2C seat-unlock
 * and Panel-Confirmation path below is superseded and no longer reachable on the pay
 * path; it survives only so a caller with an already-known strength still resolves a
 * rate. Do not treat the seat unlock as a current rule.
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
  /** The partner who OPENED the account, so a renewal OVERRIDE is credited to them. */
  partnerId?: string;
}

/**
 * The account's OPENER for the renewal OVERRIDE: the earliest closed deal (by
 * signedAt) that carries an origination line (QUALIFIED_ORIGINATION or
 * STRONG_ORIGINATION). Returns its origination rate (the higher, if it carries
 * more than one line), its signedAt, AND its partnerId, so the caller can pay a
 * share of that rate to the OPENER (not the renewal deal's owner) AND anchor the
 * origination window to the account OPENING rather than to the renewal (otherwise
 * the override would never expire per account). Pass the account's EXISTING closed
 * deals; the deal being recorded has no lines yet, so it is never itself the opener.
 * Returns null when no deal on the account carries an origination line, so the
 * OVERRIDE safely refuses (nothing to trail). A `signedAt` of null sorts last, so a
 * dated opener is always preferred. Pure: it takes already-derived rates.
 */
export function originationOpener(
  deals: Array<{ signedAt: Date | null; originationRateBps: number[]; partnerId?: string }>,
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
  return { rateBp: Math.max(...opener.originationRateBps), signedAt: opener.signedAt, partnerId: opener.partnerId };
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

/**
 * Decide what a recompute should do with a deal's FOCUS_BONUS line, so the bonus
 * is applied exactly once and a settled line is never re-scaled or duplicated.
 * `existingStatus` is the status of the deal's current NON-REVERSED FOCUS_BONUS
 * line, or null when none exists (a fully reversed line counts as none).
 *  - no existing line, positive bonus        -> "create"
 *  - an ACCRUED/PAYABLE line, positive bonus  -> "update" (re-scale the open line)
 *  - a PAID (or otherwise settled) line        -> "skip" (never mutate, never duplicate)
 *  - no positive bonus                         -> "skip"
 */
export type FocusBonusRecomputeAction = "create" | "update" | "skip";
export function focusBonusRecomputeAction(
  bonusBp: number,
  existingStatus: "ACCRUED" | "PAYABLE" | "PAID" | "REVERSED" | null,
): FocusBonusRecomputeAction {
  if (existingStatus === null) return bonusBp > 0 ? "create" : "skip";
  if (existingStatus === "ACCRUED" || existingStatus === "PAYABLE") return bonusBp > 0 ? "update" : "skip";
  // PAID (settled) or an unexpected reversed status: leave it, and never duplicate.
  return "skip";
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
// Objective company-newness classification (commission redesign)
//
// The redesign removes human judgment from origination pricing. Three facts,
// each observable and dispute-proof, decide the rate: the company's canonical
// DOMAIN (identity), its NEWNESS state (New/Dormant/Existing), and the SALE
// AMOUNT versus a high-value threshold. The functions below are pure and take
// their "now" injected, so the derivation is fully unit-testable.
// ---------------------------------------------------------------------------

export type NewnessState = "NEW" | "DORMANT" | "EXISTING";

/**
 * Canonicalize a company domain so newness keys on ONE stable identity: lowercased,
 * scheme and a leading "www." stripped, any path/query/fragment removed, surrounding
 * dots trimmed. Returns null for empty input. "https://WWW.Acme.com/careers" and
 * "acme.com" both normalize to "acme.com", so the same company is never miscounted
 * as two. Used on every write (stored normalized) and on the newness read.
 */
export function normalizeDomain(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.trim().toLowerCase();
  if (d.length === 0) return null;
  d = d.replace(/^https?:\/\//, "");
  d = d.replace(/^www\./, "");
  d = d.split("/")[0].split("?")[0].split("#")[0];
  d = d.replace(/^\.+/, "").replace(/\.+$/, "").trim();
  return d.length > 0 ? d : null;
}

/**
 * The newness of a company, keyed by canonical domain, decided objectively from
 * its closed-deal history rather than operator judgment. Pass the domain's PRIOR
 * closed deals (exclude the deal being recorded, exactly like
 * {@link originationOpener}); each carries its activity dates. "Most recent
 * activity" is anchored on the LATEST of signedAt and paymentClearedAt across
 * those deals, the two dates that mark a real, money-bearing touch on the account.
 *   - NEW      the domain has never appeared on a closed deal (empty history).
 *   - EXISTING most recent activity is within originationWindowMonths of `now`,
 *              INCLUSIVE of the exact boundary: activity exactly N months ago is
 *              Existing, not Dormant.
 *   - DORMANT  it appeared, but its most recent activity is strictly older than
 *              the window.
 * A history row with no datable activity at all cannot be shown to be recent, so
 * the conservative choice is EXISTING: it denies the Strong-rate windfall rather
 * than grant it on missing data. Pure: no clock is read; `now` is injected.
 */
export function companyNewnessState(
  priorDeals: Array<{ signedAt: Date | null; paymentClearedAt: Date | null }>,
  now: Date,
  cfg: EffectiveConfig,
): NewnessState {
  if (priorDeals.length === 0) return "NEW";
  let mostRecent = Number.NEGATIVE_INFINITY;
  for (const d of priorDeals) {
    if (d.signedAt) mostRecent = Math.max(mostRecent, d.signedAt.getTime());
    if (d.paymentClearedAt) mostRecent = Math.max(mostRecent, d.paymentClearedAt.getTime());
  }
  // Appeared, but no datable activity: cannot prove recency, so stay conservative.
  // Program rule (owner-confirmed): on incomplete data we NEVER grant the special
  // Strong rate. A genuinely new company will have clean dates; a dateless history
  // row is treated as EXISTING (Qualified only), never Dormant (which would allow
  // Strong). This can only ever under-grant, never over-pay, on missing data.
  if (mostRecent === Number.NEGATIVE_INFINITY) return "EXISTING";
  const boundary = addMonths(now, -cfg.originationWindowMonths).getTime();
  // Inclusive on the boundary: exactly N months ago counts as Existing.
  return mostRecent >= boundary ? "EXISTING" : "DORMANT";
}

export interface OriginationClassification {
  /** The enum value the server RECORDS (never operator-chosen). */
  function: "QUALIFIED_ORIGINATION" | "STRONG_ORIGINATION";
  /** The rate actually paid (basis points). */
  rateBp: number;
  /** New or Dormant domain: a new company, so it counts toward the Growth Bonus by domain. */
  isNewCompany: boolean;
  /** True only when the Strong rate is actually paid (new company AND above threshold). */
  paidStrongRate: boolean;
  /** Dispute-proof explanation of why this classification and rate apply. */
  reason: string;
}

/**
 * Derive the origination classification AND rate objectively from the newness
 * state, the deal kind, and the sale amount versus the high-value threshold for
 * that kind. The operator never chooses strength; the server derives it.
 *   - No domain            Qualified only. The Strong rate and Growth-Bonus credit
 *                          both require a canonical company domain.
 *   - Existing company     Qualified on the new unit; the Strong rate is never
 *                          available on an existing company.
 *   - New/Dormant company  a new-company origination. Pays the Strong rate ONLY
 *                          when the sale is STRICTLY above the threshold; otherwise
 *                          it keeps its new-company classification (recorded as
 *                          STRONG_ORIGINATION so it still counts toward the Growth
 *                          Bonus by domain and anchors the override opener at the
 *                          rate actually paid) but pays the Qualified rate.
 * "Strictly above": a sale exactly AT the threshold is not above it.
 */
export function classifyOrigination(args: {
  newness: NewnessState;
  hasDomain: boolean;
  dealKind: DealKind;
  saleAmountCents: number;
  cfg: EffectiveConfig;
}): OriginationClassification {
  const { newness, hasDomain, dealKind, saleAmountCents, cfg } = args;
  const qualifiedRate = dealKind === "B2B" ? cfg.qualifiedOriginationB2bBp : cfg.qualifiedOriginationB2cBp;
  const strongRate = dealKind === "B2B" ? cfg.strongOriginationB2bBp : cfg.strongOriginationB2cBp;
  const threshold = dealKind === "B2B" ? cfg.strongValueThresholdB2bCents : cfg.strongValueThresholdB2cCents;

  if (!hasDomain) {
    return {
      function: "QUALIFIED_ORIGINATION",
      rateBp: qualifiedRate,
      isNewCompany: false,
      paidStrongRate: false,
      reason: "No company domain recorded: Qualified Origination only. The Strong rate and Growth-Bonus credit both require a canonical company domain.",
    };
  }
  if (newness === "EXISTING") {
    return {
      function: "QUALIFIED_ORIGINATION",
      rateBp: qualifiedRate,
      isNewCompany: false,
      paidStrongRate: false,
      reason: "Existing company (recent activity on this domain): Qualified Origination on the new unit. The Strong rate is not available on an existing company.",
    };
  }
  // New or Dormant: a new-company origination.
  const aboveThreshold = saleAmountCents > threshold;
  if (aboveThreshold) {
    return {
      function: "STRONG_ORIGINATION",
      rateBp: strongRate,
      isNewCompany: true,
      paidStrongRate: true,
      reason: `New or Dormant company and the sale is above the ${dealKind} high-value threshold: Strong Origination.`,
    };
  }
  return {
    function: "STRONG_ORIGINATION",
    rateBp: qualifiedRate,
    isNewCompany: true,
    paidStrongRate: false,
    reason: `New or Dormant company but the sale is at or below the ${dealKind} high-value threshold: recorded as a new-company origination (so it still counts toward the Growth Bonus and anchors the override opener) but paid at the Qualified rate.`,
  };
}

/** The single, config-sourced delivery rate (bp). Operators never pick within a band. */
export function deliverySingleRateBp(cfg: EffectiveConfig): number {
  return cfg.deliveryPercentBp;
}

export type LinePrecheck = { ok: true } | { ok: false; message: string };

/**
 * Objective preconditions a manual commission line must satisfy before it may be
 * created. Pure, so the exact rule is unit-tested and the server action stays a
 * thin wrapper. Closing needs a signed date; Delivery needs a delivered date and
 * only a superadmin (with a logged reason) may take the fixed-fee exception; Basic
 * Introduction needs an explicit warm-relationship attestation.
 */
export function commissionLinePrecheck(args: {
  fn: PartnerFunction;
  signedAt: Date | null;
  deliveredAt: Date | null;
  warmRelationshipAttested: boolean;
  fixedFee: { requested: boolean; isSuperAdmin: boolean; reason: string };
}): LinePrecheck {
  switch (args.fn) {
    case "CLOSING":
      if (!args.signedAt) {
        return { ok: false, message: "Closing commission requires a recorded signed date (signedAt) on the deal. Record the signed date first." };
      }
      return { ok: true };
    case "DELIVERY":
      if (!args.deliveredAt) {
        return { ok: false, message: "Delivery commission requires a recorded delivered date (deliveredAt) on the deal. Record delivery first." };
      }
      if (args.fixedFee.requested) {
        if (!args.fixedFee.isSuperAdmin) {
          return { ok: false, message: "A fixed-fee delivery is a superadmin-only exception. The single configured delivery rate applies otherwise." };
        }
        if (args.fixedFee.reason.trim().length < 5) {
          return { ok: false, message: "A fixed-fee delivery exception requires a logged reason (at least 5 characters)." };
        }
      }
      return { ok: true };
    case "BASIC_INTRO":
      if (!args.warmRelationshipAttested) {
        return { ok: false, message: "Basic Introduction requires an explicit warm-relationship attestation confirming a genuine pre-existing relationship, plus the evidence note describing who the person is." };
      }
      return { ok: true };
    default:
      return { ok: true };
  }
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
 * context, using the per-function helpers above: no operator types a percentage.
 * Note on the redesign: origination strength is decided objectively by
 * {@link classifyOrigination} (domain newness + sale amount), and delivery pays the
 * single {@link deliverySingleRateBp}. The origination branches here are retained for
 * back-compat with a known strength, but the server action classifies origination
 * before it ever reaches this function.
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
      // The single configured delivery rate. The old min/max band and FIXED_FEE mode are
      // retired: a fixed fee is now a per-line superadmin exception, not a config mode.
      return { kind: "PERCENT", rateBp: deliverySingleRateBp(ctx.cfg) };
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
  /**
   * Weighted split: when one genuinely shared function is split among partners, each
   * line carries the FULL function rate and a `weightBp` share. Lines of the same
   * function that carry a weightBp form ONE group: counted once against the cap and
   * split among the partners by weight, so the shared lines together equal exactly
   * what a single unshared line would have been. Null means a whole, unshared line.
   */
  weightBp?: number;
  /**
   * For a weighted line whose group is only PARTIALLY present (some siblings already
   * settled and excluded from this computation), the cents of the group already
   * settled outside it. The group's present portion is then clamped to the remaining
   * budget (full amount minus settled), so no settlement order and no partner count can
   * ever pay the group more than one unshared line. Zero/undefined when fully present.
   */
  groupSettledCents?: number;
}

export interface ComputedEntry {
  function: PartnerFunction;
  partnerId?: string;
  weightBp?: number;
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
 * Split an integer `total` among `weights`, cents-exact: the sum of the parts always
 * equals `total` (any rounding remainder goes to the largest weight first). Shares are
 * relative to the SUM of the weights, so an incomplete split never loses or mints cents.
 */
function splitByWeight(total: number, weights: number[]): number[] {
  const wsum = weights.reduce((s, w) => s + w, 0);
  if (weights.length === 0) return [];
  if (wsum <= 0) return weights.map(() => 0);
  const base = weights.map((w) => Math.floor((total * w) / wsum));
  let remainder = total - base.reduce((s, a) => s + a, 0);
  const order = weights.map((w, i) => [w, i] as const).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
  for (let k = 0; remainder > 0 && k < order.length; k++) {
    base[order[k]] += 1;
    remainder -= 1;
  }
  return base;
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

  // Per-line raw amounts. A weighted line carries its function's FULL amount here
  // (its stored rateBp is the full function rate); the split is applied per unit below.
  const raw: ComputedEntry[] = functions.map((f) => {
    const isFlat = f.flatCents != null;
    const amount = isFlat ? (f.flatCents as number) : bpToCents(netReceiptsCents, f.rateBp ?? 0);
    const rateBp = isFlat ? centsToBp(f.flatCents as number, netReceiptsCents) : (f.rateBp ?? 0);
    return { function: f.function, partnerId: f.partnerId, weightBp: f.weightBp ?? undefined, rateBp, baseAmountCents: netReceiptsCents, amountCents: amount, isFlat };
  });

  // Group into UNITS so a weighted split of one function is counted ONCE against the
  // cap (never double-counted) and its partner lines together equal exactly one
  // unshared line, before and after cap scaling. A weighted group = same-function
  // lines that carry a weightBp; every other line is its own singleton unit. With no
  // weightBp anywhere, every unit is a singleton and the result is identical to before.
  //
  // weightBp is an ABSOLUTE share of the full function amount (share of 10000), NOT a
  // share relative to whichever siblings are present. So a group's logical amount is the
  // full amount scaled by the SUM of its present weights: if a sibling has already been
  // paid or reversed (and so is not in this recompute batch), the surviving line keeps
  // its own share instead of being reinflated back to the full amount. The paid sibling's
  // share is carried in committedExternalCents, so paid + recomputed still equals the full
  // function amount, and the cap stays airtight.
  type Unit = { indices: number[]; isFlat: boolean; weighted: boolean; logicalAmount: number; weights: number[]; settledCents: number };
  const units: Unit[] = [];
  const groupByFn = new Map<PartnerFunction, number>();
  functions.forEach((f, i) => {
    if (f.weightBp != null) {
      const existing = groupByFn.get(f.function);
      if (existing != null) {
        units[existing].indices.push(i);
        units[existing].weights.push(f.weightBp);
        return;
      }
      groupByFn.set(f.function, units.length);
      units.push({ indices: [i], isFlat: raw[i].isFlat, weighted: true, logicalAmount: raw[i].amountCents, weights: [f.weightBp], settledCents: Math.max(0, f.groupSettledCents ?? 0) });
    } else {
      units.push({ indices: [i], isFlat: raw[i].isFlat, weighted: false, logicalAmount: raw[i].amountCents, weights: [1], settledCents: 0 });
    }
  });
  // A weighted group's logical amount is the PRESENT weighted portion of the full
  // function amount (absolute weights), so an absent sibling is never reinflated. The
  // floored per-weight share keeps a fully-present group exact (weights sum to 10000 =>
  // floor(full) == full), and clamping to the REMAINING BUDGET (full minus what siblings
  // already settled) guarantees that under ANY settlement order and ANY partner count the
  // group can never pay more than one unshared line: settled + present <= full, always.
  for (const u of units) {
    if (!u.weighted) continue;
    const wsum = u.weights.reduce((s, w) => s + w, 0);
    const full = raw[u.indices[0]].amountCents;
    const floorShare = Math.floor((full * wsum) / 10000);
    const remainingBudget = Math.max(0, full - u.settledCents);
    u.logicalAmount = Math.min(floorShare, remainingBudget);
  }

  const flatTotal = units.filter((u) => u.isFlat).reduce((s, u) => s + u.logicalAmount, 0);
  const percentUnits = units.filter((u) => !u.isFlat);
  const rateRaw = percentUnits.reduce((s, u) => s + u.logicalAmount, 0);
  const rawTotalCents = flatTotal + rateRaw;
  const capForRate = Math.max(0, capAvailable - flatTotal);
  const overCap = flatTotal > capAvailable;

  const uncapped = rateRaw <= capForRate;
  // Scale only the percentage UNITS to fit the headroom left by fixed fees and any
  // already-committed amounts; fixed fees are committed and never scaled.
  const scaledPercent = uncapped
    ? percentUnits.map((u) => u.logicalAmount)
    : scaleToTarget(percentUnits.map((u) => u.logicalAmount), capForRate);

  // Give each unit its final amount, then split it among the unit's lines by weight.
  const amounts = new Array<number>(functions.length).fill(0);
  let pi = 0;
  for (const u of units) {
    const finalAmount = u.isFlat ? u.logicalAmount : scaledPercent[pi++];
    const parts = splitByWeight(finalAmount, u.weights);
    u.indices.forEach((idx, k) => {
      amounts[idx] = parts[k];
    });
  }
  const entries = raw.map((e, i) => ({ ...e, amountCents: amounts[i] }));

  const totalCents = uncapped ? flatTotal + rateRaw : flatTotal + capForRate;
  const capped = uncapped ? committedExternalCents + totalCents > capCents : true;
  return { entries, capBp, capCents, rawTotalCents, totalCents, capped, overCap };
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
