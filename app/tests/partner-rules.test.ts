import { describe, expect, it } from "vitest";
import { PROGRAM_CONFIG_DEFAULTS, type EffectiveConfig } from "../src/lib/partner/config";
import {
  accountIsLapsed,
  addBusinessDays,
  addDays,
  addHours,
  addMonths,
  commissionPayableOn,
  firstRightExpiry,
  isMajorNewEngagement,
  maxOpenAccountsNow,
  originationWindowEnd,
  pilotDayNumber,
  pilotEndDate,
  pipelineProtectionExpiry,
  tierEligibility,
  trailPeriodEnd,
  withinOriginationWindow,
} from "../src/lib/partner/rules";

const cfg: EffectiveConfig = PROGRAM_CONFIG_DEFAULTS;
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("date math", () => {
  it("adds days and hours", () => {
    expect(iso(addDays(new Date("2026-01-01T00:00:00Z"), 30))).toBe("2026-01-31");
    expect(addHours(new Date("2026-01-01T00:00:00Z"), 48).toISOString()).toBe("2026-01-03T00:00:00.000Z");
  });
  it("adds months, clamping to the target month length", () => {
    expect(iso(addMonths(new Date("2026-01-15T12:00:00Z"), 12))).toBe("2027-01-15");
    // Jan 31 + 1 month -> Feb 28 (2026 is not a leap year)
    expect(iso(addMonths(new Date("2026-01-31T12:00:00Z"), 1))).toBe("2026-02-28");
  });
  it("adds business days, skipping weekends", () => {
    // Friday 2026-01-02 + 1 business day -> Monday 2026-01-05
    expect(iso(addBusinessDays(new Date("2026-01-02T12:00:00Z"), 1))).toBe("2026-01-05");
    // Friday + 5 business days -> next Friday
    expect(iso(addBusinessDays(new Date("2026-01-02T12:00:00Z"), 5))).toBe("2026-01-09");
  });
});

describe("commercial windows", () => {
  it("trail and origination windows are 12 months", () => {
    const start = new Date("2026-03-01T00:00:00Z");
    expect(iso(trailPeriodEnd(start, cfg))).toBe("2027-03-01");
    expect(iso(originationWindowEnd(start, cfg))).toBe("2027-03-01");
  });
  it("withinOriginationWindow is true before the end and false at/after it", () => {
    const start = new Date("2026-03-01T00:00:00Z");
    expect(withinOriginationWindow(start, new Date("2027-02-28T00:00:00Z"), cfg)).toBe(true);
    expect(withinOriginationWindow(start, new Date("2027-03-01T00:00:00Z"), cfg)).toBe(false);
  });
  it("pipeline protection and first right read config", () => {
    const at = new Date("2026-03-01T00:00:00Z");
    expect(iso(pipelineProtectionExpiry(at, "TIER1", cfg))).toBe(iso(addDays(at, 120)));
    expect(iso(pipelineProtectionExpiry(at, "TIER3", cfg))).toBe(iso(addDays(at, 180)));
    expect(firstRightExpiry(at, cfg).toISOString()).toBe(addHours(at, 48).toISOString());
  });
});

describe("commission payable timing (both conditions, later event + N business days)", () => {
  const delivered = new Date("2026-04-10T00:00:00Z"); // Friday
  const cleared = new Date("2026-04-15T00:00:00Z"); // Wednesday (later)
  it("is null until both delivery and cleared payment exist", () => {
    expect(commissionPayableOn(null, cleared, cfg)).toBeNull();
    expect(commissionPayableOn(delivered, null, cfg)).toBeNull();
  });
  it("is N business days after the later of the two events", () => {
    const due = commissionPayableOn(delivered, cleared, cfg);
    expect(due).not.toBeNull();
    expect(due!.toISOString()).toBe(addBusinessDays(cleared, 30).toISOString());
  });
});

describe("pilot", () => {
  it("computes the pilot end date and day number", () => {
    const start = new Date("2026-06-01T00:00:00Z");
    expect(iso(pilotEndDate(start, cfg))).toBe(iso(addDays(start, 90)));
    expect(pilotDayNumber(start, start)).toBe(1);
    expect(pilotDayNumber(start, addDays(start, 13))).toBe(14);
  });
});

describe("account limits & lapse", () => {
  const pilotStart = new Date("2026-06-01T00:00:00Z");
  it("caps Tier-1 pilot accounts to 2 in the first 30 days without progress", () => {
    expect(maxOpenAccountsNow({ tier: "TIER1", pilotStart, now: addDays(pilotStart, 10), cfg })).toBe(2);
    expect(maxOpenAccountsNow({ tier: "TIER1", pilotStart, now: addDays(pilotStart, 40), cfg })).toBe(3);
    expect(
      maxOpenAccountsNow({ tier: "TIER1", pilotStart, now: addDays(pilotStart, 10), meaningfulProgress: true, cfg }),
    ).toBe(3);
  });
  it("uses the tier base for Tier 2/3", () => {
    expect(maxOpenAccountsNow({ tier: "TIER2", now: pilotStart, cfg })).toBe(5);
    expect(maxOpenAccountsNow({ tier: "TIER3", now: pilotStart, cfg })).toBe(10);
  });
  it("lapses a quiet account past its tier cadence", () => {
    const last = new Date("2026-06-01T00:00:00Z");
    expect(accountIsLapsed(last, "TIER1", addDays(last, 20), cfg)).toBe(false);
    expect(accountIsLapsed(last, "TIER1", addDays(last, 40), cfg)).toBe(true);
    expect(accountIsLapsed(last, "TIER3", addDays(last, 40), cfg)).toBe(false); // 60-day cadence
    expect(accountIsLapsed(null, "TIER1", addDays(last, 999), cfg)).toBe(false);
  });
});

describe("major new engagement & tier eligibility", () => {
  it("a new engagement or a big enough expansion is 'major'", () => {
    expect(isMajorNewEngagement({ isNewEngagement: true }, cfg)).toBe(true);
    expect(isMajorNewEngagement({ isNewEngagement: false, expansionSeats: 15 }, cfg)).toBe(true);
    expect(isMajorNewEngagement({ isNewEngagement: false, expansionSeats: 14 }, cfg)).toBe(false);
  });
  it("computes tier eligibility from seats (panel confirmation still required)", () => {
    expect(
      tierEligibility({ currentTier: "TIER1", paidSeatsInWindow: 40, focusSeatsInWindow: 0, holdsTier2: false }, cfg),
    ).toEqual({ eligibleForTier2: true, eligibleForTier3: false });
    expect(
      tierEligibility({ currentTier: "TIER2", paidSeatsInWindow: 60, focusSeatsInWindow: 15, holdsTier2: true }, cfg),
    ).toEqual({ eligibleForTier2: true, eligibleForTier3: true });
    expect(
      tierEligibility({ currentTier: "TIER1", paidSeatsInWindow: 39, focusSeatsInWindow: 20, holdsTier2: false }, cfg),
    ).toEqual({ eligibleForTier2: false, eligibleForTier3: false });
  });
});
