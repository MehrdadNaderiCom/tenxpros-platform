# Phase 1 plan: raise the B2C per-deal cap from 25 percent to 28 percent

**Status: PLAN ONLY. Nothing has been changed, nothing has been built. Phase 2 begins only on the owner's approval of this document.**

The decision under plan: `capB2cBp` moves from 2500 to 2800 basis points. This is the ONLY number that changes. The B2B cap stays 3000, the Tier 3 focus ceiling stays 3500, the growth bonus stays inside the per-deal cap, and no rate, threshold, or other config value moves. The reason: the realistic B2C full stack (strong origination 15 + closing 5 + delivery 8) sums to exactly 28 percent, and the owner wants that combination to pay in full, with 28 percent as the absolute B2C ceiling that nothing ever exceeds (Tier 3 focus remaining the one existing exception, unchanged).

This change is entangled with the uncommitted Academy clarity content in the working tree, which currently teaches the cap as 25 percent and carries a worked scale-down example built on it. Phase 2 moves them together, as one consistent set.

---

## 1. The config change, and how the LIVE engine gets the new number

Three coordinated pieces, all additive (no key, column, or enum value dropped; one integer default and one integer value change):

1. **Compile-time default:** `src/lib/partner/config.ts` line 49, `capB2cBp: 2500` becomes `capB2cBp: 2800` in `PROGRAM_CONFIG_DEFAULTS`. This is what the terms, the public page, the generator, and the Academy seeds render from.
2. **Schema default:** `prisma/schema.prisma`, model `ProgramConfig`, `capB2cBp Int @default(2500)` becomes `@default(2800)`. This affects only a future re-creation of the singleton row; it is expressed as a one-line additive migration (`ALTER TABLE ... ALTER COLUMN ... SET DEFAULT 2800`), no data touched by the DDL itself.
3. **The live row, which is what the engine pays from.** The deployed engine reads the DB singleton (created 2026-06-27 with 2500; verified today: `capB2cBp = 2500`). Changing defaults does NOT touch an existing row. The plan is to update it in the SAME new migration, as a guarded, idempotent data statement:

   `UPDATE "ProgramConfig" SET "capB2cBp" = 2800, "updatedBy" = 'migration: raise B2C cap to 28 percent' WHERE "id" = 'singleton' AND "capB2cBp" = 2500;`

   Why a migration and not the other paths: it runs inside `prisma migrate deploy` on container start, BEFORE the app serves a single request, so the engine and every published surface flip to 28 percent atomically in the same deploy, with the change recorded in `_prisma_migrations`. The `WHERE capB2cBp = 2500` guard makes it idempotent and means a deliberately different future value would never be silently overwritten. The alternatives are worse: the superadmin config editor after deploy is a manual step with a drift window (surfaces publishing 28 while the engine still pays 25), and the content seed never touches `ProgramConfig` and should not start to.
4. **Per-partner overrides:** `PartnerConfig.capB2cBp` (nullable override) verified in the live DB: zero PartnerConfig rows exist, so there is nothing to migrate; the override mechanism stays as is.

**A warning for Phase 2 execution:** `smallPayoutThresholdCents: 2500` (the 25 dollar small-payout threshold, `config.ts` line 91) is the same literal as the cap. No bulk find-and-replace of 2500 anywhere; every edit is targeted. The historical migration `20260627000000_partner_program/migration.sql` also contains `DEFAULT 2500` for the cap and must NOT be edited (applied migrations are checksum-pinned).

## 2. Every place the B2C cap is rendered or taught

**Automatic (config-sourced; correct the moment the defaults change, with the Academy rows refreshed by the standard content reseed):**

| Site | What renders |
|---|---|
| `src/lib/partner/commission.ts` (`capBpForDeal`) | the engine itself; pays 28 once the DB row updates |
| `src/lib/partner/constants.ts` (`CONFIG_FIELD_META`) | the admin config editor row |
| `src/lib/partner/terms.ts` (cap bullet and every cap mention) | terms text |
| `src/app/(public)/partners/page.tsx` (cap paragraph and table) | public page |
| `scripts/generate-partner-section.ts` | reference document and PDF |
| `prisma/seed/academy/m03-rules.ts` | every `pct(CFG.capB2cBp)`; the below-cap example (`paidB2c = min(23, cap)`) stays 23 percent and stays correct |
| `prisma/seed/academy/m13-motions.ts` | the "capped at" sentence |

