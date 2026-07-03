# Partner Commission Rules: Independent Audit Report

**Auditor role:** Independent verification against source code and live running state only. No prior reports or documentation claims were accepted without re-checking.

**Audit date:** 3 July 2026

**Intended model verified against:** involvement-based functions; seat-based Strong origination (inclusive threshold, paid-collected seats only); B2B Strong requires New/Dormant domain plus seats; Override and Growth Bonus B2B-only; caps 25% / 30% / 35%; single config source for commercial numbers.

---

## Executive summary

Commission **rates, seat thresholds, caps, override share, and Strong-origination logic are consistent** across the legal terms builder, public partners page, reference document generator, Partner Academy Rules/Motions modules, the commission engine, and the live published site. **No partner-facing surface still presents the retired dollar high-value rule, the 40-seat Strong unlock, or Panel-granted Strong classification as current.**

I found **no engine-vs-surface pay mismatch** for the rules in scope. All 134 commission-related unit tests pass.

There are **five lower-severity discrepancies or comprehension gaps** (closing meeting wording, Growth Bonus deal-type clarity, dual config rendering paths, hardcoded pilot/window literals, and a weakened Basic Introduction glossary entry). None of these currently change what the engine would pay today.

---

## What was checked

| Area | Sources read / executed |
|------|-------------------------|
| Engine | `app/src/lib/partner/commission.ts`, `growth.ts`, `rules.ts`, `app/src/lib/actions/partner-admin.ts` |
| Config | `app/src/lib/partner/config.ts`, `config-server.ts`, live `ProgramConfig` row (PostgreSQL via `tenxpros-db` container) |
| Legal terms | `app/src/lib/partner/terms.ts`, live https://tenxpros.com/partners/terms |
| Public page | `app/src/app/(public)/partners/page.tsx`, live https://tenxpros.com/partners |
| Reference generator | `app/scripts/generate-partner-section.ts`, snapshot `docs/academy/partner-section-complete.md` |
| Academy | Seed `m02-identity.ts`, `m03-rules.ts`, `m11-operations.ts`, `m13-motions.ts`; live DB lessons and all exam/exercise questions for those modules |
| Portal copy | `app/src/components/portal/partner-deal-form.tsx` |
| Tests | `partner-commission`, `involvement-seat-redesign`, `commission-redesign-phase-a/b/c` (all passed) |
| Dash rule | Grep for em dash (U+2014), en dash (U+2013), minus sign (U+2212) in partner-facing `.ts`/`.tsx` and live academy DB text |

---

## Dimension 1: Cross-surface consistency

### Consistent (evidenced)

**Commission rate table** (Basic 5%/5%, Qualified 10%/8%, Strong 15%/12%, Closing 5%/10%, Delivery 8%, Override B2B 50% of opener rate, caps 25%/30%/35% focus ceiling):

- Config defaults: `app/src/lib/partner/config.ts` lines 28-51, 53-54, 66-67
- Terms builder: `app/src/lib/partner/terms.ts` lines 84-89, 103, 125
- Public page: `app/src/app/(public)/partners/page.tsx` lines 80-87, 214-225
- Academy Rules HTML: `app/prisma/seed/academy/m03-rules.ts` (bodyHtml commission list and cap section)
- Academy Motions: `app/prisma/seed/academy/m13-motions.ts` line 44 (`CFG` interpolation)
- Live site table at https://tenxpros.com/partners (fetched 3 Jul 2026): 5%, 10%, 8%, 15%, 12%, 5%, 10%, 8%, B2B only / 50% of opener rate, cap 25%/30%, footnote 15 seats B2C / 10 seats B2B, 35% focus
- Live terms section 7 at https://tenxpros.com/partners/terms: identical numbers and seat rules

**Seat-based Strong rule** (inclusive, paid-collected, B2C seats-only, B2B domain + seats, below-threshold B2B keeps classification but pays Qualified, missing seats → Qualified):

- Terms: `terms.ts` lines 81-86
- Public footnote: `partners/page.tsx` lines 228-231
- Academy Rules: `m03-rules.ts` bodyHtml "Qualified or strong" paragraph (thresholds from `CFG.strongSeatThresholdB2c` / `B2b`)
- Live terms bullet and live partners footnote quote the same 15 / 10 seat thresholds

**Retired rules absent from partner-facing content:**

- Grep across `app/src/**/*.ts(x)`, academy seeds, live DB lessons/questions: no `$5,000`, `$15,000`, `high-value threshold`, `strongOriginationUnlock`, or Panel-granted Strong as a current rule
- Dollar/unlock keys exist only in config schema defaults and admin "Retired" group (`constants.ts` lines 368-373), not in published copy

