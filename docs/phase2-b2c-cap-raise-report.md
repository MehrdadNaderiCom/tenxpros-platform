# Phase 2 report: the B2C cap raise to 28 percent, built and reviewed, awaiting the owner

**Status: BUILT, NOT COMMITTED, NOT DEPLOYED.** Everything sits in the working tree together with the Academy clarity content as one coherent set, exactly as approved in `docs/phase1-b2c-cap-raise-plan.md`, with the confirmed decision applied: the over-cap worked example uses the two-partner framing.

`capB2cBp` moved from 2500 to 2800. This is the only commercial number that changed: the B2B cap stays 3000, the Tier 3 focus ceiling stays 3500, the growth bonus stays inside the cap, and no rate, threshold, or other config value moved (verified in the diff; `smallPayoutThresholdCents`, coincidentally also 2500, is untouched).

## 1. The config change, before and after

- `src/lib/partner/config.ts`: `capB2cBp: 2500` is now `capB2cBp: 2800` (PROGRAM_CONFIG_DEFAULTS, which the terms, the public page, the generator, and the Academy seeds render from).
- `prisma/schema.prisma`: `capB2cBp Int @default(2500)` is now `@default(2800)` (affects only a future re-creation of the singleton row).
- **New migration `prisma/migrations/20260706090000_raise_b2c_cap/migration.sql`**: the `ALTER COLUMN ... SET DEFAULT 2800` plus the guarded, idempotent update of the live singleton row:
  `UPDATE "ProgramConfig" SET "capB2cBp" = 2800, "updatedBy" = 'migration: raise B2C cap to 28 percent' WHERE "id" = 'singleton' AND "capB2cBp" = 2500;`
  At deploy it runs inside `prisma migrate deploy` on container start, before the app serves, so the paying engine and every published surface flip to 28 percent atomically. The guard makes it idempotent and protects any deliberately different future value. The historical 20260627 migration was not touched.
- The live database is untouched today (no deploy); the live engine still pays 25 percent until the deploy ships this.

## 2. The m03 worked example, before and after

**Before** (written when the cap was 25): "a B2C deal where you strongly originated (15%), closed (5%), and delivered at 8% adds to 28%, which is above the 25% B2C cap, so the total is clamped to 25% ... the 15% origination line becomes about 13.39%, the 5% closing line about 4.46%, and the 8% delivery line about 7.14% ..." At a 28 percent cap that example no longer clamps, so it was rebuilt.

**After** (rendered exactly as a partner will read it, every figure computed from config):

> And the flagship case: on a B2C deal where you strongly originated (15%), closed (5%), and delivered at 8%, the rates add to 28%, which is exactly the 28% B2C cap: the realistic full stack pays in full, to the last line, just as the strong B2B stack lands exactly on its own cap. When a stacked total does go OVER the cap, the percentage lines are scaled down in proportion to fit exactly, so no line keeps its full rate. For example, a confirmed basic introduction of 5% made by another partner sits on that same fully stacked deal: the deal's lines now add to 33%, above the 28% cap, so every percentage line scales by the cap divided by the raw total: your 15% origination line becomes about 12.73%, your 5% closing line about 4.24%, your 8% delivery line about 6.79%, and the other partner's 5% introduction line about 4.24%, together landing exactly on the 28% cap. Notice what that shows honestly: the cap is shared across every partner on the deal, so an extra line is paid out of the same single ceiling.

The existing closer stays (stacking makes rates add; the cap limits the sum; the engine re-applies the clamp when lines change), the below-cap example (23 percent) and the at-cap B2B example (30 percent) remain correct unchanged, and the seed helpers now carry `strongSumB2c` (28, the at-cap beat) and `overSumB2c` (33, the over-cap beat) with `scaledPct` pointed at the over-cap sum.

## 3. The fairness picture at 28 (reworked in the clarity report)

The full reworked table lives in `docs/academy-commission-clarity-report.md`; the substance: the B2C wall is gone (strong + closing + delivery pays in full; the old 40 percent marginal on closing and 62.5 percent on delivery both become 100 percent), the structure is now symmetric with B2B (the realistic single-partner full stack pays in full on both sides, and only a further line beyond it hits the ceiling: a fourth B2C line dilutes the stack from 28.00 to 23.76 and nets the introducer an effective 4.24), and the B2B picture is unchanged in every respect, with the growth bonus still inside the cap by decision. The table's numbers were independently re-verified by running the engine itself in the adversarial review.

