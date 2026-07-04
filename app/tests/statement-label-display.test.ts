import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PARTNER_FUNCTION_LABELS,
  commissionLineDisplay,
  qualifiedBySeatsNote,
} from "../src/lib/partner/constants";
import { PROGRAM_CONFIG_DEFAULTS } from "../src/lib/partner/config";
import { classifyOrigination } from "../src/lib/partner/commission";

// ---------------------------------------------------------------------------
// The end-to-end contract: the exact classification the engine stores, fed to
// the display helper, always yields a label that agrees with the rate paid.
// (No DB: this pins the same pairing the write path performs.)
// ---------------------------------------------------------------------------

describe("classifier output through the display helper", () => {
  const cfg = PROGRAM_CONFIG_DEFAULTS;

  it("a new-company B2B origination BELOW the seat threshold: stored Strong, paid Qualified, displayed Qualified with the note", () => {
    const cls = classifyOrigination({
      newness: "NEW",
      hasDomain: true,
      dealKind: "B2B",
      seatCount: cfg.strongSeatThresholdB2b - 1,
      cfg,
    });
    // The engine keeps the new-company standing in the stored function...
    expect(cls.function).toBe("STRONG_ORIGINATION");
    expect(cls.rateBp).toBe(cfg.qualifiedOriginationB2bBp); // ...but pays Qualified.
    expect(cls.isNewCompany).toBe(true); // standing kept -> still counts for growth bonus
    // ...and the display resolves the mismatch to what was actually paid.
    const d = commissionLineDisplay(cls.function, cls.paidStrongRate);
    expect(d.label).toBe("Qualified Origination");
    expect(d.qualifiedBySeats).toBe(true);
  });

  it("a new-company B2B origination AT the seat threshold: stored Strong, paid Strong, displayed Strong with no note", () => {
    const cls = classifyOrigination({
      newness: "NEW",
      hasDomain: true,
      dealKind: "B2B",
      seatCount: cfg.strongSeatThresholdB2b,
      cfg,
    });
    expect(cls.function).toBe("STRONG_ORIGINATION");
    expect(cls.rateBp).toBe(cfg.strongOriginationB2bBp);
    const d = commissionLineDisplay(cls.function, cls.paidStrongRate);
    expect(d.label).toBe("Strong Origination");
    expect(d.qualifiedBySeats).toBe(false);
  });

  it("a B2C origination below threshold is already stored as Qualified, so it never diverges", () => {
    const cls = classifyOrigination({
      newness: "NEW",
      hasDomain: false,
      dealKind: "B2C",
      seatCount: cfg.strongSeatThresholdB2c - 1,
      cfg,
    });
    expect(cls.function).toBe("QUALIFIED_ORIGINATION");
    const d = commissionLineDisplay(cls.function, cls.paidStrongRate);
    expect(d.label).toBe("Qualified Origination");
    expect(d.qualifiedBySeats).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The pure display helper: the shown label always agrees with the rate paid.
// ---------------------------------------------------------------------------

describe("commissionLineDisplay", () => {
  it("a below-threshold origination (Strong stored, paid Qualified) displays as Qualified with the note", () => {
    const d = commissionLineDisplay("STRONG_ORIGINATION", false);
    expect(d.label).toBe(PARTNER_FUNCTION_LABELS.QUALIFIED_ORIGINATION);
    expect(d.label).toBe("Qualified Origination");
    expect(d.qualifiedBySeats).toBe(true);
  });

  it("a genuinely Strong origination (paidStrongRate true) still displays as Strong with no note", () => {
    const d = commissionLineDisplay("STRONG_ORIGINATION", true);
    expect(d.label).toBe("Strong Origination");
    expect(d.qualifiedBySeats).toBe(false);
  });

  it("a Qualified origination is unchanged (never touched by the helper)", () => {
    const d = commissionLineDisplay("QUALIFIED_ORIGINATION", false);
    expect(d.label).toBe("Qualified Origination");
    expect(d.qualifiedBySeats).toBe(false);
  });

  it("a null or undefined flag renders the stored label unchanged (pre-column rows, non-origination lines)", () => {
    expect(commissionLineDisplay("STRONG_ORIGINATION", null)).toEqual({ label: "Strong Origination", qualifiedBySeats: false });
    expect(commissionLineDisplay("STRONG_ORIGINATION", undefined)).toEqual({ label: "Strong Origination", qualifiedBySeats: false });
    expect(commissionLineDisplay("CLOSING", null)).toEqual({ label: "Closing", qualifiedBySeats: false });
    expect(commissionLineDisplay("GROWTH_BONUS", false)).toEqual({ label: "Growth Bonus", qualifiedBySeats: false });
  });

  it("only STRONG_ORIGINATION with an explicit false ever diverges; every other function is a straight label", () => {
    for (const fn of Object.keys(PARTNER_FUNCTION_LABELS) as (keyof typeof PARTNER_FUNCTION_LABELS)[]) {
      for (const flag of [true, false, null, undefined] as const) {
        const d = commissionLineDisplay(fn, flag);
        const shouldDiverge = fn === "STRONG_ORIGINATION" && flag === false;
        expect(d.qualifiedBySeats).toBe(shouldDiverge);
        expect(d.label).toBe(shouldDiverge ? PARTNER_FUNCTION_LABELS.QUALIFIED_ORIGINATION : PARTNER_FUNCTION_LABELS[fn]);
      }
    }
  });
});

describe("qualifiedBySeatsNote", () => {
  it("renders the B2B seat threshold from config, never a hardcoded number", () => {
    const note = qualifiedBySeatsNote(PROGRAM_CONFIG_DEFAULTS);
    expect(note).toContain(`${PROGRAM_CONFIG_DEFAULTS.strongSeatThresholdB2b}-seat threshold`);
    expect(note).toContain("counts toward your growth bonus");
    expect(note).toContain("anchors your renewal override");
    expect(note).toContain("Qualified rate");
    expect(note).toContain("reverses and re-adds");
    // A per-partner override shows that partner their own number.
    const overridden = { ...PROGRAM_CONFIG_DEFAULTS, strongSeatThresholdB2b: 20 };
    expect(qualifiedBySeatsNote(overridden)).toContain("20-seat threshold");
  });
});

// ---------------------------------------------------------------------------
// Wiring pins (source inspection): the write path stores the flag, and every
// render site uses the helper rather than the raw label map.
// ---------------------------------------------------------------------------

describe("statement-label wiring (source inspection)", () => {
  const root = join(__dirname, "..");
  const admin = readFileSync(join(root, "src/lib/actions/partner-admin.ts"), "utf8");
  const partnerPage = readFileSync(join(root, "src/app/(partner)/partner/commissions/page.tsx"), "utf8");
  const adminLedger = readFileSync(join(root, "src/app/(admin)/admin/partners/commissions/page.tsx"), "utf8");
  const adminProfile = readFileSync(join(root, "src/app/(admin)/admin/partners/[id]/page.tsx"), "utf8");
  const templates = readFileSync(join(root, "src/lib/email/templates.ts"), "utf8");
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");

  it("the write path persists the classifier's paidStrongRate on the origination line", () => {
    // Set from the classifier output, never hand-computed.
    expect(admin).toContain("paidStrongRate = cls.paidStrongRate;");
    // And carried into the CommissionEntry create.
    expect(admin).toMatch(/paidStrongRate,\s*\n\s*currency: deal\.currency,/);
  });

  it("the schema column is additive and nullable (no backfill, pre-column rows render as today)", () => {
    expect(schema).toContain("paidStrongRate Boolean?");
  });

  it("the partner statement uses the helper and shows the note", () => {
    expect(partnerPage).toContain("commissionLineDisplay(e.function, e.paidStrongRate)");
    expect(partnerPage).toContain("qualifiedBySeatsNote(cfg)");
    // The raw label map is no longer used to render the line.
    expect(partnerPage).not.toContain("PARTNER_FUNCTION_LABELS[e.function]");
  });

  it("both admin views use the helper for the shown label", () => {
    expect(adminLedger).toContain("commissionLineDisplay(e.function, e.paidStrongRate)");
    expect(adminLedger).not.toContain("PARTNER_FUNCTION_LABELS[e.function]");
    expect(adminProfile).toContain("commissionLineDisplay(c.function, c.paidStrongRate)");
    expect(adminProfile).not.toContain("PARTNER_FUNCTION_LABELS[c.function]");
  });

  it("the paid email shows the helper label and the note only on the divergent line", () => {
    expect(admin).toContain("const display = commissionLineDisplay(entry.function, entry.paidStrongRate);");
    expect(admin).toContain("qualifiedBySeatsNote(await resolvePartnerConfig(entry.partnerId))");
    expect(admin).toContain("functionLabel: display.label,");
    // The template threads the note through both html and text bodies.
    expect(templates).toContain("note?: string;");
    expect(templates).toContain("(note ? paragraph(esc(note)) : \"\")");
  });

  it("the stored function value and the engine classifier are NOT changed by this display work", () => {
    // recordedFn is still the classifier's function, stored verbatim.
    expect(admin).toContain("recordedFn = cls.function;");
    expect(admin).toContain("function: recordedFn,");
  });
});