**Involvement boundaries (mostly consistent):**

- Basic Introduction: zero meetings, no follow-up, warm attestation (terms line 84; m03 bodyHtml; deal form intro fields)
- Qualified Origination: meetings + follow-up (terms line 85; m02/m03; deal form)
- Override B2B-only stated on public page, terms, m02, m03, m13

**Caps:** 25% B2C, 30% B2B, 35% Tier 3 focus ceiling stated consistently on terms, public page, m03 worked examples, live site

**No em/en/minus dashes** in partner-facing TypeScript/TSX or live academy DB lesson text (grep returned zero matches).

### Finding 1.1 — Closing meeting boundary wording differs

| Field | Value |
|-------|-------|
| **Severity** | Medium (comprehension / boundary) |
| **Location** | `app/src/app/(public)/partners/page.tsx` line 75; `app/prisma/seed/academy/m02-identity.ts` line 28 (bodyHtml) and plain lesson; `app/scripts/generate-partner-section.ts` line 172 |
| **Contradiction** | These surfaces say the company gives "at most one **short** online meeting" with no duration. The governing terms, Rules module, and deal-registration form say "at most one online meeting of **under one hour**." |
| **Evidence (terms)** | `app/src/lib/partner/terms.ts` line 87: "...at most one online meeting of under one hour..." |
| **Evidence (public)** | Live https://tenxpros.com/partners Closing card: "at most one short online meeting" |
| **Suggested fix** | Replace "short" with "under one hour" on the public page, m02 identity lesson/bodyHtml, and the generator template so all surfaces use the same bounded definition. |

### Finding 1.2 — Growth Bonus B2B-deal restriction not stated on partner-facing surfaces

| Field | Value |
|-------|-------|
| **Severity** | Low (comprehension; no pay mismatch because engine blocks it) |
| **Location** | `app/src/lib/partner/terms.ts` line 125; `app/prisma/seed/academy/m03-rules.ts` growth-bonus paragraphs; public partners page Tier 2 bullet (mentions "growth bonus" only) |
| **Contradiction** | Terms and Academy describe counting "genuinely new **B2B organisations**" but never state explicitly that the Growth Bonus **commission line is refused on B2C deals**. The engine does refuse it (`partner-admin.ts` lines 1110-1111: "paid on B2B deals only"). A partner reading only the terms could believe the 1% line can be added to any deal once org count qualifies. |
| **Suggested fix** | Add one sentence to terms section 12 and m03 Rules: "The growth bonus is recorded only on B2B closed deals; it does not apply to B2C charters." Mirror on the public page Tier 2 description if desired. |

### Finding 1.3 — Basic Introduction glossary in Rules module is weaker than the full rule

| Field | Value |
|-------|-------|
| **Severity** | Low (comprehension) |
| **Location** | `app/prisma/seed/academy/m03-rules.ts` bodyHtml glossary, "The paid functions" bullet (line 46) |
| **Problem** | Glossary calls Basic Introduction "a light referral, you introduce a relevant contact" without the warm-relationship attestation, zero-meetings boundary, or no-account-protection rule that terms and the full rate list state. |
| **Suggested fix** | Align the glossary bullet with the full Basic Introduction definition from `terms.ts` line 84 (warm attestation, step away, no protection). |

**No other cross-surface numeric or Strong-rule contradictions were found.**

---

## Dimension 2: Engine agreement

### Consistent (evidenced)

**Seat threshold (inclusive, paid-collected only, conservative fallback):**

```343:343:app/src/lib/partner/commission.ts
  const meetsSeats = seatCount != null && seatCount >= threshold;
```

```776:780:app/src/lib/partner/commission.ts
export function countableSeats(seats: SeatLike[]): number {
  return seats.reduce(
    (sum, s) => sum + (s.status === "PAID_COLLECTED" && !s.disregardForTargets ? s.count : 0),
```

Live path in `partner-admin.ts` aggregates `PAID_COLLECTED` seats then calls `classifyOrigination()` (lines 1024-1029). `seatCount == null` always yields Qualified (commission.ts lines 362-364, 402-404).

**B2C Strong by seats alone, no domain:**

```345:365:app/src/lib/partner/commission.ts
  if (dealKind === "B2C") {
    // Person-level: seats decide everything; the domain plays no role.
    if (meetsSeats) {
      return { function: "STRONG_ORIGINATION", rateBp: strongRate, ... };
```

**B2B Strong requires New/Dormant domain AND seats; below threshold pays Qualified rate but keeps STRONG_ORIGINATION classification:**

