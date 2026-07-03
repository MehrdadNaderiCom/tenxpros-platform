import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { classifyOrigination, normalizeEntityName, similarName } from "../src/lib/partner/commission";
import { PROGRAM_CONFIG_DEFAULTS, CONFIG_FIELD_KEYS } from "../src/lib/partner/config";
import { CONFIG_FIELD_META } from "../src/lib/partner/constants";

const cfg = PROGRAM_CONFIG_DEFAULTS;

// ---------------------------------------------------------------------------
// Config: the seat thresholds are live, the dollar thresholds retained but retired.
// ---------------------------------------------------------------------------

describe("seat-threshold config", () => {
  it("adds the two seat thresholds with the confirmed starting values", () => {
    expect(cfg.strongSeatThresholdB2c).toBe(15);
    expect(cfg.strongSeatThresholdB2b).toBe(10);
    expect(CONFIG_FIELD_KEYS).toContain("strongSeatThresholdB2c");
    expect(CONFIG_FIELD_KEYS).toContain("strongSeatThresholdB2b");
    expect(CONFIG_FIELD_META.find((f) => f.key === "strongSeatThresholdB2c")?.group).toBe("Commission rates");
    expect(CONFIG_FIELD_META.find((f) => f.key === "strongSeatThresholdB2b")?.unit).toBe("seats");
  });

  it("retains the dollar thresholds additively, moved to the retired group", () => {
    expect(cfg.strongValueThresholdB2cCents).toBe(500000);
    expect(cfg.strongValueThresholdB2bCents).toBe(1500000);
    for (const k of ["strongValueThresholdB2cCents", "strongValueThresholdB2bCents"] as const) {
      const meta = CONFIG_FIELD_META.find((f) => f.key === k);
      expect(meta).toBeDefined();
      expect(meta?.group.toLowerCase()).toContain("retired");
    }
  });
});

// ---------------------------------------------------------------------------
// The seat boundaries, pinned exactly: at passes, one below fails, null fails.
// ---------------------------------------------------------------------------

describe("seat boundary pins", () => {
  it("B2B: at the threshold passes, one below fails, null fails (conservative)", () => {
    const at = classifyOrigination({ newness: "NEW", hasDomain: true, dealKind: "B2B", seatCount: cfg.strongSeatThresholdB2b, cfg });
    const below = classifyOrigination({ newness: "NEW", hasDomain: true, dealKind: "B2B", seatCount: cfg.strongSeatThresholdB2b - 1, cfg });
    const none = classifyOrigination({ newness: "NEW", hasDomain: true, dealKind: "B2B", seatCount: null, cfg });
    expect(at.paidStrongRate).toBe(true);
    expect(below.paidStrongRate).toBe(false);
    expect(below.rateBp).toBe(cfg.qualifiedOriginationB2bBp);
    expect(below.isNewCompany).toBe(true); // classification kept
    expect(none.paidStrongRate).toBe(false);
    expect(none.isNewCompany).toBe(true);
  });

  it("B2C: at the threshold passes with no domain, one below fails, null fails", () => {
    const at = classifyOrigination({ newness: "NEW", hasDomain: false, dealKind: "B2C", seatCount: cfg.strongSeatThresholdB2c, cfg });
    const below = classifyOrigination({ newness: "NEW", hasDomain: false, dealKind: "B2C", seatCount: cfg.strongSeatThresholdB2c - 1, cfg });
    const none = classifyOrigination({ newness: "NEW", hasDomain: false, dealKind: "B2C", seatCount: null, cfg });
    expect(at.paidStrongRate).toBe(true);
    expect(at.rateBp).toBe(cfg.strongOriginationB2cBp);
    expect(below.rateBp).toBe(cfg.qualifiedOriginationB2cBp);
    expect(none.rateBp).toBe(cfg.qualifiedOriginationB2cBp);
  });
});

// ---------------------------------------------------------------------------
// The already-ours name defenses, pure and pinned.
// ---------------------------------------------------------------------------