Zero hardcoded "25 percent" (in digits or words) exists in any runtime content: verified by grep. The live Academy DB rows and the narration MP3s carry the old figures baked in; the deploy's standard content reseed (`dump-content.ts` then `seed-content.cjs`) refreshes the lessons, and the narration re-bakes itself automatically (the text hash goes stale, and the container-start job regenerates the affected lessons, roughly two lessons times three voices of Piper work).

**Manual edits needed in Phase 2:**

- The m03 worked over-cap example (breaks at 28; section 3 below).
- Two stale code comments that hardcode the old caps: `src/lib/partner/commission.ts:633` ("25% B2C / 30% B2B") and `src/lib/actions/partner-admin.ts:1189` ("which keep the 25%/30% cap"). Comment-only rewrites to config-neutral wording.
- The clarity review package (`docs/academy-commission-clarity-report.md` and `-revisions.md`): the cap fairness section and quoted examples were written at 25 and will be reworked (section 4).
- `docs/academy/partner-section-complete.md` and `.pdf`: regenerate from the updated generator.
- Historical documents that state 25 percent as current: `docs/report-1-partner-pay-as-live.md` (an "as live" snapshot) and `docs/commission-redesign-complete-report.md` (says "currently 25 percent") get a one-line dated addendum noting the cap changed; the dated audits (`partner-commission-independent-audit-2026-07-03*.md`, `partner-commission-rules-independent-audit-2026-07-03.md`) and the design records (`docs/partner-program/01-PLAN.md`, `02-RESULT.md`, `03-FINAL.md`) are left untouched as historical records of what was true on their dates. The owner can override this split at review.

## 3. The worked scale-down example that breaks, and its replacement

**What breaks.** The current m03 example says strong origination (15) + closing (5) + delivery (8) "adds to 28 percent, which is above the 25 percent B2C cap," and works the scale-down through per line (13.39 / 4.46 / 7.14). At a 28 percent cap that sentence becomes false: 28 lands exactly ON the cap, nothing clamps, and the per-line "scaled" figures degenerate to the original rates.

**The replacement plan.** The paragraph keeps its teaching arc but gains a better story, in three beats, every figure computed from config so nothing can drift:

1. **The full stack now pays in full.** "On a B2C deal where you strongly originated (15), closed (5), and delivered (8), the rates add to exactly 28, which is exactly the B2C cap: the realistic full stack pays in full, to the last line." (Rendered from `strongSumB2c` and `CFG.capB2cBp`; this mirrors the existing B2B at-cap example at 30.)
2. **The over-cap case that still teaches the scale-down.** A fourth line joins: a confirmed basic introduction (5) made by ANOTHER partner sits on the same deal. The deal's lines now add to 33 (computed as `strongSumB2c + CFG.basicIntroductionBp`), above the 28 cap, so every percentage line scales by cap over raw total (28/33): the 15 origination line becomes about 12.73, the 5 closing line about 4.24, the 8 delivery line about 6.79, and the 5 introduction line about 4.24, together landing exactly on 28. (Arithmetic verified: 28/33 = 0.8485; 12.73 + 4.24 + 6.79 + 4.24 = 28.00.)
3. The existing closer stays: several functions make the rates add; the cap only limits the sum; the engine re-applies the clamp whenever lines change.

**Why the two-partner framing instead of "the same partner also made the introduction":** the owner's suggested same-partner combination (15+5+8+5 by one person) is arithmetically identical, but it sits awkwardly against the involvement boundary this very content just sharpened: a Basic Introduction means introducing and stepping away with zero meetings, while an origination means attending the meetings, so one partner claiming both on one deal contradicts the definitions. The two-partner version teaches the same scale-down AND honestly shows that the cap is shared across partners. If the owner prefers the same-partner variant anyway, only the connecting sentence changes; the numbers are identical. To be settled at the Phase 2 review.

Seed-level mechanics: `strongSumB2c` (28) stays and becomes the at-cap beat; a new `overSumB2c = strongSumB2c + CFG.basicIntroductionBp` (33) feeds the over-cap beat, and the `scaledPct` helper's denominator moves from `strongSumB2c` to `overSumB2c`.