```386:405:app/src/lib/partner/commission.ts
  // New or Dormant B2B: a new-company origination.
  if (meetsSeats) { ... paidStrongRate: true ... }
  return { function: "STRONG_ORIGINATION", rateBp: qualifiedRate, isNewCompany: true, paidStrongRate: false, ... };
```

**Override B2B-only, credited to opener, share of open rate:**

```1061:1102:app/src/lib/actions/partner-admin.ts
  } else if (fn === "OVERRIDE") {
    if (dealKind !== "B2B") {
      return { ok: false, message: "The renewal override applies to B2B accounts only." };
    }
    ...
    linePartnerId = opener.partnerId; // credit the OPENER
    rateBp = overrideBp;
```

**Growth Bonus refused on B2C:**

```1110:1111:app/src/lib/actions/partner-admin.ts
    if (fn === "GROWTH_BONUS" && dealKind !== "B2B") {
      return { ok: false, message: "The growth bonus counts new B2B organisations and is paid on B2B deals only." };
```

**Cap clamp across functions and partners:**

`computeDealCommission()` (commission.ts lines 644-743) enforces absolute cap with committed external cents and weighted splits.

**Retired paths not on pay path:** `originationRateBp()` 40-seat unlock / panel unlock (commission.ts lines 43-61) is documented RETIRED; live `addCommissionLine` uses `classifyOrigination` first. Confirmed by `involvement-seat-redesign.test.ts` and 134 passing tests.

**No engine-vs-surface pay discrepancy found.**

---

## Dimension 3: Numbers from config

### Commission numbers rendered from config (consistent today)

| Surface | Config source | Evidence |
|---------|---------------|----------|
| Public partners page | `PROGRAM_CONFIG_DEFAULTS` via `formatBp()` | `partners/page.tsx` lines 5-6, 80-87 |
| Legal terms | `buildPartnerTermsSections(PROGRAM_CONFIG_DEFAULTS)` | `terms.ts` lines 28-29, 204 |
| Academy m03 / m13 rates | `PROGRAM_CONFIG_DEFAULTS` imported as `CFG` | `m03-rules.ts` lines 2-3, 73-75; `m13-motions.ts` lines 2-3, 44 |
| Reference generator | Same `CFG` + `terms.ts` | `generate-partner-section.ts` lines 19-21 |
| Engine / admin pay path | `resolvePartnerConfig()` → DB `ProgramConfig` | `config-server.ts`; live DB row matches defaults (see below) |

**Live DB `ProgramConfig` (queried 3 Jul 2026):** `basicIntroductionBp=500`, `qualifiedOriginationB2cBp=1000`, `qualifiedOriginationB2bBp=800`, `strongOriginationB2cBp=1500`, `strongOriginationB2bBp=1200`, `strongSeatThresholdB2c=15`, `strongSeatThresholdB2b=10`, `closingB2cBp=500`, `closingB2bBp=1000`, `deliveryPercentBp=800`, `capB2cBp=2500`, `capB2bBp=3000`, `tier3FocusHardCeilingBp=3500`, `overrideShareBp=5000`, `growthBonusBp=100`, `growthBonusOrgThreshold=3`, `originationWindowMonths=12`, `dealConfirmationWindowBusinessDays=5`, `paymentBusinessDays=30`. **All match `PROGRAM_CONFIG_DEFAULTS`.**

Academy exam questions for rules/identity/motions/operations: **zero** stems or options containing hardcoded commission percentages (DB query returned 0 rows).

### Finding 3.1 — Public terms/page do not read live DB config

| Field | Value |
|-------|-------|
| **Severity** | Low (architectural drift risk; **no drift today**) |
| **Location** | `app/src/lib/partner/terms.ts` line 204; `app/src/app/(public)/partners/page.tsx` line 5 |
| **Problem** | Marketing and legal summary import `PROGRAM_CONFIG_DEFAULTS` at build time, while the engine reads the DB `ProgramConfig` row. If an admin changes DB values without updating `config.ts` defaults (and redeploying), published pages would lie while the engine pays differently. |
| **Evidence** | DB and defaults are identical today; live site numbers match both. |
| **Suggested fix** | Either render public terms/page from `resolveGlobalConfig()` at request time, or enforce a deployment check that `PROGRAM_CONFIG_DEFAULTS` equals the DB row after any admin config change. |

### Finding 3.2 — `pilotDays` hardcoded as "90-day" on several partner touchpoints

