# Independent audit: partner commission rules

Date: 2026-07-03
Auditor posture: independent review, treating the intended model in the request as authoritative and requiring evidence from code, live rendered pages, live database content, tests, and generated/reference artifacts.

## Executive verdict

The payment engine and the live `ProgramConfig` row are aligned with the intended commission model today. I found no evidence that the current engine grants Strong Origination by opinion, dollar value, a 40-seat rule, or Panel/operator classification. The engine uses paid-collected seat count, B2B domain newness, B2B-only override enforcement, B2B-only Growth Bonus enforcement, and deal-level caps.

The main discrepancies are in partner-facing explanation surfaces and source-of-truth boundaries:

1. The deployed public pages, deployed reference generator, and live Academy database do not fully teach the Renewal Override boundary: same account/same organisation/same unit/same domain only, while new branch/unit/country/affiliate/parent should be a new registration and full origination.
2. The public partner page and deployed generator lag the current working-tree wording for "no recorded paid seats yet is always Qualified."
3. Partner-facing source pages and the reference generator read `PROGRAM_CONFIG_DEFAULTS`, while the commission engine reads the live DB-backed `ProgramConfig`. The row matches defaults today, so this is not a current numeric mismatch, but it is a real drift path after any admin config edit.
4. Some on-disk generated/reference artifacts are stale and still contain superseded Strong Origination wording based on "confirmed strategic value."

## Intended model checked

The expected commercial model was:

| Rule area | Intended rule |
| --- | --- |
| Basic Introduction | 5% on B2C and B2B; warm relationship attestation; zero meetings; no follow-up. |
| Qualified Origination | 10% B2C, 8% B2B; meetings and follow-up. |
| Strong Origination B2C | 15%; seats alone decide; 15 paid-collected seats or more; no domain/newness test. |
| Strong Origination B2B | 12%; genuinely New/Dormant company domain and 10 paid-collected seats or more. |
| B2B below threshold | New/Dormant status may survive, but payout is the Qualified rate. |
| No paid seats recorded | Always Qualified, never Strong. |
| Existing company/new branch or unit | Existing domain gives Qualified Origination on the new unit unless it is a truly new/dormant domain meeting threshold. |
| Closing | 5% B2C, 10% B2B; partner drives close; company gives at most one online meeting under one hour. |
| Delivery | 8% single company-set rate. |
| Caps | 25% B2C, 30% B2B, Tier 3 focus hard ceiling 35%, with proportional scaling under cap. |
| Renewal Override | B2B only; 50% of opener's original origination rate; credited to the opener; only same account/same organisation/same unit/same domain; new branch/unit/country/affiliate/parent is new registration and full origination. |
| Growth Bonus | B2B only; 1% to Tier 2/3 after 3+ distinct new B2B org domains in rolling 12 months; counted by domain; inside cap. |

## Sources inspected

Live:

- `https://tenxpros.com/partners`
- `https://tenxpros.com/partners/terms`
- Local running app at `http://127.0.0.1:3003`
- Docker service `tenxpros-app`, created `2026-07-03T20:45:56Z`
- Live PostgreSQL DB in `tenxpros-db`

Code and artifacts:

- `app/src/lib/partner/config.ts`
- `app/src/lib/partner/config-server.ts`
- `app/src/lib/partner/commission.ts`
- `app/src/lib/actions/partner-admin.ts`
- `app/src/app/(public)/partners/page.tsx`
- `app/src/lib/partner/terms.ts`
- `app/scripts/generate-partner-section.ts`
- Academy seed modules under `app/prisma/seed/academy/`
- Generated/reference docs under `docs/academy/`
- Focused test files under `app/tests/`

## Confirmed aligned areas

### Live config row and defaults

The live `ProgramConfig` singleton matched the intended values at audit time:

| Field | Live value |
| --- | --- |
| `basicIntroductionBp` | 500 |
| `qualifiedOriginationB2cBp` | 1000 |
| `qualifiedOriginationB2bBp` | 800 |
| `strongOriginationB2cBp` | 1500 |
| `strongOriginationB2bBp` | 1200 |
| `closingB2cBp` | 500 |
| `closingB2bBp` | 1000 |
| `deliveryPercentBp` | 800 |
| `strongSeatThresholdB2c` | 15 |
| `strongSeatThresholdB2b` | 10 |
| `capB2cBp` | 2500 |
| `capB2bBp` | 3000 |
| `tier3FocusHardCeilingBp` | 3500 |
| `overrideShareBp` | 5000 |
| `growthBonusBp` | 100 |
| `growthBonusOrgThreshold` | 3 |
| `originationWindowMonths` | 12 |
| `paymentBusinessDays` | 30 |
| `pilotDays` | 90 |
| `clawbackDays` | 120 |