## 4. The cap fairness picture at 28 percent

Reworked with the same method as the existing analysis (and Phase 2 will re-verify the final table by running the engine itself, as the current table was verified):

- **The B2C wall disappears.** Strong + closing + delivery (28) pays in full. The two painful marginals both become 100 percent: closing added after strong + delivery was effectively 40 percent of its rate at the old cap, and delivery added after strong + closing was 62.5 percent; both now pay their full rate.
- **The new ceiling behaves like B2B's.** A FOURTH line beyond the 28 full stack nets zero marginal on that deal and dilutes the others proportionally: the two-partner example above pays the introducer an effective 4.24 while the full-stack partner drops from 28.00 to 23.76. This is the same structure as B2B, where the 30 full stack pays in full and only a further line hits the ceiling. The program becomes symmetric: on both sides, the realistic single-partner full stack pays every line in full, and only additional lines beyond it are capped.
- **B2B is unchanged in every respect** (cap 3000, focus ceiling 3500, all combinations and marginals identical to the current analysis), and the growth bonus stays inside the cap by decision, meaning it still nets zero on a fully stacked B2B deal; that is the known, accepted consequence of keeping the cap a single hard ceiling.
- **Tier 3 focus** (35) unchanged; under focus, even the B2C 33-line two-partner stack pays every line in full.

## 5. Exam questions

- The repurposed m03 stacking-and-cap exam question is purely structural ("the total is clamped to the cap, and the percentage lines are scaled down in proportion to fit it exactly") and names no number: it remains true at 28 and remains answerable from the revised lesson, which still teaches the clamp through the new 33-over-28 example. No change needed.
- Verified by inspection of every exam and exercise across all modules: no question or option anywhere hardcodes 25 percent, 2500, or any cap figure (the only cap-adjacent question, m13 exam Q9, says "within the per deal cap" structurally). No question edits are required by this change.

## 6. Tests

**Must change:**
- `tests/partner-config.test.ts:22`: `expect(base.capB2cBp).toBe(2500)` becomes 2800.
- `tests/partner-commission.test.ts`, the committed-external-headroom test (~lines 425-450): its expectations were computed at the 25 cap. At 2800 the cap is 5,600 dollars on the test's 20,000 net, the already-PAID 1,000 plus the 4,600 of new lines land exactly on the cap, so `capped` flips to false and `totalCents` becomes 460,000: the test would FAIL as written, and if merely re-pointed it would no longer exercise the clamp. Plan: keep the scenario clamping by raising the already-PAID line (for example a PAID delivery at 8 percent, 1,600, so paid + new = 6,200 breaches the 5,600 cap and the new lines clamp to 4,000), with the comments updated; the test then still pins exactly the headroom-consumption behavior it was written for.
- Same file, the "PAID lines already fill the cap" test: assertions are config-derived and pass unchanged; only its "25%" comment is updated.

**Verified unaffected:** `tests/partner-engine-invariants.test.ts` pins `cfg.capB2cBp` by regex (config-neutral); the phase-a/b/c redesign suites and the cap-airtight invariants compute from `cfg` rather than literals; the involvement, academy, and narration suites carry no cap figures. The full suite runs as a Phase 2 gate regardless, so any surprise literal surfaces there.

**New pins to add in Phase 2:** the config value 2800; B2C strong + closing + delivery passing UNCAPPED at exactly the cap; and the 33-line stack clamping to 28 with the per-line scaled figures, pinning the new worked example's arithmetic against the engine.

## Phase 2 scope (on approval), and the deploy after it

Phase 2 executes exactly this plan: the three config pieces, the two comment rewrites, the m03 example replacement, the clarity report and revisions rework, the regenerated reference document and PDF, the dated addenda on the two snapshot reports, and the test updates with the new pins; then the deterministic gates (tsc, content dash lint, full suite, content dump validation, build) and a refute-first adversarial review of the whole entangled set, returning the full revised content and a report for the owner's review, still without committing being pushed to production. Deployment remains the separate later step that ships the cap change, the clarity content, and the pending audio together in one safe deploy: the migration flips the live row on container start, the content reseed refreshes the lessons, and the narration re-bakes the affected lessons automatically.

**HARD STOP. Awaiting the owner's approval of this plan before any change is made.**
