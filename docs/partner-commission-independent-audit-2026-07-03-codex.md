# Independent Partner Commission Rules Audit

Date: 2026-07-03 UTC

Auditor stance: independent verification against source, running site, running containers, live database, and direct engine probes. I did not rely on existing reports or comments as truth.

## Scope Checked

- Legal terms source and live terms page.
- Public partners page source and live page.
- Reference document generator source and generated output.
- Partner Academy live database content, including lessons, exercises, and exam questions.
- Program config source defaults and live `ProgramConfig` row.
- Commission engine and server action pay path.
- Running site responses from `http://127.0.0.1:3003/partners` and `http://127.0.0.1:3003/partners/terms`.

## Executive Conclusion

The commission engine agrees with the intended model in the audited areas: Strong Origination is seat-based and inclusive, B2C Strong is seats-only, B2B Strong requires both new or dormant domain and seats, missing seats are conservative, Override and Growth Bonus are refused on B2C in the server action, and caps clamp stacked functions across partners.

The published material is not fully aligned. The main issues are publication and clarity issues, not pay-path bugs:

- The live `/partners` page is stale or incomplete compared with the current workspace source and omits important boundaries: same-scope renewal, branch or unit as new origination, and no-paid-seats fallback.
- The live terms page and live Academy content say "same scope" for Renewal Override but do not define the branch, department, unit, country, affiliate, or parent boundary.
- Public-page copy is too abbreviated for several required boundaries: closing says "short online meeting" rather than "under one hour", Growth Bonus is mentioned without "B2B only", and Basic Introduction omits the explicit attestation requirement.
- Partner-facing content currently uses compile-time defaults or stored literal rendered text, not the live DB config row. The numbers match today, but the architecture can drift if config changes.

No partner-facing em dash, en dash, or minus-sign violations were found in the checked live pages, Academy dump, current source areas, or generated reference document.

## Evidence Summary

Live pages fetched:

```text
/partners: HTTP/1.1 200 OK, x-nextjs-cache: HIT, Content-Length: 49712, Date: Fri, 03 Jul 2026 21:45:12 GMT
/partners/terms: HTTP/1.1 200 OK, x-nextjs-cache: HIT, Content-Length: 69826, Date: Fri, 03 Jul 2026 21:45:12 GMT
```

Live config row:

```text
config|500|1000|800|1500|1200|800|500|1000|2500|3000|3500|5000|12|15|10|500000|1500000|40
```

Field order: Basic Introduction, Qualified B2C, Qualified B2B, Strong B2C, Strong B2B, Delivery, Closing B2C, Closing B2B, cap B2C, cap B2B, Tier 3 focus ceiling, override share, origination window, B2C Strong seats, B2B Strong seats, retired B2C dollar threshold, retired B2B dollar threshold, retired 40-seat unlock.

Academy DB counts:

```text
counts|17|17|252|84|168
```

Field order: modules, lessons, questions, exercise questions, exam questions.

Academy search over live lessons, exercises, and exam:

```text
high_value|0|
old_5k_15k_threshold|0|
forty_near_strong_seat_unlock|0|
panel_grants_strong|0|
em_en_minus|0|
new_branch_boundary|0|
no_paid_seats_fallback|1|lesson:rules
```

Dash checks:

```text
live_partners_dash_count=0
live_terms_dash_count=0
source_partner_dash_count=0
generated_dash_count=0
```

Reference document generator:

```text
pnpm exec tsx scripts/generate-partner-section.ts > /tmp/tenxpros-partner-section-generated.md
generated_bytes=428986
generated_old_rule_hits=1
```

The single generated "old rule" hit was a false positive: "Tier 2 is earned by selling and collecting at least 40 paid, non-refunded seats..." This is the tier threshold, not the retired 40-seat Strong unlock.

Tests:

```text
pnpm exec vitest run tests/partner-commission.test.ts tests/commission-redesign-phase-b.test.ts tests/commission-redesign-phase-c.test.ts tests/involvement-seat-redesign.test.ts
Test Files 4 passed
Tests 127 passed
```

## Findings

### Finding 1: Live public partners page omits material Strong and Renewal Override boundaries

Severity: Medium

Locations:

- Live URL: `http://127.0.0.1:3003/partners`
- Running container source: `tenxpros-app:src/app/(public)/partners/page.tsx:77`
- Running container source: `tenxpros-app:src/app/(public)/partners/page.tsx:228-233`
- Current workspace source contains newer wording at `app/src/app/(public)/partners/page.tsx:77` and `app/src/app/(public)/partners/page.tsx:228-235`, but the running page does not render it.

Live public-page quotes:

```text
Renewal Override B2B only: open an account and keep supporting it, and a renewal within the window pays you a share of the rate you opened it at, on top of that renewal's own commission.
```