Code evidence:

- Defaults are in `app/src/lib/partner/config.ts:26`.
- DB-backed config resolution is in `app/src/lib/partner/config-server.ts:17` and `app/src/lib/partner/config-server.ts:28`.

### Engine classification

The core commission engine matches the intended objective rules:

- `app/src/lib/partner/commission.ts:308` documents Strong as paid-collected seat count only, never dollars and never judgment.
- `app/src/lib/partner/commission.ts:345` makes B2C seats-only.
- `app/src/lib/partner/commission.ts:368` makes B2B with no domain Qualified only.
- `app/src/lib/partner/commission.ts:377` makes existing B2B company Qualified only.
- `app/src/lib/partner/commission.ts:387` grants B2B Strong only for New/Dormant plus threshold seats.
- `app/src/lib/partner/commission.ts:396` preserves below-threshold new-company classification but pays the Qualified rate.
- `app/src/lib/actions/partner-admin.ts:1019` aggregates only `PAID_COLLECTED` seats for the Strong test.

### Override, Growth Bonus, and caps

- Renewal Override is enforced as B2B-only in `app/src/lib/actions/partner-admin.ts:1061`.
- Renewal Override requires a registered account and credits the opener in `app/src/lib/actions/partner-admin.ts:1069` and `app/src/lib/actions/partner-admin.ts:1100`.
- Growth Bonus is enforced as B2B-only in `app/src/lib/actions/partner-admin.ts:1108`.
- Commission recomputation includes deal-level cap clamping and committed external paid lines in `app/src/lib/actions/partner-admin.ts:1176`.

### Academy live DB is clean of retired Strong tests

The live DB scan found zero lesson/question hits for old Strong language such as:

- "confirmed strategic value"
- "high value" or "high-value"
- "40-seat" or "40 seats"
- "Panel classification"

Module 2, Module 3, and Module 13 live Academy lessons describe current rates and the seat/domain model. The live Academy does not appear to be teaching the retired 40-seat/dollar/opinion Strong model.

### Live pages are clean of retired Strong tests

Both `https://tenxpros.com/partners` and `https://tenxpros.com/partners/terms` show the current percentages and current seat thresholds. The live pages did not contain the retired phrases above, and did not contain em dash, en dash, or mathematical minus sign characters in the rendered partner pages checked.

### Focused tests passed

Command run in `app/`:

```bash
pnpm test tests/involvement-seat-redesign.test.ts tests/commission-redesign-phase-b.test.ts tests/commission-redesign-phase-c.test.ts tests/partner-commission.test.ts
```

Result: 4 test files passed, 127 tests passed.

## Findings

### F1. Deployed and live training surfaces do not fully teach the Renewal Override boundary

Severity: High for partner comprehension and payment expectations. Low for payment-engine correctness, because the engine has B2B/account/opener enforcement.

Expected:

- Renewal Override is B2B only.
- It applies only to a same-scope renewal of the same account: same organisation, same unit, same domain.
- A different branch, department, unit, country, affiliate, parent, or related structure is not a renewal override. It is a new registration and, when originated by a partner, a full new origination.

Evidence:

- Live `/partners` says the override applies to "a renewal within the window" and does not define same scope or new branch/unit treatment.
- Live `/partners/terms` says "same-scope renewal" but does not define same scope or mention branch/unit/country/affiliate/parent exclusions.
- The running container source confirms this deployed wording:
  - `/app/src/app/(public)/partners/page.tsx:77`
  - `/app/src/app/(public)/partners/page.tsx:227`
  - `/app/src/lib/partner/terms.ts:103`
  - `/app/scripts/generate-partner-section.ts:174`
  - `/app/scripts/generate-partner-section.ts:224`
- The live Academy DB has zero hits for "new branch", "new registration", or "same organisation" in lesson/question text.
- The current local working tree appears to contain the intended fix:
  - `app/src/app/(public)/partners/page.tsx:77`
  - `app/src/app/(public)/partners/page.tsx:232`
  - `app/src/lib/partner/terms.ts:103`
  - `app/scripts/generate-partner-section.ts:174`
  - `app/scripts/generate-partner-section.ts:224`

