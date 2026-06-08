import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePricingUpdate, usd, usdPlain } from "../src/lib/pricing";

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");

describe("parsePricingUpdate", () => {
  it("accepts valid positive whole numbers", () => {
    expect(parsePricingUpdate({ price: "2497", membersLimit: "99" })).toEqual({ price: 2497, membersLimit: 99 });
    expect(parsePricingUpdate({ price: 997, membersLimit: 10 })).toEqual({ price: 997, membersLimit: 10 });
  });
  it("rejects non-positive, non-integer, NaN, and absurd prices", () => {
    expect(() => parsePricingUpdate({ price: 0, membersLimit: 10 })).toThrow();
    expect(() => parsePricingUpdate({ price: -5, membersLimit: 10 })).toThrow();
    expect(() => parsePricingUpdate({ price: 99.5, membersLimit: 10 })).toThrow();
    expect(() => parsePricingUpdate({ price: "abc", membersLimit: 10 })).toThrow();
    expect(() => parsePricingUpdate({ price: 100000, membersLimit: 10 })).toThrow();
  });
  it("rejects invalid membersLimit", () => {
    expect(() => parsePricingUpdate({ price: 997, membersLimit: 0 })).toThrow();
    expect(() => parsePricingUpdate({ price: 997, membersLimit: -1 })).toThrow();
    expect(() => parsePricingUpdate({ price: 997, membersLimit: 2.5 })).toThrow();
  });
});

describe("price formatting", () => {
  it("formats USD with and without the suffix", () => {
    expect(usd(997)).toBe("$997 USD");
    expect(usd(2497)).toBe("$2,497 USD");
    expect(usdPlain(997)).toBe("$997");
  });
});

describe("pricing is DB-driven (source regression)", () => {
  const instrument = read("src/components/marketing/pricing-instrument.tsx");
  const page = read("src/app/(public)/pricing/page.tsx");
  const adminAction = read("src/lib/actions/admin.ts");

  it("pricing-instrument no longer hardcodes tier prices", () => {
    for (const p of ["$997", "$1,247", "$1,497", "$1,747", "$2,497"]) {
      expect(instrument).not.toContain(p);
    }
  });

  it("public pricing page reads tiers from the DB and passes prices as props", () => {
    expect(page).toContain("prisma.pricingTier.findMany");
    expect(page).toContain("founding={founding}");
    expect(page).toContain("standard={standard}");
    expect(page).toContain('export const dynamic = "force-dynamic"');
  });

  it("updatePricingTier requires admin, validates, and revalidates the public page", () => {
    const start = adminAction.indexOf("export async function updatePricingTier");
    expect(start).toBeGreaterThan(-1);
    const body = adminAction.slice(start, start + 1600);
    expect(body).toContain("requireAdmin()");
    expect(body).toContain("parsePricingUpdate");
    expect(body).toContain('safeRevalidatePath("/pricing")');
    expect(body).toContain("auditLog.create");
  });
});
