# Phase 1: Involvement-based functions and the seat-count Strong test. Technical design.

This is a Phase 1 design document only. Nothing here is built, changed, committed, or deployed. It specifies, against the real code, exactly what Phase 2 will change to implement the confirmed model: functions distinguished by the partner's level of involvement, the Strong test moved from dollars to seat counts, per-function evidence at registration, the already-ours defenses, B2B-only enforcement of the Override and the Growth Bonus in the engine, the richer admin review, the stated decision SLA, and the full notification set. It ends with a hard stop for approval.

Sequencing note, stated honestly: the working tree currently holds a verified, undeployed feature set (the Academy clarity layer, the engagement telemetry, and the audio voice fix) awaiting your deploy approval. Phase 2 of THIS design builds on top of that tree. Either deploy the pending set first, or approve building this on top and deploy everything together; both are safe, but the order should be an explicit decision, not an accident.

The confirmed model in one paragraph. Involvement is the dividing line. A Basic Introduction is an active, genuine introduction to a warm contact after which the partner steps fully away: zero meetings, no follow-up, and a genuinely valuable introduction is still confirmed and rewarded, which the partner-facing copy must say plainly. An Origination means the partner attends meetings and takes on the follow-up. A Closing means the partner drives the deal to a signed, started contract with at most one online meeting of under one hour from our side, carrying everything else through payment cleared, contract signed, and engagement started. Qualified versus Strong is decided by SEAT COUNT, not dollars: B2C Strong is seat count only (threshold currently 15 seats or more; an individual has no domain, so the domain plays no role in B2C), and B2B Strong requires BOTH a genuinely New or Dormant domain AND the seat threshold (currently 10 seats or more). At or below the threshold a new-company B2B deal keeps its new-company classification but is paid the Qualified rate. A missing seat count classifies as Qualified, never Strong. Delivery stays the single company-set rate. The Renewal Override and the Growth Bonus are B2B only, enforced in the engine. All rates and caps stay as configured.

---

# PART A. What exists today (the exact current state)

- The Strong test is dollars. `classifyOrigination` in `src/lib/partner/commission.ts` (line 276) takes `saleAmountCents` and compares it STRICTLY above `strongValueThresholdB2cCents` (500000) or `strongValueThresholdB2bCents` (1500000). `addCommissionLine` (partner-admin.ts line 893) feeds it `deal.netReceiptsCents`. B2C and B2B both use the domain-newness gate plus the dollar test; a domain-less deal (the typical B2C individual) can never be Strong.
- Seats already exist as data. `DealRegistration.estSeats Int?` holds the registration-time estimate. Actual seats live on `SeatRecord` rows attached to the ClosedDeal (`count`, `status` in PENDING, PAID_COLLECTED, REFUNDED, CANCELLED), created by the `recordSeats` admin action. The pure helper `countableSeats` counts PAID_COLLECTED, non-disregarded seats.
- Newness is domain-based and stays so. `companyNewnessState` reads the domain's closed-deal history (latest of signedAt and paymentClearedAt, 12-month window inclusive of Existing, conservative EXISTING on dateless rows). Nothing in this design changes it.
- The Override has NO B2B gate in the engine. The `OVERRIDE` branch of `addCommissionLine` gates only on a registered account and an origination opener; the B2B-only rule lives only in the terms. A B2C deal linked to an account could earn an override today.
- The Growth Bonus counter is B2B-scoped, but the LINE is not. `countNewCompanyDomainsRolling` (src/lib/partner/growth.ts) filters `dealType: "B2B"`, but `addCommissionLine` will happily attach a GROWTH_BONUS line to a B2C deal if the partner's B2B counter meets the threshold. That 1 percent would be paid on B2C money.
- Registration captures no per-function evidence. The form fields are Type, Offering, legal entity, Company domain (optional), Country, unit, contact, title, estSeats, estValueUsd, `functionsIntended` (three coarse checkboxes: Origination, Closing, Delivery; Basic Introduction is not claimable), one free-text justification (min 40 chars), wider scope. The warm-relationship attestation lives only on the CommissionEntry line, collected by the admin at pay time.
- The admin review card omits the decision facts. The `AdminDeal` card on `admin/partners/deal-registrations` shows entity, country, unit, offering, seats, justification, thread; it does NOT show the domain, the estimated value or seats against any threshold, or the intended functions.
- Defenses are exact-match only. `confirmDealRegistration` blocks on an exact case-insensitive `legalEntity` match to a HouseAccount, and an exact legalEntity plus country match to another partner's live account. No domain matching, no normalization, no near-match warning, no admin classification decision.
- SLA exists only in the terms. `dealConfirmationWindowBusinessDays: 5` appears in the terms text; the form and emails never mention it. `firstRightHours: 48` is a post-confirmation window, not a decision SLA.
- Notifications: the owner is emailed on submit; the partner is emailed on confirm and revision-request only. Nothing fires to the partner on submit, decline, deal closed, or commission paid; nothing to the owner on close or on any classification decision.

