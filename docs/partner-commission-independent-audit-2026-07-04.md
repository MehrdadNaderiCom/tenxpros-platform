# Partner Commission Rules: Independent Audit Report

**Auditor role:** Independent verification against code, config, partner-facing surfaces, live site, and live database. No prior reports or documentation claims were trusted without re-checking.

**Audit date:** 4 July 2026

**Intended model (audit brief):** Basic Introduction 5% both; Qualified Origination 10% B2C / 8% B2B; Strong Origination 15% B2C / 12% B2B by paid-collected seats (inclusive thresholds: 15 B2C seats alone, B2B needs New/Dormant domain AND 10 seats); Closing 5% B2C / 10% B2B with at most one sub-one-hour company meeting; Delivery 8% single rate; Renewal Override 50% of opener rate B2B only; Growth Bonus 1% B2B by domain; caps 25% B2C / 30% B2B / 35% Tier 3 focus; all commercial numbers from one config source; retired dollar rules retained but not current; no em dashes, en dashes, or minus signs in partner-facing content.

---

## Executive summary

The system is **internally consistent** across the legal terms, public partners page, reference document generator, Partner Academy (Modules 2, 3, 11, 13 and their exam pools), the commission engine, the live production pages, and the live `ProgramConfig` database row.

**One material discrepancy vs the audit brief’s stated intended model:** the B2C per-deal cap is **28%**, not 25%. This is deliberate, deployed, and uniform everywhere (config default, live DB, live site, terms, academy). Every other rate, threshold, cap, and rule in the brief matches the live system.

**No superseded partner-facing rule** (dollar high-value Strong test, 40-seat unlock, Panel classification of Strong, 5 to 8% delivery band) was found on any current surface or in the live academy database.

**Minor findings:** a handful of **hardcoded time-window literals** in academy prose and one terms line that could drift from config; one **comprehension edge** around B2B below-threshold deals showing `STRONG_ORIGINATION` on the statement while paying the Qualified rate.

---

## What was checked

| Area | Artifacts inspected |
|------|---------------------|
| Config source | `app/src/lib/partner/config.ts` (`PROGRAM_CONFIG_DEFAULTS`), `app/src/lib/partner/config-server.ts` (resolver pattern) |
| Engine | `app/src/lib/partner/commission.ts`, `app/src/lib/actions/partner-admin.ts` (pay path) |
| Legal / terms | `app/src/lib/partner/terms.ts`, `app/src/app/(public)/partners/terms/page.tsx` |
| Public page | `app/src/app/(public)/partners/page.tsx` |
| Reference generator | `app/scripts/generate-partner-section.ts` |
| Academy seeds | `app/prisma/seed/academy/m02-identity.ts`, `m03-rules.ts`, `m11-operations.ts`, `m13-motions.ts` |
| Tests | `partner-commission.test.ts`, `involvement-seat-redesign.test.ts`, `commission-redesign-phase-b.test.ts`, `commission-redesign-phase-c.test.ts` (129 tests, all passed) |
| Live site | `https://tenxpros.com/partners`, `https://tenxpros.com/partners/terms` (HTTP 200, HTML extracted) |
| Live DB | `ProgramConfig` singleton via `docker exec tenxpros-db psql`; `AcademyLesson` / `AcademyQuestion` for modules `rules`, `identity`, `motions`, `operations`, `selling` |

---

## Dimension 1: Cross-surface consistency

### Consistent (evidenced)

**Commission rates (all from `PROGRAM_CONFIG_DEFAULTS`, rendered via `formatBp`):**

| Function | B2C | B2B | Config keys |
|----------|-----|-----|-------------|
| Basic Introduction | 5% | 5% | `basicIntroductionBp` = 500 |
| Qualified Origination | 10% | 8% | `qualifiedOriginationB2cBp` / `qualifiedOriginationB2bBp` |
| Strong Origination | 15% | 12% | `strongOriginationB2cBp` / `strongOriginationB2bBp` |
| Closing | 5% | 10% | `closingB2cBp` / `closingB2bBp` |
| Delivery | 8% | 8% | `deliveryPercentBp` = 800 |
| Renewal Override | B2B only | 50% of opener rate | `overrideShareBp` = 5000 |
| Growth Bonus | (B2B org count) | 1% | `growthBonusBp` = 100, threshold 3 orgs |