```text
Below the threshold, a new-company B2B deal keeps its new-company standing but is paid the Qualified rate. The Renewal Override is B2B only, a share of the rate the account was opened at, credited to the partner who opened it while they keep supporting it.
```

Problem:

The page states the correct rates and the basic B2B-only Override concept, but it does not state that the renewal must be the same scope of the same account, does not state that a new branch or unit is a new registration and full new origination instead, and does not state that no recorded paid seats means Qualified. A partner reading only this public page could reasonably think any renewal inside the window trails the opener.

Engine comparison:

- `app/src/lib/partner/commission.ts:328-330` states the threshold comparison is inclusive and null seats are Qualified.
- `app/src/lib/partner/commission.ts:396-405` keeps a new or dormant B2B deal below threshold as new-company origination but pays the Qualified rate.
- `app/src/lib/actions/partner-admin.ts:1061-1068` refuses Override on B2C.

Suggested fix:

Deploy, rebuild, and revalidate the current workspace public-page copy, or equivalent copy, so the live page says:

- no recorded paid seats yet is always Qualified;
- Renewal Override follows only a same-scope renewal of the same account;
- same scope means the same organisation and unit under the same domain;
- a new branch or unit is a new registration and full new origination.

### Finding 2: Live terms and live Academy say "same scope" but do not define the branch and unit boundary for Renewal Override

Severity: Medium

Locations:

- Live URL: `http://127.0.0.1:3003/partners/terms`
- Running container source: `tenxpros-app:src/lib/partner/terms.ts:103`
- Live Academy DB lessons: `identity`, `rules`, `motion`
- Live Academy DB search: `new_branch_boundary|0|`

Live terms quote:

```text
On a B2B account (the override is B2B only, and the engine enforces it), a same-scope renewal within the first 12 months also pays an Origination Override of 50% of the rate the account was opened at.
```

Live Academy quotes:

```text
on a B2B account you originated and keep actively supporting, a same scope renewal within the origination window also pays you an origination override
```

```text
For the first 12 months after that account first closes, a same scope renewal on it also pays an origination override worth 50% of the rate the account was originally opened at
```

Problem:

The live terms and Academy use "same scope" but the live content does not define the boundary. The live Academy has zero hits for "new branch", "new branch or unit", "different branch", or "different unit". Module 3 does teach exact registration scope in general, but it does not explicitly connect that scope rule to Renewal Override. This leaves an avoidable dispute path: a partner could argue that a branch, department, unit, country, affiliate, or parent renewal is still a renewal of the opened account.

Current workspace note:

The current workspace `app/src/lib/partner/terms.ts:103` contains the needed definition, but the running container and live page still render the older text.

Suggested fix:

Deploy the updated terms source and reseed or update the Academy DB modules that mention Override. The same sentence should appear in terms, Academy Module 2, Academy Module 3, Academy Module 13, and any generated reference document:

```text
Same scope means the same organisation and the same unit under the same domain originally opened and confirmed. A different branch, department, unit, country, affiliate, parent, or related structure is a new registration and, when originated, a full new origination, not an override.
```

### Finding 3: Public partners page abbreviates several required involvement and bonus boundaries

Severity: Low

Locations:

- Running container source: `tenxpros-app:src/app/(public)/partners/page.tsx:73-77`
- Running container source: `tenxpros-app:src/app/(public)/partners/page.tsx:56`
- Live URL: `http://127.0.0.1:3003/partners`

Public-page quotes:

```text
Basic Introduction Introduce and explain us to someone you genuinely know, then step away: zero meetings and no follow-up.
```

```text
Closing Drive the deal to a signed, started contract yourself. Our team gives at most one short online meeting; you carry the rest to signature and start.
```

```text
Priority on company leads, and a growth bonus
```

Problem:

These statements are not false, but they are less precise than the intended model and the terms:

- Basic Introduction requires a warm-relationship attestation with a note. The public page says "genuinely know" but omits attestation.
- Closing allows at most one online meeting under one hour from the company side. The public page says only "short online meeting".
- Growth Bonus is B2B only. The public page mentions a growth bonus under Tier 2 without the B2B-only qualifier.

Terms source comparison:

- `tenxpros-app:src/lib/partner/terms.ts:84` includes "attested, with a note naming the person and the relationship".
- `tenxpros-app:src/lib/partner/terms.ts:87` includes "at most one online meeting of under one hour".
- `tenxpros-app:src/lib/partner/terms.ts:125` states the Growth Bonus applies to "distinct, genuinely new B2B organisations".

Suggested fix:

Tighten the public-page summary copy:

- "with warm-relationship attestation" for Basic Introduction;
- "at most one online meeting under one hour" for Closing;
- "B2B growth bonus" or "growth bonus on new B2B organisations" in the Tier 2 card.