Impact:

- A partner reading only the live site or live Academy can reasonably misunderstand a new branch/unit/country/affiliate/parent opportunity as a renewal override instead of a fresh registration/full origination.
- This affects expectation-setting and partner behavior even if the payment engine later applies the right rule.

Recommended correction:

- Deploy the current working-tree wording to the public page, terms page/modal, and generator.
- Reseed or migrate the live Academy content so the same boundary appears in lesson text and exam/exercise questions.
- Add a regression test that scans rendered public copy and Academy seed text for the branch/unit/new-registration boundary.

### F2. Public page and deployed generator lag the intended "no paid seats means Qualified" rule

Severity: Medium for partner comprehension. Low for payment-engine correctness.

Expected:

- No recorded paid-collected seat count means Qualified, never Strong.

Evidence:

- Engine: `app/src/lib/partner/commission.ts:329` and `app/src/lib/partner/commission.ts:402` implement conservative handling for missing seats.
- Server action: `app/src/lib/actions/partner-admin.ts:1019` says no paid seats yet means Qualified, never Strong.
- Live `/partners` explains below-threshold B2B but does not include the "no recorded paid seats yet is always Qualified" sentence.
- The deployed generator in the running container lacks that sentence at `/app/scripts/generate-partner-section.ts:224`.
- The current local working tree appears to include the missing public/generator sentence at `app/src/app/(public)/partners/page.tsx:231` and `app/scripts/generate-partner-section.ts:224`.

Impact:

- Partners may assume a pending or missing seat count can still produce Strong after subjective review. The engine will not do that.

Recommended correction:

- Deploy the current working-tree public page and generator.
- Add an automated content check for "no recorded paid seats" or equivalent wording in public and generated reference output.

### F3. Public summary wording is less exact than terms/Academy for some involvement boundaries

Severity: Low to Medium, depending on how much the public page is treated as standalone guidance.

Expected:

- Basic Introduction requires a warm relationship attestation, zero meetings, and no follow-up.
- Closing allows at most one company online meeting under one hour.
- Growth Bonus is B2B-only, domain-counted, and inside the cap.

Evidence:

- Current local terms are exact:
  - Basic attestation: `app/src/lib/partner/terms.ts:84`
  - Closing under one hour: `app/src/lib/partner/terms.ts:87`
  - Growth Bonus B2B/domain/cap rule: `app/src/lib/partner/terms.ts:125`
- Live `/partners` says "someone you genuinely know" for Basic Introduction but not "attested."
- Live `/partners` says the company gives "one short online meeting" for Closing, but does not state "under one hour."
- Live `/partners` mentions "growth bonus" in the tier section, but the public page summary does not explain B2B-only/domain-counted/inside-cap treatment. The live terms page does.

Impact:

- The public page is directionally correct but not exact enough to serve as a complete standalone rule summary.

Recommended correction:

- Update the public page and generated public-page section with the exact terms language for these short boundary phrases.
- Keep the full legal/terms language in the terms page, but make the summary non-ambiguous.

### F4. Partner-facing source/generator uses defaults, while the engine uses DB-backed config

Severity: Medium. No active numeric mismatch today, but the source-of-truth split is real.

Expected:

- The request names the live config row as the source to compare against. If admins can change config in the DB, public rules and generated references should not silently keep old default numbers while the engine pays DB numbers.

Evidence:

- Engine and admin server actions use DB-backed config:
  - `app/src/lib/partner/config-server.ts:17`
  - `app/src/lib/partner/config-server.ts:28`
  - `app/src/lib/actions/partner-admin.ts:36`
  - `app/src/lib/actions/partner-admin.ts:349`
  - `app/src/lib/actions/partner-admin.ts:720`
  - `app/src/lib/actions/partner-admin.ts:884`
  - `app/src/lib/actions/partner-admin.ts:1180`
- Admin config edits are supported:
  - `app/src/lib/actions/partner-admin.ts:676`
  - `app/src/lib/actions/partner-admin.ts:694`
- Public/generator surfaces use defaults:
  - `app/src/app/(public)/partners/page.tsx:5`
  - `app/src/lib/partner/terms.ts:15`
  - `app/src/lib/partner/terms.ts:204`
  - `app/scripts/generate-partner-section.ts:19`