**Seat-based Strong rule** is stated the same way on:
- Terms (`buildPartnerTermsSections`, bullets under “How commission is earned”): 15 seats B2C, 10 seats B2B, New/Dormant domain required on B2B, below-threshold new B2B keeps classification but pays Qualified, no seats means Qualified.
- Public partners page footnote (`partners/page.tsx` lines 228–235).
- Academy Module 3 lesson (`m03-rules.ts` `bodyHtml`, “Qualified or strong, and who decides”).
- Academy Module 13 (`m13-motions.ts`, “What you earn, by motion”).
- Reference generator (`generate-partner-section.ts`, reconstructed Part 1).

**Involvement boundaries** align across terms, partners page, Module 2, and Module 3:
- Basic Introduction: warm attestation, zero meetings, no follow-up.
- Qualified Origination: attends meetings and takes follow-up.
- Closing: partner drives to signed/started contract; company at most one online meeting up to forty five minutes.

**Override B2B only:** Prose on partners page, terms, Module 3; commission table B2C cell reads “B2B only” (not “50% of opener rate” in both columns). Live HTML confirms: `Renewal Override` row shows `B2B only` | `50% of the opener rate`.

**Growth Bonus B2B scope:** Terms tier section, Module 3 glossary and bonus section, partners Tier 2 blurb (“genuinely new B2B organisations”), Module 13 commission paragraph. Counting is by domain; no domain means no growth credit (Module 3 exercise + exam coverage).

**Caps on published surfaces:** B2C **28%**, B2B **30%**, Tier 3 focus ceiling **35%** (terms, partners page, Module 3 worked examples, live site).

**Retired rules absent from partner-facing content:** Grep and live DB regex scan found **zero** occurrences of “40 seat unlock”, “high value sale” (as Strong criterion), “5 to 8 percent” delivery band, “Panel classification of strong”, or “realistically closable” in academy seeds, live `AcademyLesson.bodyHtml`, or live `AcademyQuestion` stems/options/explanations. Retired fields exist only in `PROGRAM_CONFIG_DEFAULTS` and admin config metadata under group “Retired (not used by current rules)”.

**Typography rule:** No Unicode em dash (`—`), en dash (`–`), or minus sign (`−`) in `app/src/lib/partner/`, `app/src/app/(public)/partners/`, or `app/prisma/seed/academy/`. Standard ASCII hyphens appear in compounds (“same-scope”, “pre-existing”, “commission-only”).

### Discrepancy vs audit brief intended model

| Item | Brief says | System says (everywhere) | Severity |
|------|------------|--------------------------|----------|
| B2C per-deal cap | 25% | **28%** (`capB2cBp` = 2800) | **Major** (vs brief only; **not** a cross-surface contradiction) |

**Evidence:**
- Config: `app/src/lib/partner/config.ts` line 49: `capB2cBp: 2800`
- Live DB: `SELECT "capB2cBp" FROM "ProgramConfig"` → `2800`
- Live terms HTML: “Cap per deal … **28%** of Net Receipts on B2C and **30%** on B2B”
- Live partners page HTML: cap row `28%` | `30%`; prose “capped at 28% … 30% … 35%”
- Module 3 worked example explicitly teaches the 28% full stack (strong + closing + delivery = 28% exactly)

**Suggested fix (only if 25% is still the business intent):** Revert `capB2cBp` to 2500 in config + migration, rebuild m03 cap examples, redeploy. If 28% is the current business intent, update the audit brief / owner spec to say 28% so external documentation matches deployed truth.

### Minor cross-surface gap (tier promotion numbers, not commission rates)

Academy Module 3 tier ladder prose says “a **defined number** of paid, non refunded seats within twelve months” without rendering `tier2SeatThreshold` (40) or `tier3FocusSeatThreshold` (15). The **terms** do render these from config (`terms.ts` line 124). Partners marketing tier cards also omit the numeric thresholds.

**Severity:** Low (promotion thresholds, not pay rates). **Fix:** Interpolate `${CFG.tier2SeatThreshold}` and `${CFG.tier3FocusSeatThreshold}` into Module 3 tier bullets the same way terms do.

---

## Dimension 2: Engine agreement

### Consistent (evidenced)

**Live pay path uses `classifyOrigination`, not retired unlock/dollar logic.** In `partner-admin.ts` (lines 979–1039), origination lines:
1. Aggregate `PAID_COLLECTED` seats only.
2. Derive `newness` via `companyNewnessState` on canonical domain.
3. Call `classifyOrigination({ newness, hasDomain, dealKind, seatCount, cfg })`.
4. Record `cls.function` and `cls.rateBp` (never operator-chosen strength).