### Finding 4: Partner-facing content is not rendered from the live DB config row

Severity: Medium

Locations:

- `app/src/app/(public)/partners/page.tsx:5` imports `PROGRAM_CONFIG_DEFAULTS as CFG`.
- `app/src/lib/partner/terms.ts:15` imports `PROGRAM_CONFIG_DEFAULTS`.
- `app/src/lib/partner/terms.ts:204` exports `PARTNER_TERMS_SECTIONS` built from `PROGRAM_CONFIG_DEFAULTS`.
- `app/src/app/(public)/partners/terms/page.tsx:3` imports the static sections.
- `app/src/components/marketing/partner-terms-modal.tsx:6` imports the static sections.
- `app/scripts/generate-partner-section.ts:15-21` imports seed modules, `PROGRAM_CONFIG_DEFAULTS`, and static terms; the file header says it builds "NOT from the database".
- Live Academy DB lessons store rendered literal text such as "15 paid seats", "10 paid seats", "25%", "30%", "35%", and "12 months".

Problem:

The live numbers match the live config row today, but the partner-facing pages and generated reference document are rendered from compile-time defaults and source seed text, while the engine pay path resolves config from the DB. The Academy DB stores rendered numbers as content. If an authorized admin changes `ProgramConfig`, the engine can pay different values before the public page, terms, modal, generated document, or Academy content changes.

This is a single-source-of-truth violation in practice. It is not a current numeric mismatch, but it is a real drift risk in the audited system.

Live config evidence:

```text
config|500|1000|800|1500|1200|800|500|1000|2500|3000|3500|5000|12|15|10|500000|1500000|40
```

Engine source comparison:

- `app/src/lib/actions/partner-admin.ts:927-928` enters the server pay path.
- `app/src/lib/actions/partner-admin.ts:1027` calls `classifyOrigination({ ..., cfg })` after resolving config.
- `app/src/lib/partner/config.ts:9-13` says the DB row and partner overrides are how engine and rules read commercial numbers.

Suggested fix:

Make partner-facing publication read the same resolved config as the pay path, or add a strict publication sync gate:

- Render `/partners` and `/partners/terms` as server components using a DB-backed global config resolver.
- Build terms sections from the resolved config at request time, or pass resolved config into a server-rendered dialog instead of importing static client sections.
- Make the generator load an exported live config snapshot or query the DB for the singleton config.
- Add an Academy content verification or refresh task that compares stored lesson and question text against the live config row after config changes.

### Finding 5: Non-partner-facing schema comment still describes retired dollar thresholds as decisive

Severity: Low

Location:

- `app/prisma/schema.prisma:2022-2029`

Quote:

```text
// Commission redesign: single delivery rate, and the high value thresholds that
// (with the domain newness state) decide the Strong vs Qualified origination rate.
...
// Involvement redesign: Strong is decided by SEAT COUNT (paid-collected seats),
// not dollars.
```

Problem:

The first comment says high value thresholds decide Strong versus Qualified. The immediately following comment correctly says dollars are retired and seats decide. This is not partner-facing and does not affect the engine, but it contradicts the current model and can mislead maintainers.

Suggested fix:

Rewrite the older comment to match `app/src/lib/partner/config.ts:39-42`, for example:

```text
// Commission redesign: single delivery rate. The dollar thresholds below are retained for historical compatibility only; current Strong classification uses paid-collected seats.
```

## Dimension Results

### 1. Cross-Surface Consistency

Issues found:

- Finding 1: live `/partners` omits material Strong and Renewal Override boundaries.
- Finding 2: live terms and live Academy do not define same-scope branch or unit boundary for Override.
- Finding 3: public partners page abbreviates Basic Introduction attestation, Closing under-one-hour, and Growth Bonus B2B-only boundaries.
- Finding 4: publication surfaces use defaults or stored literal content rather than live config.

Consistent items verified:

- Rates shown on live pages match live config: Basic 5%, Qualified 10% B2C and 8% B2B, Strong 15% B2C and 12% B2B, Closing 5% B2C and 10% B2B, Delivery 8%, Override 50% of opener rate, caps 25% and 30%, focus ceiling 35%.
- Live terms state Basic Introduction zero meetings and no follow-up with attestation.
- Live terms state Origination requires meetings and follow-up.
- Live terms state Closing requires at most one online meeting under one hour.
- Live terms state Growth Bonus is for distinct new B2B organisations and counted by domain.
- Live Academy Module 3 states the seat-based Strong rule, B2C seats-only rule, B2B domain plus seats rule, missing paid seats fallback, and caps.
- No checked partner-facing surface presents the retired dollar high-value rule, old 40-seat Strong unlock, or Panel classification of Strong as current.

### 2. Engine Agreement

No pay-path discrepancy found.

Relevant source:

