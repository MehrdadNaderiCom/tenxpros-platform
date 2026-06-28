import { describe, expect, it } from "vitest";
import {
  convertMinor,
  entryPayoutMinor,
  formatMoney,
  fromMinorUnits,
  minorUnitDigits,
  minorUnitFactor,
  normalizeCurrencyCode,
  toMinorUnits,
} from "../src/lib/partner/currency";

describe("minor units differ by currency (no USD/2-decimal assumption)", () => {
  it("knows the decimal places per currency", () => {
    expect(minorUnitDigits("USD")).toBe(2);
    expect(minorUnitDigits("EUR")).toBe(2);
    expect(minorUnitDigits("JPY")).toBe(0);
    expect(minorUnitDigits("BHD")).toBe(3);
    expect(minorUnitFactor("USD")).toBe(100);
    expect(minorUnitFactor("JPY")).toBe(1);
    expect(minorUnitFactor("BHD")).toBe(1000);
  });
  it("converts major <-> minor units per currency", () => {
    expect(toMinorUnits(20000, "USD")).toBe(2_000_000);
    expect(toMinorUnits(20000, "JPY")).toBe(20_000);
    expect(toMinorUnits(1234.567, "BHD")).toBe(1_234_567);
    expect(fromMinorUnits(2_000_000, "USD")).toBe(20000);
    expect(fromMinorUnits(20_000, "JPY")).toBe(20000);
  });
  it("formats with the correct currency and decimals", () => {
    expect(formatMoney(160_000, "USD")).toContain("1,600");
    expect(formatMoney(20_000, "JPY")).toContain("20,000");
    expect(formatMoney(1_234_567, "BHD")).toContain("1,234.567");
  });
});

describe("cross-currency conversion (rate at cleared date, scale-adjusted)", () => {
  it("is identity when currency matches and rate is 1", () => {
    expect(convertMinor(160_000, 1, "USD", "USD")).toBe(160_000);
  });
  it("converts same-scale currencies at the rate", () => {
    // €200.00 -> USD at 1.08 = $216.00
    expect(convertMinor(20_000, 1.08, "EUR", "USD")).toBe(21_600);
  });
  it("adjusts for differing minor-unit scales", () => {
    // ¥20,000 (0 decimals) -> USD (2 decimals) at 0.0067 = $134.00
    expect(convertMinor(20_000, 0.0067, "JPY", "USD")).toBe(13_400);
    // $134.00 -> ¥ at 149 = ¥19,966
    expect(convertMinor(13_400, 149, "USD", "JPY")).toBe(19_966);
  });
});

describe("entryPayoutMinor (net payable in the payout currency)", () => {
  it("nets out reversed cents then converts", () => {
    const entry = { amountCents: 240_000, reversedCents: 60_000, currency: "EUR" };
    const deal = { currency: "EUR", conversionRate: 1.08 };
    // net €1,800.00 -> USD at 1.08 = $1,944.00
    expect(entryPayoutMinor(entry, deal, "USD")).toBe(194_400);
  });
  it("is the net amount when currencies match", () => {
    const entry = { amountCents: 240_000, reversedCents: 40_000, currency: "USD" };
    const deal = { currency: "USD", conversionRate: 1 };
    expect(entryPayoutMinor(entry, deal, "USD")).toBe(200_000);
  });
});

describe("currency code normalization", () => {
  it("upper-cases valid 3-letter codes and falls back otherwise", () => {
    expect(normalizeCurrencyCode("usd")).toBe("USD");
    expect(normalizeCurrencyCode("  eur ")).toBe("EUR");
    expect(normalizeCurrencyCode("")).toBe("USD");
    expect(normalizeCurrencyCode("dollars")).toBe("USD");
    expect(normalizeCurrencyCode("X")).toBe("USD");
  });
});