**Pinned engine behaviour (matches surfaces and 129 passing tests):**
- Inclusive seat comparison: `seatCount >= threshold` (`commission.ts` lines 343, 328).
- `null` seat count → Qualified, never Strong (lines 362–364, 402–404).
- B2C Strong: seats alone; `isNewCompany: false`; domain ignored (lines 345–365).
- B2B Strong: requires `hasDomain` and `newness` NEW or DORMANT and `meetsSeats` (lines 368–405).
- B2B below threshold: `function: STRONG_ORIGINATION`, `rateBp: qualifiedRate`, `paidStrongRate: false`, `isNewCompany: true` (lines 396–405).
- B2B Existing: always Qualified regardless of seats (lines 377–384).
- Override refused on B2C: `partner-admin.ts` lines 1066–1067 return error “B2B accounts only”.
- Growth bonus refused on B2C: lines 1110–1111 return error “paid on B2B deals only”.
- Delivery pays `deliverySingleRateBp(cfg)` → `deliveryPercentBp` (800 bp = 8%), not retired min/max band.
- Cap clamp: `computeDealCommission` scales percentage lines to `capB2cBp` / `capB2bBp` / `tier3FocusHardCeilingBp` when stacked functions exceed cap; weighted splits counted once.

**Retired code still present but not on pay path:** `originationRateBp` retains `strongOriginationUnlockSeats` (40) and `strongUnlockedByPanel` branches (`commission.ts` lines 43–61). Server origination flow never calls this for classification; it calls `classifyOrigination` first. **No partner-facing discrepancy**, but the dead branch remains a maintenance hazard.

**Suggested fix:** Add a code comment or delete the unlock branch from `originationRateBp` if no caller needs it; ensure `deriveFunctionRate` for `STRONG_ORIGINATION` cannot be reached without prior classification on the server action.

---

## Dimension 3: Numbers from config

### Consistent (evidenced)

Partner-visible **commission rates, seat thresholds, caps, override share, and origination window** are rendered from `PROGRAM_CONFIG_DEFAULTS` (or `buildPartnerTermsSections(cfg)`) on:
- `app/src/app/(public)/partners/page.tsx` (imports `PROGRAM_CONFIG_DEFAULTS as CFG`)
- `app/src/lib/partner/terms.ts` (`buildPartnerTermsSections`)
- `app/scripts/generate-partner-section.ts`
- `app/prisma/seed/academy/m03-rules.ts` and `m13-motions.ts` (import `CFG`, use `formatBp`, `CFG.strongSeatThresholdB2c`, etc.)

Grep for bare `5%`, `10%`, `15%`, `25%`, `28%`, etc. in those partner-facing paths returned **no hardcoded rate literals** (percentages are always `formatBp(CFG.*)` or computed from `CFG`).

### Hardcoded literals that could drift (findings)

| Severity | Location | Literal | Config field | Current match? |
|----------|----------|---------|--------------|----------------|
| Low | `terms.ts` line 56 | “end the pilot on **7 days** written notice” | `pilotTerminationNoticeDays` = 7 | Yes |
| Low | `m03-rules.ts` `bodyHtml` line 72 | “**ninety day** … **seven days**” | `pilotDays` = 90, `pilotTerminationNoticeDays` = 7 | Yes |
| Low | `m03-rules.ts` lines 99, 128 | “**thirty business days**” | `paymentBusinessDays` = 30 | Yes |
| Low | `m03-rules.ts` tier bullets | “**twelve months**” | `tierQualifyingWindowMonths` = 12 | Yes |
| Info | `terms.ts` line 111 | “query within **30 days**” | No config field (noted in file header as intentional literal) | N/A |
| Info | `partners/terms/page.tsx` metadata | “**90-Day** Partner Pilot Letter” | `pilotDays` = 90 | Yes |

**Suggested fix:** Replace pilot/payment/window prose in `m03-rules.ts` and the “7 days” string in `terms.ts` with `${cfg.pilotDays}`, `${cfg.pilotTerminationNoticeDays}`, `${cfg.paymentBusinessDays}`, `${cfg.tierQualifyingWindowMonths}` for full config-driven rendering.

---

## Dimension 4: Live state

### Consistent (evidenced)

**Live `ProgramConfig` row** (queried 4 Jul 2026):

```
capB2cBp=2800, capB2bBp=3000, tier3FocusHardCeilingBp=3500,
strongSeatThresholdB2c=15, strongSeatThresholdB2b=10,
overrideShareBp=5000, growthBonusBp=100,
basicIntroductionBp=500, qualifiedOriginationB2cBp=1000, qualifiedOriginationB2bBp=800,
strongOriginationB2cBp=1500, strongOriginationB2bBp=1200,
closingB2cBp=500, closingB2bBp=1000, deliveryPercentBp=800,
originationWindowMonths=12
```