---

# PART B. Exactly what will change

## B1. The seat-count Strong test

Config (additive):
- Add `strongSeatThresholdB2c Int @default(15)` and `strongSeatThresholdB2b Int @default(10)` to ProgramConfig, PROGRAM_CONFIG_DEFAULTS, and CONFIG_FIELD_META (unit "seats", group "Commission rates").
- Keep `strongValueThresholdB2cCents` and `strongValueThresholdB2bCents` untouched in schema and config (nothing dropped), and move their CONFIG_FIELD_META entries to the existing "Retired (not used by current rules)" group with labels marking them superseded by the seat thresholds.

Engine (`classifyOrigination`, new signature):
- Replace `saleAmountCents: number` with `seatCount: number | null`. Comparison is INCLUSIVE: `seatCount >= threshold` ("the configured threshold or more"), unlike the old strictly-above dollar test. `null` means the seat count is not available and always fails the test (conservative, consistent with the dateless-domain rule: never grant Strong on missing data).
- B2C: Strong if and only if `seatCount >= cfg.strongSeatThresholdB2c`. The domain and newness play NO role for B2C. Below the threshold, or with no seat count: QUALIFIED_ORIGINATION at the qualified rate. There is no "new-company classification" for B2C (a person is not a domain), so `isNewCompany` is always false on B2C and B2C never feeds the Growth Bonus (which is B2B only anyway).
- B2B: Strong if and only if BOTH the domain is genuinely New or Dormant AND `seatCount >= cfg.strongSeatThresholdB2b`. An Existing domain is Qualified regardless of seats. A New or Dormant domain below the seat threshold (or with no seat count) KEEPS the new-company classification (recorded as STRONG_ORIGINATION, `isNewCompany: true`, so the Growth Bonus credit and the opener rate anchor survive) but is PAID the Qualified rate, exactly the fallback shape that exists today. No domain: never Strong, never a Growth credit, Qualified only, unchanged.
- `companyNewnessState` is unchanged.

Seat-count source at classification time (`addCommissionLine` origination branch), DECIDED with the owner:
- PAID_COLLECTED seats only. The seat count for the Qualified-versus-Strong test is the sum of `SeatRecord.count` where status is PAID_COLLECTED. Pending seats do not count, and refunded and cancelled seats never count. If the deal has no paid-collected seats yet, the count is null and the classification is Qualified, never Strong, consistent with the conservative rule of never granting Strong on incomplete data. (An earlier draft proposed counting pending plus paid; the confirmed decision is paid-collected only.)
- The audit record for the line gains `seatCount` and `seatThreshold` next to the existing newness fields, so every classification is reconstructable.
- At review time (before any deal exists) the admin sees the LIKELY classification computed from `estSeats` (see B5); the binding classification still happens at line time from actual seats, and the admin decision from B3 can override it.

## B2. Involvement boundaries as claims and evidence

New model (additive), one row per claimed function per registration:

`DealFunctionClaim { id, dealRegistrationId (FK, cascade), function String (BASIC_INTRO, ORIGINATION, CLOSING, DELIVERY), contactName String?, relationshipDescription String? @db.Text, introDescription String? @db.Text, involvementStatement String? @db.Text, warmRelationshipAttested Boolean @default(false), createdAt }` with `@@unique([dealRegistrationId, function])` and an index on dealRegistrationId.

Registration form and schema:
- `DEAL_FUNCTION_OPTIONS` gains "Basic Introduction (introduce and step away)" as a fourth claimable function; the existing `functionsIntended` string array stays (additive) and the claims become the structured truth.
- Checking a function reveals its small evidence block, with the involvement boundary stated right there in encouraging copy:
  - Basic Introduction: who the contact is (name and role), the pre-existing warm relationship described, and how the partner introduced and explained us; a required attestation checkbox ("I have a genuine, pre-existing warm relationship with this contact"). The copy states plainly: zero meetings and no follow-up after the introduction, no account ownership or protection, and "a genuinely valuable introduction is rewarded even though you introduce and step aside."
  - Origination: the involvement statement (which meetings you expect to attend, what follow-up you take on), plus the domain and unit fields that already exist, and estSeats feeding the Strong preview.
  - Closing: how the partner will drive the deal to signature and start; the boundary stated: our team contributes at most one online meeting of under one hour, and the partner carries everything else through payment cleared, contract signed, and engagement started.
  - Delivery: the intended delivery or coaching scope.
