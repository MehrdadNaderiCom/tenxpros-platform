/**
 * Currency helpers, pure, no DB. The Partner Program is global, so money is
 * stored as integer MINOR UNITS in a named currency, and the number of minor-unit
 * digits varies (USD/EUR = 2, JPY/KRW = 0, BHD/KWD = 3). Never assume 2 decimals
 * and never assume USD. Conversion uses the rate captured on the date final
 * payment cleared (see ClosedDeal.conversionRate / conversionDate).
 */

/** Minor-unit digits for a currency (USD=2, JPY=0, BHD=3). Falls back to 2. */
export function minorUnitDigits(currency: string): number {
  try {
    const opts = new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions();
    return opts.maximumFractionDigits ?? 2;
  } catch {
    return 2;
  }
}

export function minorUnitFactor(currency: string): number {
  return 10 ** minorUnitDigits(currency);
}

/** Major units (e.g. 20000.5) → integer minor units in that currency. */
export function toMinorUnits(major: number, currency: string): number {
  if (!Number.isFinite(major)) return 0;
  return Math.round(major * minorUnitFactor(currency));
}

/** Integer minor units → major units (a number; for display use formatMoney). */
export function fromMinorUnits(minor: number, currency: string): number {
  return minor / minorUnitFactor(currency);
}

/** Locale-safe currency display from integer minor units. */
export function formatMoney(minor: number | null | undefined, currency = "USD", locale = "en-US"): string {
  const cur = normalizeCurrencyCode(currency);
  const value = (minor ?? 0) / minorUnitFactor(cur);
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency: cur }).format(value);
  } catch {
    return `${cur} ${value.toFixed(2)}`;
  }
}

/**
 * Convert an amount in `from` minor units to `to` minor units, applying the
 * major→major FX `rate` and adjusting for differing minor-unit scales. When the
 * currencies match and rate is 1 this is the identity (no rounding drift).
 */
export function convertMinor(amountMinor: number, rate: number, from: string, to: string): number {
  const f = normalizeCurrencyCode(from);
  const t = normalizeCurrencyCode(to);
  if (f === t && rate === 1) return amountMinor;
  return Math.round((amountMinor * rate * minorUnitFactor(t)) / minorUnitFactor(f));
}

/**
 * Net payout (in payout-currency minor units) for a commission line: the line's
 * net (amount - reversed) in the deal currency, converted at the deal's captured
 * rate. Pure; used by every commission display so totals are in one currency.
 */
export function entryPayoutMinor(
  entry: { amountCents: number; reversedCents: number; currency: string },
  deal: { currency: string; conversionRate: number | null },
  payoutCurrency: string,
): number {
  const net = entry.amountCents - entry.reversedCents;
  return convertMinor(net, deal.conversionRate ?? 1, entry.currency, payoutCurrency);
}

/** Normalize a user-entered currency code to a valid ISO-4217-style 3-letter code. */
export function normalizeCurrencyCode(input: string | null | undefined, fallback = "USD"): string {
  const c = (input ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : fallback;
}

/** A small, sane default list for the admin currency picker (free entry also allowed). */
export const COMMON_CURRENCIES = [
  "USD", "EUR", "GBP", "AED", "SAR", "INR", "JPY", "CNY", "CAD", "AUD",
  "CHF", "SGD", "HKD", "BRL", "MXN", "ZAR", "TRY", "NGN", "KES", "EGP",
] as const;
