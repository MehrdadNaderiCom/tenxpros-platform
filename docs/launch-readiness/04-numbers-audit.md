# Numbers Audit

Deliverable 4. Rule: every commission rate, tier threshold, cap, and payout figure in partner-facing content and UI renders from the config source of truth, with no hardcoded literal that could drift.

## Result: PASS for all commission numbers

The single source of truth is `PROGRAM_CONFIG_DEFAULTS` (type `EffectiveConfig`) in `src/lib/partner/config.ts`, formatted for display by `formatBp` in `src/lib/partner/constants.ts`. Customer prices are in `src/lib/program-data.ts` (`pricingTiers`).

### Partner-facing surfaces verified as config-sourced

| Surface | How it renders numbers |
|---|---|
| `src/app/(public)/partners/page.tsx` | Rates and caps via `formatBp(CFG.*)`; account limits, seat gate, pilot days, focus ceiling via `CFG.*`. No literals. |
| `src/lib/partner/terms.ts` | `buildPartnerTermsSections(cfg)` renders every rate, cap, threshold, window, and override from `cfg` (built from `PROGRAM_CONFIG_DEFAULTS`). The client terms modal consumes the built array. |
| `prisma/seed/academy/m03-rules.ts` | Per-function rates and caps via `${pct(CFG.*)}`; the two worked examples compute their sums from config (`sumB2c`, `sumB2b`, `Math.min(sum, cap)`), so they cannot drift. |
| `prisma/seed/academy/m13-motions.ts` | Rates and caps via `${pct(CFG.*)}`; Founding and standard prices from `pricingTiers`. |

Every rendered number was verified to equal the previous hardcoded literal exactly during the de-hardcoding (no drift): basic 5 percent, qualified 10/8, strong 15/12, closing 5/10, delivery 5 to 8, caps 25/30/35, seat gate 40, pilot 90 days, protection 120 days at Tier 1, payment 30 business days, override 50 percent, growth 1 percent, focus start 1 percent and ceiling 35 percent, tier thresholds 40 and 15, windows 12 months, prices 997 and 2497.

### The other academy modules

Modules 1, 2, 4 to 12, 14 to 17 contain no hardcoded commission rate, cap, or price. Commission figures appear only in modules 3 and 13, both config-interpolated. Module 2 states the Net Receipts principle with no numbers.

### Acceptable non-config numbers (not commission figures, correctly left as literals)

These are not rates, caps, or payout figures and are not expected to be config-driven: the twelve-week program length, the four phases and their week ranges, the seven-day pilot notice, the scorecard days (14, 30, 60, 90), fixed legal periods (24 months non-circumvention, 12 months non-solicitation, 30-day arbitration negotiation), and the statement query window (30 days). A small number of these live in the terms text as literals and are noted as such in `terms.ts` where no config field exists (focus grant duration, recognition-letter waiting period, statement query window).

## Summary

All partner commission rates, tier thresholds, caps, the seat gate, the payout window, and the customer prices render from config. A change to a number in `config.ts` or `program-data.ts`, plus a content re-seed, updates the public page, the terms, and modules 3 and 13 together. No drift-prone commission literal remains in partner-facing content or UI.