describe("normalizeEntityName and similarName", () => {
  it("folds punctuation, case, and legal suffixes to one identity", () => {
    expect(normalizeEntityName("Acme, Inc.")).toBe("acme");
    expect(normalizeEntityName("ACME Incorporated")).toBe("acme");
    expect(normalizeEntityName("Acme GmbH")).toBe("acme");
    expect(normalizeEntityName("Global Bank Ltd")).toBe("global bank");
    expect(normalizeEntityName("Global Bank Limited")).toBe("global bank");
    expect(normalizeEntityName("")).toBe("");
    expect(normalizeEntityName(null)).toBe("");
  });

  it("keeps genuinely different companies apart", () => {
    expect(normalizeEntityName("Acme Health")).not.toBe(normalizeEntityName("Acme Bank"));
  });

  it("similarName flags equals, containment, and small edits, never empty strings", () => {
    expect(similarName("acme", "acme")).toBe(true);
    expect(similarName("acme", "acme health")).toBe(true); // containment at length >= 4
    expect(similarName("global bank", "globall bank")).toBe(true); // 1 edit
    expect(similarName("acme", "zenith")).toBe(false);
    expect(similarName("", "acme")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Server wiring (source inspection): seat source, B2B-only gates, claims,
// classification decision, notifications, SLA.
// ---------------------------------------------------------------------------

describe("server wiring (source inspection)", () => {
  const admin = readFileSync(join(__dirname, "../src/lib/actions/partner-admin.ts"), "utf8");
  const portal = readFileSync(join(__dirname, "../src/lib/actions/partner-portal.ts"), "utf8");

  it("the seat count for the Strong test is PAID_COLLECTED only, null when absent", () => {
    expect(admin).toContain('status: "PAID_COLLECTED" },');
    expect(admin).toContain("_sum: { count: true }");
    expect(admin).toContain("paidSeatAgg._sum.count ?? null");
    expect(admin).toContain("seatCount, cfg });");
  });

  it("the OVERRIDE is refused on B2C in the engine", () => {
    expect(admin).toContain("The renewal override applies to B2B accounts only.");
  });

  it("the GROWTH BONUS is refused on B2C in the engine", () => {
    expect(admin).toContain("is paid on B2B deals only.");
  });

  it("the admin classification decision can only force EXISTING, with a required reason, and notifies the owner", () => {
    expect(admin).toContain('classificationDecision === "EXISTING" && classificationReason.length < 5');
    // Consulted through the linked account AND by canonical domain, so leaving the
    // account selector blank when recording the deal cannot bypass the decision.
    expect(admin).toContain('classificationOverride: "EXISTING" },');
    expect(admin).toContain('classificationOverride: "EXISTING", domain: { equals: domainNorm');
    expect(admin).toContain("owner_classification_override");
    // No path grants Strong by hand.
    expect(admin).not.toContain('classificationOverride === "STRONG"');
  });

  it("a second unweighted origination line is refused (reverse and re-add reclassifies from current paid seats)", () => {
    expect(admin).toContain("This deal already carries an origination line.");
    expect(admin).toContain("existingOrigination.some((e) => e.weightBp == null)");
  });

  it("hard blocks match on normalized entity name AND domain for house accounts and live accounts", () => {
    expect(admin).toContain("normalizeEntityName(h.entityName) === regNameNorm");
    expect(admin).toContain("normalizeDomain(h.domain) === regDomainNorm");
    expect(admin).toContain("normalizeEntityName(a.legalEntity) === regNameNorm");
    expect(admin).toContain("matched by name or domain");
  });

  it("claims are stored per function at submit and resubmit, and prechecked attestation can source from the claim", () => {
    expect(portal).toContain("syncFunctionClaims(registration.id, data)");
    expect(portal).toContain("syncFunctionClaims(reg.id, data)");
    expect(portal).toContain("dealFunctionClaim.deleteMany");
    expect(admin).toContain('function: "BASIC_INTRO",\n        warmRelationshipAttested: true,');
  });

  it("the notification set is complete: partner ack with SLA, decline, closed, paid; owner on close and override", () => {
    expect(portal).toContain("partner_deal_received");
    expect(portal).toContain("decisionBusinessDays: cfg.dealConfirmationWindowBusinessDays");
    expect(admin).toContain("partner_deal_declined");
    expect(admin).toContain("partner_deal_closed");
    expect(admin).toContain("partner_commission_paid");
    expect(admin).toContain("owner_deal_closed");
  });
});

// ---------------------------------------------------------------------------
// Surfaces tell the seat story (no dollar threshold presented as current).
// ---------------------------------------------------------------------------

describe("surfaces (source inspection)", () => {
  const terms = readFileSync(join(__dirname, "../src/lib/partner/terms.ts"), "utf8");
  const publicPage = readFileSync(join(__dirname, "../src/app/(public)/partners/page.tsx"), "utf8");
  const m02 = readFileSync(join(__dirname, "../prisma/seed/academy/m02-identity.ts"), "utf8");
  const m03 = readFileSync(join(__dirname, "../prisma/seed/academy/m03-rules.ts"), "utf8");
  const m13 = readFileSync(join(__dirname, "../prisma/seed/academy/m13-motions.ts"), "utf8");
  const dealForm = readFileSync(join(__dirname, "../src/components/portal/partner-deal-form.tsx"), "utf8");

  it("terms: seat thresholds config-rendered, involvement boundaries stated, no dollar test", () => {
    expect(terms).toContain("cfg.strongSeatThresholdB2c");
    expect(terms).toContain("cfg.strongSeatThresholdB2b");
    expect(terms).toContain("zero meetings and no follow-up");
    expect(terms).toContain("rewarded even though you introduce and step aside");
    expect(terms).toContain("at most one online meeting of up to forty five minutes, and possibly not even that");
    expect(terms).not.toContain("strongValueThreshold");
  });

  it("public page and generator: seat-based strong, B2B-only override", () => {
    expect(publicPage).toContain("CFG.strongSeatThresholdB2c");
    expect(publicPage).toContain("B2B only");
    expect(publicPage).not.toContain("strongValueThreshold");
    const gen = readFileSync(join(__dirname, "../scripts/generate-partner-section.ts"), "utf8");
    expect(gen).toContain("CFG.strongSeatThresholdB2c");
    expect(gen).not.toContain("strongValueThreshold");
  });

  it("academy m02, m03, m13 teach the involvement boundaries and the seat rule", () => {
    expect(m02).toContain("zero meetings and no follow-up");
    expect(m02).toContain("reaches the seat threshold");
    expect(m03).toContain("CFG.strongSeatThresholdB2c");
    expect(m03).toContain("seats alone decide");
    expect(m03).toContain("below the seat threshold, it keeps its new-company standing but is paid the Qualified rate");
    expect(m03).toContain("no paid seats recorded yet is always Qualified");
    expect(m03).toContain("CFG.dealConfirmationWindowBusinessDays");
    expect(m13).toContain("CFG.strongSeatThresholdB2c");
    for (const s of [m02, m03, m13]) expect(s).not.toContain("high-value");
  });

  it("the registration form captures per-function claims, encouraged not blocking, with the attestation exception", () => {
    expect(dealForm).toContain("Your Basic Introduction claim");
    expect(dealForm).toContain("rewarded even though you introduce and step aside");
    expect(dealForm).toContain("up to forty five minutes, and possibly not even that");
    expect(dealForm).toContain("optional but\n          strongly encouraged");
    // The stated decision window comes from the RESOLVED config via a server prop.
    expect(dealForm).toContain("decisionBusinessDays");
    const dealsPage = readFileSync(join(__dirname, "../src/app/(partner)/partner/deals/page.tsx"), "utf8");
    expect(dealsPage).toContain("decisionBusinessDays={cfg.dealConfirmationWindowBusinessDays}");
    const zod = readFileSync(join(__dirname, "../src/lib/validations/partner.ts"), "utf8");
    expect(zod).toContain('functionsIntended?.includes("BASIC_INTRO") && !data.introWarmAttested');
  });
});