- Blocking policy, exactly as confirmed: every evidence text field is OPTIONAL in the zod schema and the form submits with them blank (evidence is strongly encouraged and the copy says it materially affects confirmation and classification). The ONE exception: if the Basic Introduction function is checked, its attestation checkbox is required to submit that claim, mirroring the engine's existing pay-time requirement. The pay-time engine gate on `warmRelationshipAttested` stays; when a claim exists, the commission line sources the attestation from the claim so the admin does not re-ask.
- `resubmitDealRegistration` upserts the same claims. The admin card renders each claim as its own block (B5).

## B3. The multi-domain and already-ours defenses (made precise)

- A pure `normalizeEntityName` helper beside `normalizeDomain` in commission.ts: lowercase, strip punctuation, collapse whitespace, fold common suffixes (inc, incorporated, llc, ltd, limited, gmbh, sa, srl, bv, co, corp, corporation, company). Unit-tested.
- Hard blocks in `confirmDealRegistration` (extending the two existing checks): block when the normalized entity name OR the normalized domain matches a HouseAccount (name or domain) or another partner's live RegisteredAccount (name plus country, or domain). Domain equality uses the existing `normalizeDomain`.
- Near-match warning panel at review (soft, never blocks): against HouseAccounts, live RegisteredAccounts, and distinct ClosedDeal domains, flag candidates where normalized names share a long prefix or differ by a small edit distance (a small pure `similarName` helper, unit-tested), or where one normalized domain contains the other's registrable label. Rendered as "Possible existing relationship" rows with links.
- The admin classification decision, stored and consulted: `confirmDealRegistration` gains an optional decision, default "objective" (the engine classifies as usual). The admin may instead force "treat as existing company" with a REQUIRED reason: stored as `classificationOverride String?` plus `classificationOverrideReason String?` on RegisteredAccount (additive columns), written at confirm, audited. In `addCommissionLine`, when the deal's registered account carries `classificationOverride = "EXISTING"`, the origination is classified as if the newness were Existing (Qualified rate, no new-company credit), with the override and reason recorded in the line's audit entry. The objective rule remains the default; the human can only make it stricter, never grant Strong by hand.

## B4. The B2C person-level model and engine B2B-only enforcement

- B2C origination is person-level: the seat count is the only Strong test (B1); the domain field remains optional and is simply ignored by B2C classification.
- OVERRIDE branch: add the gate `if (deal.dealType !== "B2B") return { ok: false, message: "The renewal override applies to B2B accounts only." }` before the opener lookup, closing the terms-versus-engine gap found in the earlier investigation.
- GROWTH_BONUS branch: refuse on B2C deals with a clear message ("The growth bonus counts new B2B organisations and is paid on B2B deals."), closing the gap confirmed in Part A. The domain-based counter itself is already B2B-scoped and unchanged.

## B5. The admin review screen

The deal-registrations card grows to show, in one view: the partner and tier; the entity with the near-match panel from B3; the domain and the LIVE newness result (New, Dormant, Existing) computed by the existing `companyNewnessState` against the live history; `estSeats` against the applicable seat threshold with the resulting likely classification ("Likely Strong: new domain and 12 estimated seats, threshold 10" or "Likely Qualified: below the seat threshold"), all numbers rendered from config; each claimed function with its evidence block and, for Basic Introduction, the attestation state; the estimated value; the existing scope, thread, and confirm, decline, and revision actions; and the new classification decision control (objective default, or force-existing with reason). Submitted-at plus the SLA deadline ("decision due within 5 business days") are shown on the card.

## B6. The decision SLA, surfaced

One number, `cfg.dealConfirmationWindowBusinessDays` (5), rendered config-sourced in four places: a line on the registration form under the submit button ("We confirm or decline within N business days"), the new submission acknowledgement email (B7), the terms (already present, unchanged), and the Academy Module 3 registration passage (one added sentence). The existing `firstRightHours` stays what it is (a post-confirmation window) and is not presented as a decision SLA anywhere.

## B7. Notifications, the full set