Impact:

- Today, there is no numeric drift because the live DB row equals defaults.
- After any admin `ProgramConfig` edit, the engine can pay one set of rates while public pages, terms modal, and generated reference docs continue to show another set.

Recommended correction:

- Either render public/terms pages from `resolveGlobalConfig()` with an explicit dynamic/revalidation strategy, or generate/publish reference docs from the DB row used by the engine.
- Add a test or admin warning that fails if a non-default live config exists while static public/generator outputs still use `PROGRAM_CONFIG_DEFAULTS`.

### F5. On-disk generated/reference artifacts are stale and include retired Strong Origination wording

Severity: Medium if these docs are distributed to partners; Low if they are internal stale exports only.

Evidence:

- `docs/academy/partner-academy-full-export.md:478` describes Strong Origination as based on a "higher quality opportunity" and "confirmed strategic value."
- `docs/academy/partner-academy-full-export.md:567` repeats that retired wording in plain prose.
- `docs/academy/partner-academy-full-export.md:601` and `docs/academy/partner-academy-full-export.md:605` make the retired wording the correct exercise answer.
- `docs/academy/partner-section-complete.md:524`, `docs/academy/partner-section-complete.md:917`, `docs/academy/partner-section-complete.md:1007`, and `docs/academy/partner-section-complete.md:5259` contain older same-scope Renewal Override language without the branch/unit/new-registration boundary.

Impact:

- If either file or its rendered PDF is partner-visible, it directly conflicts with the current seat/domain Strong model and/or the required override boundary.
- This is not reflected in the live Academy DB scan, which was clean of the retired Strong phrases.

Recommended correction:

- Regenerate the reference docs from the corrected source after deployment.
- Remove or archive stale generated files that are no longer authoritative.
- Add generated-doc drift checks for retired Strong phrases and the Renewal Override branch/unit boundary.

## Dimension-by-dimension conclusion

| Dimension | Audit result |
| --- | --- |
| Numeric rates | Aligned in engine, live DB row, live public pages, live terms, and live Academy. |
| Strong Origination | Engine and live DB/Academy/public terms use seat/domain rules. Stale generated docs still contain retired "strategic value" language. |
| No paid seats | Engine is correct. Live public page/deployed generator omit the explicit rule; local source appears fixed. |
| B2C Strong | Engine correctly uses seats only; live public/terms explain this. |
| B2B Strong | Engine correctly requires New/Dormant domain plus 10 paid-collected seats; live public/terms explain this. |
| Existing B2B/new unit | Engine pays Qualified on existing domain. Terms/source explain. Live public summary is less complete. |
| Basic Introduction | Terms/Academy include warm attestation; live public page says genuine relationship but omits attestation. |
| Closing | Terms/Academy include under-one-hour limit; live public page says "short" only. |
| Delivery | Engine and pages agree on single 8% rate. Retired delivery band remains only as retired config metadata. |
| Caps | Engine, live pages, terms, and tests agree on 25% B2C, 30% B2B, Tier 3 focus ceiling 35%, proportional scaling. |
| Renewal Override | Engine enforces B2B/account/opener/window. Live public/terms/Academy lack the full same-scope/new-branch boundary. |
| Growth Bonus | Engine and terms enforce B2B/domain/inside cap. Live public page only mentions growth bonus at tier-summary level. |
| Config source | Engine reads DB-backed config; public/generator read defaults. No current mismatch, but future drift path. |
| Unicode dash check | No em dash, en dash, or mathematical minus sign found in the targeted live partner pages or current partner-facing source paths checked. |

## Recommended priority order

1. Deploy the current working-tree public page, terms, generator, and Academy seed updates that define Renewal Override same scope and new branch/unit as new registration/full origination.
2. Reseed or migrate the live Academy DB so lesson and question content includes that boundary.
3. Regenerate partner reference docs and remove/archive stale exports containing retired Strong wording.
4. Decide whether public pages and generators must read live DB config. If yes, replace default imports with DB-backed global config or a build/publish pipeline that snapshots the live config row.
5. Tighten public summary wording for Basic attestation, Closing under one hour, no recorded seats, and Growth Bonus B2B/domain/inside-cap treatment.

## Audit limitation

This audit did not change application code. It added this report only. The local working tree already contained uncommitted edits to several partner-facing source files; I treated current local source, deployed container source, live public pages, and live DB content as separate evidence streams.
