import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  bpToCents,
  computeDealCommission,
  originationOpener,
  type FunctionInput,
} from "../src/lib/partner/commission";
import { PROGRAM_CONFIG_DEFAULTS } from "../src/lib/partner/config";

const cfg = PROGRAM_CONFIG_DEFAULTS;

// ---------------------------------------------------------------------------
// Weighted split conservation: a shared function is never double-counted, and
// the shared lines sum to EXACTLY one unshared line, before and after the cap.
// ---------------------------------------------------------------------------

describe("weighted split conservation (the non-negotiable invariant)", () => {
  it("uncapped: two delivery lines (60/40) sum to exactly one unshared delivery line", () => {
    const net = 100000;
    const split = computeDealCommission({
      netReceiptsCents: net,
      dealKind: "B2B",
      config: cfg,
      functions: [
        { function: "DELIVERY", rateBp: 800, partnerId: "A", weightBp: 6000 },
        { function: "DELIVERY", rateBp: 800, partnerId: "B", weightBp: 4000 },
      ],
    });
    const full = bpToCents(net, 800); // 8000
    const sum = split.entries.reduce((s, e) => s + e.amountCents, 0);
    expect(sum).toBe(full); // 60% + 40% == 100%, cents-exact
    expect(split.entries[0].amountCents).toBe(4800);
    expect(split.entries[1].amountCents).toBe(3200);
    expect(split.rawTotalCents).toBe(full); // counted ONCE, never doubled
    // Each line keeps its own partner and weight.
    expect(split.entries.map((e) => e.partnerId)).toEqual(["A", "B"]);
    expect(split.entries.map((e) => e.weightBp)).toEqual([6000, 4000]);
  });

  it("UNDER CAP SCALING: split delivery lines still sum to exactly the single unshared scaled amount", () => {
    const net = 100000;
    // B2B cap = 3000bp = 30000. Raw stack exceeds it, forcing scaling.
    const base: FunctionInput[] = [
      { function: "STRONG_ORIGINATION", rateBp: 1200 },
      { function: "CLOSING", rateBp: 1000 },
      { function: "BASIC_INTRO", rateBp: 500 },
    ];
    const unsplit = computeDealCommission({
      netReceiptsCents: net,
      dealKind: "B2B",
      config: cfg,
      functions: [...base, { function: "DELIVERY", rateBp: 800 }],
    });
    const splitDeal = computeDealCommission({
      netReceiptsCents: net,
      dealKind: "B2B",
      config: cfg,
      functions: [
        ...base,
        { function: "DELIVERY", rateBp: 800, partnerId: "A", weightBp: 6000 },
        { function: "DELIVERY", rateBp: 800, partnerId: "B", weightBp: 4000 },
      ],
    });
    // Both hit the 30% cap exactly.
    expect(unsplit.totalCents).toBe(bpToCents(net, cfg.capB2bBp));
    expect(splitDeal.totalCents).toBe(unsplit.totalCents);
    expect(splitDeal.rawTotalCents).toBe(unsplit.rawTotalCents); // no double count
    // The single delivery line's scaled amount...
    const singleDelivery = unsplit.entries.find((e) => e.function === "DELIVERY")!.amountCents;
    // ...equals the sum of the two split delivery lines, cents-exact.
    const splitDelivery = splitDeal.entries.filter((e) => e.function === "DELIVERY").reduce((s, e) => s + e.amountCents, 0);
    expect(splitDelivery).toBe(singleDelivery);
    // And the non-delivery lines are identical between the two runs.
    for (const fn of ["STRONG_ORIGINATION", "CLOSING", "BASIC_INTRO"] as const) {
      expect(splitDeal.entries.find((e) => e.function === fn)!.amountCents)
        .toBe(unsplit.entries.find((e) => e.function === fn)!.amountCents);
    }
  });

  it("odd-cent split still sums exactly (remainder goes to the larger weight)", () => {
    const net = 33333; // delivery 8% = 2667 (rounded); split by 6000/4000
    const r = computeDealCommission({
      netReceiptsCents: net,
      dealKind: "B2B",
      config: cfg,
      functions: [
        { function: "DELIVERY", rateBp: 800, partnerId: "A", weightBp: 6000 },
        { function: "DELIVERY", rateBp: 800, partnerId: "B", weightBp: 4000 },
      ],
    });
    const full = bpToCents(net, 800);
    expect(r.entries[0].amountCents + r.entries[1].amountCents).toBe(full);
  });

  it("weightBp is an ABSOLUTE share: a lone 60% line takes 60%, not 100%", () => {
    const net = 100000;
    const r = computeDealCommission({
      netReceiptsCents: net,
      dealKind: "B2B",
      config: cfg,
      functions: [{ function: "DELIVERY", rateBp: 800, partnerId: "A", weightBp: 6000 }],
    });
    // 60% of the full 8000 delivery amount; the missing 40% is simply not claimed here.
    expect(r.entries[0].amountCents).toBe(4800);
  });

  it("a PAID sibling is never reinflated: the surviving line keeps its own share on recompute", () => {
    // Regression guard for the Phase C critical finding. Delivery 8% (full 8000) was split
    // A(60%)=4800 and B(40%)=3200. A is later marked PAID, so a subsequent recompute sees
    // ONLY B in the batch, with A's 4800 carried as committedExternalCents + groupSettledCents.
    const net = 100000;
    const r = computeDealCommission({
      netReceiptsCents: net,
      dealKind: "B2B",
      config: cfg,
      committedExternalCents: 4800, // A's paid share consumes cap headroom
      functions: [{ function: "DELIVERY", rateBp: 800, partnerId: "B", weightBp: 4000, groupSettledCents: 4800 }],
    });
    expect(r.entries[0].amountCents).toBe(3200); // B keeps 40%, NOT reinflated to 8000
    // Paid (4800) + recomputed (3200) == the full delivery amount, never a cent more.
    expect(4800 + r.entries[0].amountCents).toBe(bpToCents(net, 800));
  });

  // Simulate a full multi-tier settlement: each partner is paid in turn, and every
  // subsequent recompute sees only the survivors plus the running settled total. Proves
  // settled + recomputed NEVER exceeds the full function amount, for any partner count.
  function settleInOrder(net: number, rateBp: number, weights: { id: string; w: number }[]): number {
    const full = bpToCents(net, rateBp);
    let settled = 0;
    let paidTotal = 0;
    let remaining = weights.slice();
    while (remaining.length > 0) {
      const r = computeDealCommission({
        netReceiptsCents: net,
        dealKind: "B2B",
        config: cfg,
        committedExternalCents: settled,
        functions: remaining.map((p) => ({ function: "DELIVERY", rateBp, partnerId: p.id, weightBp: p.w, groupSettledCents: settled } as FunctionInput)),
      });
      // Pay the FIRST survivor at its recomputed amount; the rest recompute again next tier.
      const paid = r.entries[0].amountCents;
      paidTotal += paid;
      settled += paid;
      expect(settled).toBeLessThanOrEqual(full); // never overpays at any tier
      remaining = remaining.slice(1);
    }
    return paidTotal;
  }

  it("2-partner staggered settlement never overpays the function, for many nets", () => {
    for (const net of [33333, 100000, 199975, 12000, 7, 250000]) {
      const total = settleInOrder(net, 800, [{ id: "A", w: 6000 }, { id: "B", w: 4000 }]);
      expect(total).toBeLessThanOrEqual(bpToCents(net, 800));
    }
  });

  it("3-partner staggered settlement never overpays (the residual-cent finding), for many nets", () => {
    for (const net of [12000, 199975, 33333, 100000, 250000, 3]) {
      const total = settleInOrder(net, 1000, [{ id: "A", w: 5000 }, { id: "B", w: 3000 }, { id: "C", w: 2000 }]);
      expect(total).toBeLessThanOrEqual(bpToCents(net, 1000));
    }
  });
});

