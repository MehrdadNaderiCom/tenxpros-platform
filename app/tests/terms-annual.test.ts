import { describe, it, expect } from "vitest";
import { buildTermsVersionSeed, currentTermsYear, SURVIVAL_CLAUSES, ANNUAL_VALIDITY } from "../src/lib/terms/annual";

describe("annual terms", () => {
  it("derives the current year as a UTC calendar year", () => {
    const y = currentTermsYear(new Date("2026-03-15T00:00:00Z"));
    expect(y).toBe(2026);
  });

  it("builds a version effective for the whole calendar year, marked current", () => {
    const v = buildTermsVersionSeed(2026);
    expect(v.year).toBe(2026);
    expect(v.audience).toBe("all");
    expect(v.isCurrent).toBe(true);
    expect(v.effectiveFrom.getUTCFullYear()).toBe(2026);
    expect(v.effectiveFrom.getUTCMonth()).toBe(0);
    expect(v.effectiveTo.getUTCMonth()).toBe(11);
    expect(v.effectiveTo.getUTCDate()).toBe(31);
  });

  it("lists the five survival clauses and references them in the body", () => {
    expect(SURVIVAL_CLAUSES.length).toBe(5);
    const v = buildTermsVersionSeed(2026);
    for (const c of SURVIVAL_CLAUSES) expect(v.bodyHtml).toContain(c.title);
  });

  it("states the December 31 expiry in the validity copy", () => {
    expect(ANNUAL_VALIDITY.some((p) => p.includes("thirty first of December"))).toBe(true);
  });

  it("contains no em or en dashes in the rendered terms content", () => {
    const v = buildTermsVersionSeed(2026);
    expect(/[\u2014\u2013]/.test(v.bodyHtml + v.changelog + ANNUAL_VALIDITY.join(""))).toBe(false);
  });
});
