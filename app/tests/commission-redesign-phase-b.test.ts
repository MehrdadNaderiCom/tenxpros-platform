import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  bpToCents,
  classifyOrigination,
  commissionLinePrecheck,
  companyNewnessState,
  computeDealCommission,
  deliverySingleRateBp,
  normalizeDomain,
  type NewnessState,
} from "../src/lib/partner/commission";
import { PROGRAM_CONFIG_DEFAULTS } from "../src/lib/partner/config";
import { addMonths } from "../src/lib/partner/rules";

const cfg = PROGRAM_CONFIG_DEFAULTS;
const NOW = new Date("2026-07-03T00:00:00.000Z");
// The window boundary: exactly originationWindowMonths (12) before NOW.
const BOUNDARY = addMonths(NOW, -cfg.originationWindowMonths); // 2025-07-03T00:00:00Z

function deal(signedAt: Date | null, paymentClearedAt: Date | null = null) {
  return { signedAt, paymentClearedAt };
}

// ---------------------------------------------------------------------------
// Company newness state: New / Dormant / Existing, incl. the exact boundary
// ---------------------------------------------------------------------------

describe("companyNewnessState: the three states and the 12-month boundary", () => {
  it("NEW when the domain has never appeared on a closed deal", () => {
    expect(companyNewnessState([], NOW, cfg)).toBe("NEW");
  });

  it("EXISTING when the most recent activity is within the window", () => {
    expect(companyNewnessState([deal(addMonths(NOW, -3))], NOW, cfg)).toBe("EXISTING");
  });

  it("EXISTING exactly at the boundary (activity exactly 12 months ago is Existing, not Dormant)", () => {
    expect(companyNewnessState([deal(new Date(BOUNDARY))], NOW, cfg)).toBe("EXISTING");
  });

  it("DORMANT one millisecond past the boundary (strictly older than the window)", () => {
    expect(companyNewnessState([deal(new Date(BOUNDARY.getTime() - 1))], NOW, cfg)).toBe("DORMANT");
  });

  it("DORMANT when the most recent activity is well outside the window", () => {
    expect(companyNewnessState([deal(addMonths(NOW, -18))], NOW, cfg)).toBe("DORMANT");
  });

  it("anchors on the LATEST of signedAt and paymentClearedAt across all the domain's deals", () => {
    // Signed long ago, but payment cleared recently: recency wins -> EXISTING.
    const recentlyCleared = deal(addMonths(NOW, -20), addMonths(NOW, -2));
    expect(companyNewnessState([recentlyCleared], NOW, cfg)).toBe("EXISTING");
    // Two deals: the more recent one anchors recency.
    expect(companyNewnessState([deal(addMonths(NOW, -30)), deal(addMonths(NOW, -1))], NOW, cfg)).toBe("EXISTING");
  });

  it("EXISTING (conservative) when the domain appeared but has no datable activity", () => {
    expect(companyNewnessState([deal(null, null)], NOW, cfg)).toBe("EXISTING");
  });
});

// ---------------------------------------------------------------------------
// Origination classification and rate: all four combinations, B2B and B2C
// ---------------------------------------------------------------------------

describe("classifyOrigination: B2B, the seat test with the New/Dormant domain", () => {
  const kind = "B2B" as const;
  const strong = cfg.strongOriginationB2bBp; // 1200
  const qualified = cfg.qualifiedOriginationB2bBp; // 800
  const seats = cfg.strongSeatThresholdB2b; // 10

  it("Existing company + new unit: QUALIFIED, qualified rate, never Strong (whatever the seats)", () => {
    const r = classifyOrigination({ newness: "EXISTING", hasDomain: true, dealKind: kind, seatCount: seats + 50, cfg });
    expect(r.function).toBe("QUALIFIED_ORIGINATION");
    expect(r.rateBp).toBe(qualified);
    expect(r.isNewCompany).toBe(false);
    expect(r.paidStrongRate).toBe(false);
  });

  it.each(["NEW", "DORMANT"] as NewnessState[])("New/Dormant (%s) AT the seat threshold: STRONG rate (inclusive)", (newness) => {
    const r = classifyOrigination({ newness, hasDomain: true, dealKind: kind, seatCount: seats, cfg });
    expect(r.function).toBe("STRONG_ORIGINATION");
    expect(r.rateBp).toBe(strong);
    expect(r.isNewCompany).toBe(true);
    expect(r.paidStrongRate).toBe(true);
  });

  it("New/Dormant ONE BELOW the seat threshold: keeps new-company class, pays Qualified rate", () => {
    const r = classifyOrigination({ newness: "NEW", hasDomain: true, dealKind: kind, seatCount: seats - 1, cfg });
    expect(r.function).toBe("STRONG_ORIGINATION"); // new-company classification kept
    expect(r.rateBp).toBe(qualified); // but paid at the Qualified rate
    expect(r.isNewCompany).toBe(true); // still counts toward the Growth Bonus
    expect(r.paidStrongRate).toBe(false);
  });

  it("New/Dormant with NO paid-collected seats (null): Qualified rate, class kept, never Strong on missing data", () => {
    const r = classifyOrigination({ newness: "DORMANT", hasDomain: true, dealKind: kind, seatCount: null, cfg });
    expect(r.function).toBe("STRONG_ORIGINATION");
    expect(r.rateBp).toBe(qualified);
    expect(r.isNewCompany).toBe(true);
    expect(r.paidStrongRate).toBe(false);
  });

  it("No domain: QUALIFIED only, cannot be Strong, does not count toward the Growth Bonus", () => {
    const r = classifyOrigination({ newness: "NEW", hasDomain: false, dealKind: kind, seatCount: seats + 100, cfg });
    expect(r.function).toBe("QUALIFIED_ORIGINATION");
    expect(r.rateBp).toBe(qualified);
    expect(r.isNewCompany).toBe(false);
    expect(r.paidStrongRate).toBe(false);
  });
});