| Field | Value |
|-------|-------|
| **Severity** | Low (drift risk; value is 90 in config today) |
| **Location** | `app/src/app/(public)/partners/apply/page.tsx` lines 9, 22; `apply/thank-you/page.tsx`; `app/src/lib/email/templates.ts` lines 415, 428, 564, 591; `app/src/app/(partner)/partner/page.tsx` line 116 ("90-day pilot scorecard") |
| **Problem** | `cfg.pilotDays` exists (default 90) and is used on the main partners page and terms (`terms.ts` line 54), but apply flow, emails, and dashboard heading use the literal "90-day". |
| **Suggested fix** | Interpolate `${CFG.pilotDays}` or `cfg.pilotDays` in apply pages, emails, and dashboard heading. |

### Finding 3.3 — Academy Rules plain-text/audio path hardcodes some windows

| Field | Value |
|-------|-------|
| **Severity** | Low (non-rate numbers; drift risk) |
| **Location** | `app/prisma/seed/academy/m03-rules.ts` plain `lesson` string and synced DB `body` / `audioText` |
| **Problem** | Rich HTML uses `CFG` for confirmation window, payment days, tier windows. Plain lesson/audio still says "ninety day", "thirty business days", "twelve months" as literals. If config changes, audio narration could drift from HTML and terms. |
| **Suggested fix** | Template plain lesson and `audioText` from the same `CFG` interpolations used in bodyHtml. |

**No hardcoded commission rate literals (5%, 10%, 15%, etc.) were found in partner-facing pages or academy exam content.**

---

## Dimension 4: Live state

### Consistent (evidenced)

| Check | Result |
|-------|--------|
| https://tenxpros.com/partners renders current rate table | Yes (matches config; fetched 3 Jul 2026) |
| https://tenxpros.com/partners/terms renders seat-based Strong rule | Yes; section 7 quotes 15/10 seats, no dollar thresholds |
| Local app on port 3003 `/partners` | Same percentages as production |
| Live DB academy modules rules/identity/motions/operations | No retired-rule phrases in lessons or exam questions (precise DB regex on dollar/high-value/unlock keys: 0 rows) |
| Live DB numbers in Rules `bodyHtml` | Contains "15 paid seats" and "10 paid seats" from seeded config interpolation |
| Live `ProgramConfig` vs published pages | No drift on any commission field checked |

**Note:** Partner Academy UI requires authentication; lesson content was verified via production database content (which is what partners see after seed/sync).

---

## Dimension 5: Comprehension and boundaries

### Clear and sound

- The five-part earning formula, Panel-as-source-of-truth, and clawback logic are repeated consistently and are logically coherent.
- Strong origination seat rule is stated clearly on terms and Rules HTML with the below-threshold B2B sentence partners need.
- Override opener credit, Active Status gate, and 12-month window are explained in terms and m03 with a worked 12% → 6% example from config.
- Cap stacking and scale-down examples in m03 are config-computed and match engine behavior.

### Additional comprehension notes (no separate severity unless listed above)

- **m02 identity** says Strong is "never decided on the Panel by opinion." Admin can force **EXISTING** classification on deal registration (stricter only, never grants Strong). Wording is directionally correct but could overstate "never on the Panel" for partners who see classification decisions in admin UI. **Suggestion:** clarify "Panel does not grade origination strength; it may only record Existing company status when facts require."
- **Tier 2 at 40 seats** appears in terms section 12. This is tier promotion (`tier2SeatThreshold`), not Strong origination. No current surface links 40 seats to Strong; risk is only if partners consult obsolete external docs (not in this codebase's published surfaces).

---

## Test and code evidence summary

```
pnpm test partner-commission involvement-seat-redesign commission-redesign
→ 5 files, 134 tests, all passed (3 Jul 2026)
```

---

## Conclusion by dimension

| Dimension | Verdict |
|-----------|---------|
| Cross-surface consistency | **Mostly consistent.** Three low/medium findings (closing duration wording, Growth Bonus deal-type clarity, Rules glossary). No numeric or Strong-rule conflicts. |
| Engine agreement | **Fully consistent.** Pay path matches stated rules. |
| Numbers from config | **Consistent today.** Architectural dual-source risk and hardcoded pilot/window literals noted; no current commission number drift. |
| Live state | **Consistent.** Published site and DB match config and engine. |
| Comprehension | **Generally clear.** Closing boundary and Growth Bonus deal-type are the main gaps a careful partner could stumble on. |

---

## Recommended fix priority

1. **Medium:** Unify Closing copy to "under one hour" everywhere (public page, m02, generator).
2. **Low:** State Growth Bonus is B2B-deals-only in terms and m03.
3. **Low:** Align m03 Basic Introduction glossary with full rule.
4. **Low:** Single-source public config rendering or sync guard; interpolate `pilotDays` and window literals in apply/email/audio paths.

---

*End of independent audit.*