// ---------------------------------------------------------------------------
// The airtight cap across partners: the whole point of the redesign.
// ---------------------------------------------------------------------------

describe("cap safety across any number of partners", () => {
  it("EXTREME: Tier-3 focus deal with every function plus a cross-partner override clamps to exactly 35%", () => {
    const net = 1000000;
    const r = computeDealCommission({
      netReceiptsCents: net,
      dealKind: "B2B",
      focusActive: true, // cap becomes tier3FocusHardCeilingBp
      config: cfg,
      functions: [
        { function: "STRONG_ORIGINATION", rateBp: 1200, partnerId: "owner" },
        { function: "CLOSING", rateBp: 1000, partnerId: "owner" },
        { function: "DELIVERY", rateBp: 800, partnerId: "owner" },
        { function: "GROWTH_BONUS", rateBp: 100, partnerId: "owner" },
        { function: "FOCUS_BONUS", rateBp: 300, partnerId: "owner" },
        { function: "OVERRIDE", rateBp: 600, partnerId: "opener" }, // credited to a DIFFERENT partner
      ],
    });
    const cap = bpToCents(net, cfg.tier3FocusHardCeilingBp); // 35% = 350000
    expect(r.capBp).toBe(cfg.tier3FocusHardCeilingBp);
    expect(r.rawTotalCents).toBeGreaterThan(cap); // raw 40% > 35%
    expect(r.capped).toBe(true);
    // Combined payout across BOTH partners is exactly the cap, not a cent more.
    const sumAll = r.entries.reduce((s, e) => s + e.amountCents, 0);
    expect(sumAll).toBe(cap);
    // The override line survived and is still credited to the opener.
    const override = r.entries.find((e) => e.function === "OVERRIDE")!;
    expect(override.partnerId).toBe("opener");
    expect(override.amountCents).toBeGreaterThan(0);
  });

  it("introduce-and-close: two partners on one deal sum correctly under the cap", () => {
    const net = 100000;
    const r = computeDealCommission({
      netReceiptsCents: net,
      dealKind: "B2B",
      config: cfg,
      functions: [
        { function: "STRONG_ORIGINATION", rateBp: 1200, partnerId: "A" }, // 12%
        { function: "CLOSING", rateBp: 1000, partnerId: "B" }, // 10%
        { function: "DELIVERY", rateBp: 800, partnerId: "A" }, // 8%
      ],
    });
    // 30% == cap exactly, not over.
    expect(r.totalCents).toBe(bpToCents(net, cfg.capB2bBp));
    expect(r.capped).toBe(false);
    const byPartner = (p: string) => r.entries.filter((e) => e.partnerId === p).reduce((s, e) => s + e.amountCents, 0);
    expect(byPartner("A") + byPartner("B")).toBe(r.totalCents);
    expect(byPartner("A")).toBe(bpToCents(net, 2000)); // 12% + 8%
    expect(byPartner("B")).toBe(bpToCents(net, 1000)); // 10%
  });

  it("no weighting or partner mix ever breaches the cap (fuzzed rate stacks)", () => {
    const net = 500000;
    for (const rates of [[3000, 3000, 3000], [900, 900, 900, 900], [2500, 100], [1200, 1000, 800, 800, 800]]) {
      const r = computeDealCommission({
        netReceiptsCents: net,
        dealKind: "B2B",
        config: cfg,
        functions: rates.map((rateBp, i) => ({ function: "CLOSING", rateBp, partnerId: "p" + i } as FunctionInput)),
      });
      const sum = r.entries.reduce((s, e) => s + e.amountCents, 0);
      expect(sum).toBeLessThanOrEqual(bpToCents(net, cfg.capB2bBp));
    }
  });
});