- `app/src/lib/partner/commission.ts:332-405` implements objective origination classification.
- `app/src/lib/partner/commission.ts:343` uses `seatCount != null && seatCount >= threshold`, so the threshold is inclusive.
- `app/src/lib/actions/partner-admin.ts:1019-1027` aggregates only `PAID_COLLECTED` seats and passes null when no paid seats exist.
- `app/src/lib/actions/partner-admin.ts:1061-1068` refuses Override on B2C.
- `app/src/lib/actions/partner-admin.ts:1108-1112` refuses Growth Bonus on B2C.
- `app/src/lib/partner/commission.ts:630-743` clamps total commission across all functions and partners to the applicable cap.
- `app/src/lib/partner/commission.ts:775-780` counts only paid-collected, non-disregarded seats where used by the pure helper.

Direct classification probe:

```text
B2C 15 seats no domain -> STRONG_ORIGINATION, 1500 bp
B2C 14 seats no domain -> QUALIFIED_ORIGINATION, 1000 bp
B2C null seats no domain -> QUALIFIED_ORIGINATION, 1000 bp
B2B NEW domain 10 seats -> STRONG_ORIGINATION, 1200 bp
B2B NEW domain 9 seats -> STRONG_ORIGINATION recorded, 800 bp paid, isNewCompany true, paidStrongRate false
B2B NEW domain null seats -> STRONG_ORIGINATION recorded, 800 bp paid, isNewCompany true, paidStrongRate false
B2B no domain 20 seats -> QUALIFIED_ORIGINATION, 800 bp
B2B EXISTING domain 20 seats -> QUALIFIED_ORIGINATION, 800 bp
```

Direct cap probe:

```text
B2B net 1,000,000 cents, raw 370,000, cap 300,000, final 300,000, capped true, entries sum 300,000
B2C net 1,000,000 cents, raw 280,000, cap 250,000, final 250,000, capped true, entries sum 250,000
```

Targeted tests passed:

```text
4 files passed, 127 tests passed
```

### 3. Numbers From Config

Current numbers match:

- Source defaults in `app/src/lib/partner/config.ts:26-106`.
- Prisma defaults in `app/prisma/schema.prisma:2010-2048`.
- Live DB `ProgramConfig` singleton row.
- Live `/partners` and `/partners/terms` rendered output.

Issue found:

- Finding 4: the partner-facing publication path is not truly live-config-backed and can drift.

No current numeric mismatch found.

### 4. Live State

Issues found:

- Finding 1: live `/partners` is missing text that exists in the current workspace source.
- Finding 2: live `/partners/terms` is missing the branch or unit same-scope definition that exists in the current workspace source.
- Finding 2: live Academy DB has zero hits for the branch or unit boundary.
- Finding 4: live Academy content stores literal rendered numbers and therefore is not live-config-backed.

Consistent live-state evidence:

- Both public pages returned 200.
- Live pages render rates and caps matching the live DB row.
- Live Academy has 17 modules, 17 lessons, 84 exercises, and 168 exam questions.
- Live Academy search found zero hits for retired high-value dollar rules, old $5,000 or $15,000 thresholds, the old 40-seat Strong unlock, or Panel-granted Strong.
- Live Academy search found no em dash, en dash, or minus-sign violations.

### 5. Comprehension and Boundaries

Issues found:

- "Same scope" is not self-defining. Without the branch, department, unit, country, affiliate, and parent boundary, a partner could reasonably misunderstand Override scope.
- The public page's "a renewal within the window" is broader than the intended "same-scope renewal of that same account."
- "One short online meeting" is less exact than "one online meeting under one hour."
- "Growth bonus" without "B2B only" on the public page can mislead a B2C-focused partner.
- Basic Introduction on the public page lacks the explicit attestation requirement.

Boundaries that are clear in the engine and terms:

- Strong Origination is objective and seat-based, not opinion-based.
- B2C Strong is seats-only.
- B2B Strong requires domain newness plus seats.
- New-company B2B below threshold keeps new-company classification but pays Qualified.
- Missing paid seats do not grant Strong.
- Delivery is a single 8% rate.
- Per-deal caps are absolute except the Tier 3 focus ceiling.
- Growth Bonus is inside the cap.

## Recommended Fix Order

1. Deploy and revalidate the existing workspace copy changes for `/partners` and `/partners/terms`.
2. Update or reseed live Academy DB modules that mention Renewal Override so they define same scope and branch or unit treatment.
3. Tighten public-page summary copy for Basic Introduction attestation, Closing under one hour, and B2B-only Growth Bonus.
4. Decide whether partner-facing pages must read live DB config directly. If yes, change the rendering path. If no, add a config publication gate that fails whenever live config and rendered partner-facing text diverge.
5. Clean up the stale schema comment about high-value thresholds.
