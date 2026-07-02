import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { startReadiness, notReadyMessage } from "../src/lib/partner/readiness";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const DATE = new Date("2026-01-01T00:00:00Z");

describe("startReadiness", () => {
  it("is ready only when Academy AND onboarding are both complete", () => {
    expect(startReadiness({ activationGatePassedAt: DATE, hasAcademyBadge: true })).toEqual({
      academyComplete: true,
      onboardingComplete: true,
      ready: true,
    });
  });

  it("is not ready when only the Academy is done", () => {
    const r = startReadiness({ activationGatePassedAt: null, hasAcademyBadge: true });
    expect(r.academyComplete).toBe(true);
    expect(r.onboardingComplete).toBe(false);
    expect(r.ready).toBe(false);
  });

  it("is not ready when only onboarding is done", () => {
    const r = startReadiness({ activationGatePassedAt: DATE, hasAcademyBadge: false });
    expect(r.onboardingComplete).toBe(true);
    expect(r.academyComplete).toBe(false);
    expect(r.ready).toBe(false);
  });

  it("is not ready when neither is done", () => {
    expect(startReadiness({ activationGatePassedAt: null, hasAcademyBadge: false }).ready).toBe(false);
    expect(startReadiness({ activationGatePassedAt: undefined, hasAcademyBadge: false }).ready).toBe(false);
  });
});

describe("notReadyMessage", () => {
  it("is empty when ready", () => {
    expect(notReadyMessage(startReadiness({ activationGatePassedAt: DATE, hasAcademyBadge: true }))).toBe("");
  });

  it("names the Academy when it is the missing piece", () => {
    const m = notReadyMessage(startReadiness({ activationGatePassedAt: DATE, hasAcademyBadge: false }));
    expect(m).toMatch(/Academy/);
    expect(m).not.toMatch(/onboarding/i);
  });

  it("names onboarding when it is the missing piece", () => {
    const m = notReadyMessage(startReadiness({ activationGatePassedAt: null, hasAcademyBadge: true }));
    expect(m).toMatch(/onboarding/i);
    expect(m).not.toMatch(/Academy/);
  });

  it("names both when neither is done", () => {
    const m = notReadyMessage(startReadiness({ activationGatePassedAt: null, hasAcademyBadge: false }));
    expect(m).toMatch(/Academy/);
    expect(m).toMatch(/onboarding/i);
  });
});

describe("start-work gate is wired to the readiness rule", () => {
  it("submitDealRegistration blocks until the partner is ready (Academy + onboarding)", () => {
    const src = readSource("src/lib/actions/partner-portal.ts");
    // The gate resolves readiness (which checks the academy badge) and refuses when not ready.
    expect(src).toContain("partnerStartReadiness(partner)");
    expect(src).toContain("partnerAcademyBadge.findUnique");
    expect(src).toContain("if (!readiness.ready)");
    expect(src).toContain("notReadyMessage(readiness)");
    // The old onboarding-only gate wording is gone (superseded by the combined gate).
    expect(src).not.toContain("Complete the Activation Gate before registering deals.");
  });

  it("the dashboard shows the two-step Get started card and the layout shows the panel-wide banner", () => {
    const dash = readSource("src/app/(partner)/partner/page.tsx");
    expect(dash).toContain("StartHereCard");
    expect(dash).toContain("startReadiness(");
    expect(dash).toContain("academyBadge: true");
    const layout = readSource("src/app/(partner)/partner/layout.tsx");
    expect(layout).toContain("StartHereBanner");
    expect(layout).toContain("!readiness.ready");
  });

  it("the Deal Registrations page gates the register form on the combined readiness (not onboarding alone)", () => {
    const deals = readSource("src/app/(partner)/partner/deals/page.tsx");
    expect(deals).toContain("startReadiness(");
    expect(deals).toContain("academyBadge: true");
    expect(deals).toContain("!readiness.ready");
    // The old onboarding-only wording is gone.
    expect(deals).not.toContain("Complete the Activation Gate first");
  });

  it("submitSpecialDealRequest is also behind the readiness gate", () => {
    const src = readSource("src/lib/actions/partner-portal.ts");
    // Both origination entry points call partnerStartReadiness before doing work.
    expect((src.match(/partnerStartReadiness\(partner\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