// ---------------------------------------------------------------------------
// The engine preserves per-line partnerId and weightBp, in order.
// ---------------------------------------------------------------------------

describe("engine preserves attribution through computation (recompute safety)", () => {
  it("keeps each line's partnerId and weightBp, in input order, capped or not", () => {
    const net = 100000;
    const inputs: FunctionInput[] = [
      { function: "STRONG_ORIGINATION", rateBp: 1200, partnerId: "owner" },
      { function: "CLOSING", rateBp: 1000, partnerId: "closer" },
      { function: "OVERRIDE", rateBp: 900, partnerId: "opener" },
      { function: "DELIVERY", rateBp: 800, partnerId: "x", weightBp: 5000 },
      { function: "DELIVERY", rateBp: 800, partnerId: "y", weightBp: 5000 },
    ];
    const r = computeDealCommission({ netReceiptsCents: net, dealKind: "B2B", config: cfg, functions: inputs });
    expect(r.entries.map((e) => e.partnerId)).toEqual(["owner", "closer", "opener", "x", "y"]);
    expect(r.entries.map((e) => e.function)).toEqual(inputs.map((i) => i.function));
    expect(r.entries[3].weightBp).toBe(5000);
    expect(r.entries[4].weightBp).toBe(5000);
  });
});

// ---------------------------------------------------------------------------
// originationOpener now carries the opener's partnerId (for override crediting).
// ---------------------------------------------------------------------------