describe("classifyOrigination: B2C is person-level, seats ONLY (the domain plays no role)", () => {
  const kind = "B2C" as const;
  const strong = cfg.strongOriginationB2cBp; // 1500
  const qualified = cfg.qualifiedOriginationB2cBp; // 1000
  const seats = cfg.strongSeatThresholdB2c; // 15

  it("AT the seat threshold: STRONG rate, even with NO domain (a person is not a domain)", () => {
    const r = classifyOrigination({ newness: "NEW", hasDomain: false, dealKind: kind, seatCount: seats, cfg });
    expect(r.function).toBe("STRONG_ORIGINATION");
    expect(r.rateBp).toBe(strong);
    expect(r.paidStrongRate).toBe(true);
    expect(r.isNewCompany).toBe(false); // B2C never feeds the (B2B-only) Growth Bonus
  });

  it("ONE BELOW the seat threshold: QUALIFIED, whatever the domain newness says", () => {
    const r = classifyOrigination({ newness: "NEW", hasDomain: true, dealKind: kind, seatCount: seats - 1, cfg });
    expect(r.function).toBe("QUALIFIED_ORIGINATION");
    expect(r.rateBp).toBe(qualified);
    expect(r.paidStrongRate).toBe(false);
  });

  it("NO paid-collected seats (null): QUALIFIED, never Strong on missing data", () => {
    const r = classifyOrigination({ newness: "DORMANT", hasDomain: true, dealKind: kind, seatCount: null, cfg });
    expect(r.function).toBe("QUALIFIED_ORIGINATION");
    expect(r.rateBp).toBe(qualified);
    expect(r.paidStrongRate).toBe(false);
  });

  it("an Existing domain does NOT block a seat-qualified B2C strong (domain is irrelevant on B2C)", () => {
    const r = classifyOrigination({ newness: "EXISTING", hasDomain: true, dealKind: kind, seatCount: seats + 5, cfg });
    expect(r.function).toBe("STRONG_ORIGINATION");
    expect(r.rateBp).toBe(strong);
    expect(r.paidStrongRate).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Line preconditions: Closing / Delivery / fixed-fee exception / Basic Intro
// ---------------------------------------------------------------------------

const NO_FIXED_FEE = { requested: false, isSuperAdmin: false, reason: "" };

describe("commissionLinePrecheck: gates for each function", () => {
  it("CLOSING refused without a signed date, allowed with one", () => {
    expect(commissionLinePrecheck({ fn: "CLOSING", signedAt: null, deliveredAt: null, warmRelationshipAttested: false, fixedFee: NO_FIXED_FEE }).ok).toBe(false);
    expect(commissionLinePrecheck({ fn: "CLOSING", signedAt: NOW, deliveredAt: null, warmRelationshipAttested: false, fixedFee: NO_FIXED_FEE }).ok).toBe(true);
  });

  it("DELIVERY refused without a delivered date, allowed with one (single rate path)", () => {
    expect(commissionLinePrecheck({ fn: "DELIVERY", signedAt: NOW, deliveredAt: null, warmRelationshipAttested: false, fixedFee: NO_FIXED_FEE }).ok).toBe(false);
    expect(commissionLinePrecheck({ fn: "DELIVERY", signedAt: NOW, deliveredAt: NOW, warmRelationshipAttested: false, fixedFee: NO_FIXED_FEE }).ok).toBe(true);
  });

  it("Fixed-fee delivery refused for a non-superadmin", () => {
    const r = commissionLinePrecheck({ fn: "DELIVERY", signedAt: NOW, deliveredAt: NOW, warmRelationshipAttested: false, fixedFee: { requested: true, isSuperAdmin: false, reason: "special client" } });
    expect(r.ok).toBe(false);
  });

  it("Fixed-fee delivery refused for a superadmin with no logged reason", () => {
    const r = commissionLinePrecheck({ fn: "DELIVERY", signedAt: NOW, deliveredAt: NOW, warmRelationshipAttested: false, fixedFee: { requested: true, isSuperAdmin: true, reason: "" } });
    expect(r.ok).toBe(false);
  });

  it("Fixed-fee delivery allowed for a superadmin WITH a logged reason", () => {
    const r = commissionLinePrecheck({ fn: "DELIVERY", signedAt: NOW, deliveredAt: NOW, warmRelationshipAttested: false, fixedFee: { requested: true, isSuperAdmin: true, reason: "negotiated flat retainer" } });
    expect(r.ok).toBe(true);
  });

  it("BASIC_INTRO refused without an attestation, allowed with one", () => {
    expect(commissionLinePrecheck({ fn: "BASIC_INTRO", signedAt: NOW, deliveredAt: NOW, warmRelationshipAttested: false, fixedFee: NO_FIXED_FEE }).ok).toBe(false);
    expect(commissionLinePrecheck({ fn: "BASIC_INTRO", signedAt: NOW, deliveredAt: NOW, warmRelationshipAttested: true, fixedFee: NO_FIXED_FEE }).ok).toBe(true);
  });

  it("functions with no precondition (OVERRIDE, GROWTH_BONUS, origination) pass the precheck", () => {
    for (const fn of ["OVERRIDE", "GROWTH_BONUS", "QUALIFIED_ORIGINATION", "STRONG_ORIGINATION"] as const) {
      expect(commissionLinePrecheck({ fn, signedAt: null, deliveredAt: null, warmRelationshipAttested: false, fixedFee: NO_FIXED_FEE }).ok).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Delivery single rate, and legacy-shaped deals compute identically
// ---------------------------------------------------------------------------

describe("delivery single rate", () => {
  it("deliverySingleRateBp returns exactly the configured deliveryPercentBp", () => {
    expect(deliverySingleRateBp(cfg)).toBe(cfg.deliveryPercentBp);
    expect(deliverySingleRateBp(cfg)).toBe(800);
  });

  it("a delivery line pays exactly deliveryPercentBp of net receipts", () => {
    const net = 250000;
    const r = computeDealCommission({
      netReceiptsCents: net,
      dealKind: "B2B",
      config: cfg,
      functions: [{ function: "DELIVERY", rateBp: deliverySingleRateBp(cfg) }],
    });
    expect(r.entries[0].amountCents).toBe(bpToCents(net, cfg.deliveryPercentBp));
  });
});

describe("legacy-shaped single-partner deals compute identically once the gates are satisfied", () => {
  it("B2B new-company-at-seat-threshold full stack: Strong 12% + Closing 10% + Delivery 8% = the 30% cap", () => {
    const net = 2_000_000;
    const strong = classifyOrigination({ newness: "NEW", hasDomain: true, dealKind: "B2B", seatCount: cfg.strongSeatThresholdB2b, cfg });
    expect(strong.rateBp).toBe(cfg.strongOriginationB2bBp);
    const r = computeDealCommission({
      netReceiptsCents: net,
      dealKind: "B2B",
      config: cfg,
      functions: [
        { function: "STRONG_ORIGINATION", rateBp: strong.rateBp },
        { function: "CLOSING", rateBp: cfg.closingB2bBp },
        { function: "DELIVERY", rateBp: deliverySingleRateBp(cfg) },
      ],
    });
    expect(r.totalCents).toBe(bpToCents(net, cfg.capB2bBp)); // exactly the 30% cap
    expect(r.capped).toBe(false);
  });

  it("B2C existing-company full stack: Qualified 10% + Closing 5% + Delivery 8% = 23% under the cap", () => {
    const net = 400000;
    const qualified = classifyOrigination({ newness: "EXISTING", hasDomain: true, dealKind: "B2C", seatCount: cfg.strongSeatThresholdB2c - 1, cfg });
    expect(qualified.rateBp).toBe(cfg.qualifiedOriginationB2cBp);
    const r = computeDealCommission({
      netReceiptsCents: net,
      dealKind: "B2C",
      config: cfg,
      functions: [
        { function: "QUALIFIED_ORIGINATION", rateBp: qualified.rateBp },
        { function: "CLOSING", rateBp: cfg.closingB2cBp },
        { function: "DELIVERY", rateBp: deliverySingleRateBp(cfg) },
      ],
    });
    expect(r.totalCents).toBe(bpToCents(net, 2300));
    expect(r.capped).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Domain canonicalization: one company is never miscounted as two
// ---------------------------------------------------------------------------

describe("normalizeDomain", () => {
  it("lowercases, strips scheme/www/path/query/fragment to a single canonical key", () => {
    expect(normalizeDomain("https://WWW.Acme.com/careers?x=1")).toBe("acme.com");
    expect(normalizeDomain("Acme.com")).toBe("acme.com");
    expect(normalizeDomain("www.acme.com")).toBe("acme.com");
    expect(normalizeDomain("http://acme.com/")).toBe("acme.com");
    expect(normalizeDomain("acme.com#team")).toBe("acme.com");
    expect(normalizeDomain("  ACME.COM  ")).toBe("acme.com");
  });

  it("returns null for empty / meaningless input", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain(null)).toBeNull();
    expect(normalizeDomain(undefined)).toBeNull();
    expect(normalizeDomain("   ")).toBeNull();
    expect(normalizeDomain("www.")).toBeNull();
  });

  it("collapses variant forms of the same company to one key (no double New-company credit)", () => {
    const forms = ["acme.com", "https://acme.com", "www.acme.com", "ACME.com/jobs"];
    const keys = new Set(forms.map((f) => normalizeDomain(f)));
    expect(keys.size).toBe(1);
    expect([...keys][0]).toBe("acme.com");
  });
});

// ---------------------------------------------------------------------------
// The server action actually wires the objective rules (source inspection)
// ---------------------------------------------------------------------------

describe("addCommissionLine wires the objective rules (server-derived, gated)", () => {
  const src = readFileSync(join(__dirname, "../src/lib/actions/partner-admin.ts"), "utf8");

  it("runs the precheck before any rate work", () => {
    expect(src).toContain("commissionLinePrecheck({");
    expect(src).toContain("if (!precheck.ok) return { ok: false, message: precheck.message }");
  });

  it("server-derives origination from newness by domain, across all partners, excluding this deal", () => {
    expect(src).toContain("companyNewnessState(");
    expect(src).toContain("classifyOrigination({");
    expect(src).toContain('mode: "insensitive"');
    expect(src).toContain("id: { not: deal.id }");
    expect(src).toContain("recordedFn = cls.function");
  });

  it("uses the single config-sourced delivery rate and gates the fixed-fee exception on superadmin", () => {
    expect(src).toContain("deliverySingleRateBp(cfg)");
    expect(src).toContain("isSuperAdmin(admin.email)");
  });

  it("stores the attestation flag only for Basic Introduction", () => {
    expect(src).toContain('warmRelationshipAttested: recordedFn === "BASIC_INTRO"');
  });

  it("records the server decision (submitted vs recorded function) in the audit trail", () => {
    expect(src).toContain("submittedFunction: fn");
  });

  it("normalizes the deal domain on the read side", () => {
    expect(src).toContain("normalizeDomain(deal.domain)");
  });
});

describe("the domain write-path is wired end-to-end (so the classification is reachable)", () => {
  const admin = readFileSync(join(__dirname, "../src/lib/actions/partner-admin.ts"), "utf8");
  const portal = readFileSync(join(__dirname, "../src/lib/actions/partner-portal.ts"), "utf8");

  it("recordClosedDeal stores a domain, inheriting the linked account's when none is entered", () => {
    // The closed-deal create must actually persist a domain (not omit it).
    expect(admin).toMatch(/closedDeal\.create\(\{[\s\S]*?\bdomain,/);
    expect(admin).toContain('normalizeDomain(formData.get("domain") as string | null)');
    expect(admin).toContain("registeredAccount.findUnique");
  });

  it("confirmDealRegistration copies the registration domain onto the new account", () => {
    expect(admin).toContain("domain: normalizeDomain(reg.domain)");
  });

  it("submitDealRegistration / resubmit persist the normalized submitted domain", () => {
    expect(portal).toContain('domain: formData.get("domain") || undefined');
    expect(portal).toContain("domain: normalizeDomain(data.domain)");
  });
});