## 4. Comments, tests, and documents

- The two stale code comments that hardcoded "25%/30%" (the `computeDealCommission` doc comment in `commission.ts` and the focus-ceiling comment in `partner-admin.ts`) now name the config fields instead, so no comment states a fixed cap number.
- Tests: `partner-config.test.ts` expects 2800; the committed-headroom test was rebuilt so it still genuinely exercises the clamp at the new cap (a PAID 2,000 dollar fixed-fee delivery plus 4,000 dollars of new percentage lines breaches the 5,600 dollar cap and clamps to 3,600, with paid plus recomputed landing exactly on the cap); the stale "25%" comment in the paid-fills-the-cap test was corrected; and two NEW pins were added against the engine: the 28 percent full stack passing UNCAPPED at exactly the cap (with an assertion that the three rates sum to the cap, so any future rate change that breaks the at-cap identity fails loudly), and the two-partner 33 percent stack clamping to exactly 28 with the cents-exact per-line amounts (254,546 / 84,848 / 135,758 / 84,848 on a 20,000 dollar net, matching the taught 12.73 / 4.24 / 6.79 / 4.24).
- Documents: the reference document and PDF were regenerated from the updated generator (`docs/academy/partner-section-complete.md` and `.pdf`, now showing the 28 percent cap everywhere); the clarity review package was reworked (`docs/academy-commission-clarity-report.md` fairness section at 28, and `docs/academy-commission-clarity-revisions.md` with the rebuilt section 1 and a round-three section covering the cap change, the comment rewrites, and the new pins); dated addenda were added to the two snapshot reports that stated 25 percent as current (`docs/report-1-partner-pay-as-live.md`, `docs/commission-redesign-complete-report.md`); the dated audits and the partner-program design records were left untouched as historical records.

## 5. Per-file list of what changed in this phase

- `app/src/lib/partner/config.ts` (capB2cBp 2800)
- `app/prisma/schema.prisma` (ProgramConfig capB2cBp default 2800)
- `app/prisma/migrations/20260706090000_raise_b2c_cap/migration.sql` (new: default + guarded row update)
- `app/prisma/seed/academy/m03-rules.ts` (helpers: overSumB2c, scaledPct denominator; the rebuilt two-beat cap paragraph)
- `app/src/lib/partner/commission.ts` and `app/src/lib/actions/partner-admin.ts` (comment-only: config-neutral cap wording)
- `app/tests/partner-config.test.ts`, `app/tests/partner-commission.test.ts` (updated expectations, rebuilt headroom test, two new pins)
- `docs/academy-commission-clarity-report.md`, `docs/academy-commission-clarity-revisions.md` (reworked at 28)
- `docs/academy/partner-section-complete.md` + `.pdf` (regenerated)
- `docs/report-1-partner-pay-as-live.md`, `docs/commission-redesign-complete-report.md` (dated addenda)

## 6. Gates and the adversarial review

Deterministic gates after the build: tsc clean, content dash lint clean, the FULL test suite passes (412 tests, 31 files, including the two new engine pins), the content dump validates (every exam-bearing module still exactly 12 exam and 6 exercise questions; the rendered lesson teaches "exactly the 28% B2C cap"; zero stale "25 percent cap" claims), and the production build compiles.

The refute-first three-lens adversarial review ran over the whole entangled set (the cap change plus the clarity content as one system):

- **The config-and-migration lens returned ZERO findings**: the migration SQL was validated against the real schema, the diff carries no other config change, `smallPayoutThresholdCents` is untouched, the historical migration is untouched, and the PartnerConfig override mechanism is untouched.
- **The tests-and-fairness lens independently re-ran the engine** on every fairness-table combination at the new cap (and at the old cap for the historical marginals) and confirmed the numbers, the rebuilt headroom test, and the cents-exact figures in the new pins.
- **Two minor findings were confirmed, both in the review DOCUMENTS only** (no partner-facing surface, code, or test carried either): the fairness prose miscounted the B2C over-cap addition as a "fifth" contribution when it is the fourth line on the deal, and the historical delivery marginal was written as 62 percent where the engine gives exactly 62.5. Both were corrected across all three documents and re-verified by grep; the review then stands at zero.

**NOT COMMITTED, NOT DEPLOYED. Stopped for the owner's review.** Deployment remains the separate later step that ships the cap change, the clarity content, and the audio together in one safe deploy, where the migration flips the live row on container start, the content reseed refreshes the lessons, and the narration re-bakes the affected lessons automatically.