describe("originationOpener carries the opener partnerId", () => {
  it("returns the EARLIEST origination deal's partner, rate, and signedAt", () => {
    const opener = originationOpener([
      { signedAt: new Date("2025-01-01"), originationRateBps: [1200], partnerId: "first" },
      { signedAt: new Date("2025-06-01"), originationRateBps: [1500], partnerId: "later" },
    ]);
    expect(opener?.partnerId).toBe("first");
    expect(opener?.rateBp).toBe(1200);
  });

  it("ignores deals with no origination line and returns null when there is no opener", () => {
    expect(originationOpener([{ signedAt: new Date(), originationRateBps: [], partnerId: "x" }])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The server action wires override-to-opener, growth-by-domain, and recompute
// preservation (source inspection, since these need the DB at runtime).
// ---------------------------------------------------------------------------

describe("server action wiring (source inspection)", () => {
  const admin = readFileSync(join(__dirname, "../src/lib/actions/partner-admin.ts"), "utf8");

  it("OVERRIDE is credited to the opener and Active Status is checked against the opener", () => {
    expect(admin).toContain('} else if (fn === "OVERRIDE") {');
    expect(admin).toContain("linePartnerId = opener.partnerId");
    expect(admin).toContain("opener.partnerId }, select: { activeStatus: true }");
    expect(admin).toContain("activeStatus: openerPartner?.activeStatus ?? false");
    // No opener => no line.
    expect(admin).toContain("there is no override to trail");
  });

  it("cross-partner attribution is superadmin-only; the line stores the credited partner", () => {
    expect(admin).toContain("Only a superadmin may credit a line to a partner other than the deal owner.");
    expect(admin).toContain("partnerId: linePartnerId");
  });

  it("the weighted split is superadmin-only, bounded, and never applied to a fixed fee", () => {
    expect(admin).toContain("Only a superadmin may split a function among partners by weight.");
    expect(admin).toContain("w <= 0 || w > 10000");
    expect(admin).toContain("A fixed-fee line cannot be weight-split");
  });

  it("recompute preserves partnerId and weightBp and never writes them back on update", () => {
    expect(admin).toContain("partnerId: e.partnerId, weightBp: e.weightBp ?? undefined");
    // The per-entry update sets ONLY amountCents and payableOn (partnerId is not reassigned).
    expect(admin).toContain("data: { amountCents: result.entries[i].amountCents, payableOn }");
  });

  it("recompute feeds per-function settled totals so a partially-settled split cannot overpay", () => {
    expect(admin).toContain("settledByFunction");
    expect(admin).toContain("groupSettledCents: groupSettled(e)");
  });

  it("Growth Bonus counts distinct new-company domains, collected in window, deduped, no-domain excluded", () => {
    // The action calls the shared, domain-based counter; the query lives in growth.ts.
    expect(admin).toContain("countNewCompanyDomainsRolling");
    const growth = readFileSync(join(__dirname, "../src/lib/partner/growth.ts"), "utf8");
    expect(growth).toContain('function: "STRONG_ORIGINATION", status: { notIn: ["REVERSED"] }');
    expect(growth).toContain("paymentClearedAt: { gte: windowStart }");
    expect(growth).toContain("domain: { not: null }");
    expect(growth).toContain("tierQualifyingWindowMonths");
    expect(growth).toContain("if (norm) domains.add(norm)");
  });
});