New templates in `src/lib/email/templates.ts`, sends wired at the exact sites:
- Partner, on submit (`submitDealRegistration` and `resubmitDealRegistration`): "We received your registration for X; decision within N business days." Config-sourced N.
- Partner, on decline (`declineDealRegistration`): the decline reason plus encouraging next steps.
- Partner, on deal closed (`recordClosedDeal`): the deal was recorded, with the account name and what happens next.
- Partner, on commission paid (`setCommissionStatus` when status becomes PAID): "You have been paid for X," amount in the deal currency.
- Owner (`notifyOwner`): on submit (exists), on deal closed (new), and on any classification override at confirm (new), so a forced classification is never silent.
All partner sends use the existing `safeSendEmail` (failures never break the action), matching the codebase pattern.

## B8. Consistency: flow, terms, Academy, public page, previews (every affected surface named)

- Legal terms (`src/lib/partner/terms.ts`): rewrite the Strong Origination bullet to the seat test (B2C: the configured seat threshold or more, seat count only; B2B: genuinely New or Dormant domain AND the seat threshold or more; at or below, the new-company deal keeps its classification and is paid Qualified; a missing seat count is Qualified). Update the "high-value sale" definition sentence to define the two seat thresholds instead (the dollar sentence is removed since the dollar test is retired). Add the involvement boundaries: Basic Introduction (zero meetings, no follow-up, valuable introduction still rewarded, no ownership); Origination (attends meetings, takes follow-up); Closing (at most one online meeting under one hour from our side, partner drives to payment, signature, and start). State the Override and the Growth Bonus as B2B only (now also enforced). Numbers render via config (`cfg.strongSeatThresholdB2c/B2b`), no literals.
- Public page (`src/app/(public)/partners/page.tsx`): the Origination card describes the seat-based Strong rule; the Basic Introduction card gains the introduce-and-step-away line; the Closing card gains the boundary; the footnote replaces the two currency thresholds with the two seat thresholds (rendered from config; `formatCents` usage for these two values goes away here).
- Reference generator (`app/scripts/generate-partner-section.ts`): Part 1 mirrors the public page changes, then the export is regenerated in Phase 2.
- Academy: m02 (Identity) function list and lesson rewritten to the involvement definitions, including the explicit "you are rewarded for a valuable introduction even if you introduce and step aside" line and the zero-meetings boundary; m03 (Rules) "Qualified or strong, and who decides" passage rewritten to the seat test with the at-or-below fallback sentence and the missing-seats-means-Qualified sentence, plus the Closing one-meeting boundary and the SLA sentence; m13 (Motions) earning paragraph updated (B2C strong described as seat-count driven for community sellers such as bloggers and influencers). All numbers interpolated from config imports as m03 already does.
- Exam integrity, the exact questions that must change in place (counts unchanged, one correct answer, answerable from the new text, no mutable number as an answer): m02 exam "Which of these best describes strong origination?" correct option currently says "on a high-value sale"; it becomes seat-framed without naming a number ("a company genuinely new or dormant to us, at or above the configured seat threshold, decided objectively from the recorded facts"). m02's involvement-adjacent questions and m03's threshold-adjacent explanations are audited the same way in Phase 2; today's audit already confirms no question tests a number, and that property is preserved.
- Admin previews (`add-commission-line-form.tsx` and the partner page): the origination note text ("newness by domain and the sale amount") becomes "newness by domain and the seat count"; the growth preview is unchanged.
- Phase C tests that pin the dollar-threshold behavior (`commission-redesign-phase-b/c.test.ts`) are updated to the seat test with both boundaries pinned (at threshold passes, one below fails, null fails), plus new tests: B2C strong with seats and no domain; B2B new domain below seats paying Qualified with classification kept; OVERRIDE refused on B2C; GROWTH_BONUS refused on B2C; the name normalizer and near-match helper; claim storage; and the attestation sourcing.

## B9. Phase 2 execution plan (after your approval)

Additive migrations: one migration adding the two seat-threshold columns to ProgramConfig, the DealFunctionClaim table, and the two classification-override columns on RegisteredAccount. Nothing dropped, all defaults safe. Build order: config and engine with tests first (gates), then claims and forms (gates), then defenses and admin review (gates), then notifications and SLA (gates), then terms, Academy, public page, generator (gates plus the content dump), then the refute-first multi-lens adversarial review with fixes and re-verification, then the report and the same safe deploy order as before: commit in separated commits, build, hash-check, migrate on container start, seed the content, health checks, push, post-deploy audit against the live state, final report.

---

# Hard stop

Phase 1 ends here. Nothing was changed, built, committed, or deployed. The pending working tree (Academy clarity, telemetry, audio fix) still awaits its own deploy decision, and the sequencing choice above is yours. When you approve this design (as is or amended), Phase 2 begins.
