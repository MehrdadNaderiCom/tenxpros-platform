import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Source-level guardrails for the commission engine. The engine must be a pure
 * function library: no database, no clock, and every commercial number read from
 * the resolved config (never a hard-coded rate).
 */

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

const commission = read("src/lib/partner/commission.ts");
const rules = read("src/lib/partner/rules.ts");

describe("commission engine purity", () => {
  it("does not touch the database or any I/O", () => {
    for (const src of [commission, rules]) {
      expect(src).not.toMatch(/from ["']@\/lib\/prisma["']/);
      expect(src).not.toMatch(/prisma\./);
      expect(src).not.toMatch(/fetch\(/);
    }
  });

  it("does not read the wall clock (now must be injected for determinism)", () => {
    for (const src of [commission, rules]) {
      expect(src).not.toMatch(/Date\.now\(/);
      // `new Date()` with no argument is forbidden; `new Date(x)` is fine.
      expect(src).not.toMatch(/new Date\(\s*\)/);
    }
  });

  it("reads rates and caps from the resolved config, not hard-coded literals", () => {
    expect(commission).toMatch(/cfg\.qualifiedOriginationB2bBp/);
    expect(commission).toMatch(/cfg\.strongOriginationB2bBp/);
    expect(commission).toMatch(/cfg\.capB2cBp/);
    expect(commission).toMatch(/cfg\.capB2bBp/);
    expect(commission).toMatch(/cfg\.overrideShareBp/);
    expect(commission).toMatch(/cfg\.tier3FocusHardCeilingBp/);
  });
});