This matches `PROGRAM_CONFIG_DEFAULTS` exactly. Retired fields (`strongOriginationUnlockSeats=40`, `strongValueThresholdB2cCents=500000`) are present in DB but unused by engine classification.

**Live pages** (`https://tenxpros.com/partners`, `https://tenxpros.com/partners/terms`):
- Commission table: 5%, 10%/8%, 15%/12%, 5%/10%, 8%, Override “B2B only” / “50% of the opener rate”, cap **28%** / **30%**
- Footnote: 15 seats B2C, 10 seats B2B + domain, below-threshold Qualified, Renewal Override B2B only
- Terms: identical thresholds and rates including “15 seats or more on B2C and 10 seats or more on B2B”

**Live academy database:**
- `rules` lesson: `has_superseded = false`; contains seat-count rules and 28% cap (`bodyHtml` LIKE '%28%'`)
- Zero exam/lesson questions matching superseded regex patterns (40 seat, panel classification, 5 to 8 percent, etc.)
- Commission-related exam questions in `rules`, `identity`, `motions`: `bad_options = false`, `bad_explanation = false` for all 29 commission-tagged rows queried

**No drift** detected between published pages, academy DB content, and engine config.

---

## Dimension 5: Comprehension and boundaries

### Clear and sound

- **Function involvement ladder** (intro → origination → closing → delivery) is repeated consistently and tied to observable behaviours.
- **Seat-based Strong** is explained with boundary scenarios in Module 3 (exactly at threshold, one below, no domain, Existing company).
- **Override same-scope vs new branch** is taught with concrete bank examples in Module 3 and tested in Module 3 exam.
- **Cap stacking and proportional scale-down** includes a worked two-partner example with computed percentages from config.
- **Panel as source of truth** is distinguished from “Panel decides Strong by opinion” (Module 2: “never decided on the Panel by opinion”).

### Comprehension risks (findings)

| Severity | Issue | Location | Why a partner could misunderstand | Suggested fix |
|----------|-------|----------|-----------------------------------|---------------|
| Medium | **Function label vs paid rate on below-threshold B2B new company** | Engine `classifyOrigination` records `STRONG_ORIGINATION` but pays Qualified rate; Module 3 explains this, but a commission statement may show “Strong Origination” beside a 8% line | Partner believes they earned “Strong” premium when they received Qualified pay | On statements, show paid rate and a plain clarification string from `cls.reason`, or display “New company origination (Qualified rate)” when `paidStrongRate` is false |
| Low | **Growth bonus deal-type gate** | Engine refuses `GROWTH_BONUS` on B2C; surfaces describe counting “new B2B organisations” but do not explicitly say “the bonus line is never added to a B2C deal” | Tier 2 partner might attempt to claim growth bonus on a B2C charter deal | Add one sentence to terms and Module 3: “The growth bonus line is recorded only on B2B closed deals.” |
| Low | **“forty five minutes” vs “one hour”** | Brief says “under one hour”; surfaces say “forty five minutes” | Slight mismatch with informal “one hour” mental model | Accept 45 minutes as stricter/clearer, or align wording to “under one hour (up to forty five minutes)” everywhere |

---

## Summary table

| Dimension | Verdict |
|-----------|---------|
| Cross-surface consistency | **Pass**, except B2C cap is 28% not 25% vs audit brief (internally consistent at 28%) |
| Engine agreement | **Pass** |
| Numbers from config | **Pass** for all commission rates/thresholds/caps; **minor** hardcoded time literals |
| Live state | **Pass** (pages, DB config, academy DB align) |
| Comprehension | **Pass** with two low and one medium clarity notes |

---

## Files and URLs cited

- Config: `/opt/tenxpros/app/src/lib/partner/config.ts`
- Engine: `/opt/tenxpros/app/src/lib/partner/commission.ts`
- Pay path: `/opt/tenxpros/app/src/lib/actions/partner-admin.ts`
- Terms builder: `/opt/tenxpros/app/src/lib/partner/terms.ts`
- Public page: `/opt/tenxpros/app/src/app/(public)/partners/page.tsx`
- Academy rules: `/opt/tenxpros/app/prisma/seed/academy/m03-rules.ts`
- Reference generator: `/opt/tenxpros/app/scripts/generate-partner-section.ts`
- Live: https://tenxpros.com/partners , https://tenxpros.com/partners/terms
- Live DB: `ProgramConfig` singleton on `tenxpros-db` Postgres

---

*End of report.*