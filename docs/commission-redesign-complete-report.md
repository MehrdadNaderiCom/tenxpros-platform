# TenXPros Partner Commission Redesign: Complete Reference and Change Report

This is the single, complete record of the partner commission redesign, covering every change to how partners are paid and how they are taught, from the first line of work to the production deployment. It is written so that someone who was not present can understand exactly how partners are now paid, exactly what changed in the legal terms and the Partner Academy, and how we know the result is correct.

Every commercial number in the system is read from one configuration source of truth (the program config), never hand typed into code or content. Where this document states a figure, it is the current configured value and is shown so you can see the shape of the rule; the rule itself is what matters, and the number can be changed in config without touching code or content.

Deployment status: shipped to production on the branch deployment/production-deployment-sprint-a, commits 656f2f4 (migrations and schema), 948901b (engine), a36ac20 (surfaces), 9056b52 (tests). The two additive migrations applied cleanly with zero data loss, the academy content was reseeded, and the live site is healthy.

---

## 1. Why this redesign existed

The old model asked a human to grade each origination as "qualified" or "strong" on the Panel, unlocked the B2C strong rate only after forty paid seats or a Panel confirmation, and paid delivery on a five to eight percent band that an operator chose within. Every one of those was a judgment call, which meant every one of them could be disputed, and a partner could never fully predict their own statement.

The redesign replaces judgment with objective, recorded facts. Three facts decide origination pay, and all three are observable and dispute proof:

1. The company DOMAIN, the canonical identity of the company.
2. The company NEWNESS, derived from that domain against the deal history.
3. The SALE AMOUNT, compared to a high value threshold.

Nothing about origination is decided by opinion anymore. The server derives it from these facts, and the partner is never surprised.

---

## 2. How partners are paid now, in full

### 2.1 The unit and the base

Commission is earned by function, on Net Receipts (the money that actually reaches and clears to the company after real selling costs), never on the sticker price and never on profit. The unit of sale is the seat (one enrolled professional). Two contexts exist: a B2C Charter (an individual enrolls) and a B2B Engagement (an organization buys seats).

### 2.2 Company newness, by domain

A company's newness is read from its domain, objectively:

- NEW: the domain has never appeared on a closed deal with us.
- DORMANT: the domain has appeared, but its most recent activity is more than the origination window (currently 12 months) ago.
- EXISTING: there has been activity on the domain within the last 12 months.

"Most recent activity" is anchored on the latest of the signed date and the payment cleared date across all of that domain's closed deals. The window boundary is inclusive of Existing: activity exactly 12 months ago counts as Existing, not Dormant. Newness is a program wide fact: the domain history is read across all partners, so a company already closed by any partner is not New. On incomplete data (a domain that appeared but carries no datable activity) the rule is conservative and treats it as Existing, so the special Strong rate is never granted on missing data.

Domains are normalized to one canonical identity (lowercased, scheme and a leading www stripped, path removed), so acme.com, https://acme.com and www.acme.com are one company and are never miscounted as two.

### 2.3 The five functions, and the override and bonuses

Basic Introduction (currently 5 percent on B2C and B2B). Requires a genuine, pre existing warm relationship, which the partner attests to with a stored flag plus an evidence note naming the person and the relationship. It pays only when that introduced contact becomes a closed, paid deal, and it confers no account ownership or protection.

Qualified Origination (currently 10 percent B2C, 8 percent B2B). This is opening a new department, branch, or unit of a company we already know (an Existing domain).

Strong Origination (currently 15 percent B2C, 12 percent B2B). Two things must both be true: the domain is genuinely New or Dormant, AND the sale amount is strictly above the high value threshold for its type (currently 5,000 dollars on B2C, 15,000 dollars on B2B). If the company is New or Dormant but the sale is at or below that threshold, the deal keeps its new company classification (so it still counts toward the Growth Bonus and still anchors the override opener rate) but is paid the Qualified rate, not the Strong rate. A deal with no recorded domain can never claim the Strong rate and never counts toward the Growth Bonus, though it can still earn Qualified Origination, Closing, and Delivery. The operator submits an origination without choosing its strength; the server derives Qualified versus Strong from newness and amount.

Closing (currently 5 percent B2C, 10 percent B2B). Payable only once the deal carries a recorded signed agreement date. Creation of a closing line is refused with a clear message if the signed date is absent.

Delivery or Coaching (currently 8 percent, a single company set rate). Delivery is normally the company's own; this line is paid only when the company engages a partner to help it scale, and only once the deal carries a recorded delivered date. The operator does not pick a rate within a band. A fixed fee is possible only as a superadmin exception, with a recorded reason logged to the audit trail.

Renewal Override (currently 50 percent of the opener rate). On a B2B account, a same scope renewal within the origination window also pays an override worth 50 percent of the rate the account was opened at, on top of the renewal's own commission. Crucially, the override is credited to the account's OPENER (the partner who originated it), not to whoever records the renewal, and only while that opener still holds Active Status by actively supporting the account. If the opener and the renewal owner are the same partner, behavior is unchanged. If no opener can be identified, no override line is created. It is one line on the renewal and sits inside that renewal's single cap.

Growth Bonus (currently 1 percent, Tier 2 and Tier 3 only). Counts the distinct, genuinely new B2B organizations a partner brings in, counted BY normalized domain (so two deals on the same company count once), evidenced by the recorded new company origination classification, closed and collected within the rolling qualifying window (currently 12 months). A deal with no recorded domain never counts. It is paid inside the per deal cap.

Focus Bonus (unchanged by this redesign). The Tier 3 focus bonus is the single thing that can lift an eligible focus deal above the base cap, up to the focus ceiling.

### 2.4 The airtight cap

Total partner compensation on any one deal, across every function and every partner, is clamped to the cap: currently 25 percent of Net Receipts on B2C and 30 percent on B2B. The one exception is a Tier 3 focus account, which can rise gradually to the focus ceiling, currently 35 percent. When functions stack above the cap, the percentage lines scale down in proportion, cents exact, to fit it exactly. This holds under any number of partners, any weighting, and any settlement order.

### 2.5 Multi partner crediting and the weighted split

A single deal can carry several functions performed by different people, and each commission line is credited to the partner who actually performed it, through the line's own partner field. So an introducer, an originator, a closer, and a delivery partner can each be paid on the same deal. Regular admins credit lines to the deal owner as before; only a superadmin may attribute a line to a different performer, with the mandatory evidence note.

Where a single contribution is genuinely shared, a superadmin may split one function between partners by a weight, with a recorded reason. The weight is an absolute share of the full function amount. The split is conserved: the shared lines together equal exactly what a single unshared line for that function would have been, both before and after cap scaling, and a shared function is never double counted. If one sibling of a split is paid and a later recompute sees only the survivors, the survivor keeps its own share and is never reinflated back to the full amount, because each line is clamped to the group's remaining budget (the full amount minus what siblings already settled). Under any settlement order and any number of partners, paid plus recomputed never exceeds one unshared line.

---

## 3. Every superseded rule, and what replaced it

| Retired rule | Replaced by |
| --- | --- |
| B2C strong rate "unlocks after forty paid seats or by Panel Confirmation" | Strong is derived objectively: domain New or Dormant AND sale strictly above the high value threshold; else the Qualified rate |
| The company "classifies each origination as strong on the Panel" (human judgment) | The server derives Qualified versus Strong from recorded facts (domain newness plus sale amount); no opinion, never on the Panel |
| Delivery paid on a five to eight percent band chosen by the operator | Delivery pays a single company set rate; a fixed fee is only a superadmin exception with a logged reason |
| Delivery FIXED_FEE config mode | Fixed fee is a per line superadmin exception, not a config mode |
| Override credited to whoever records the renewal | Override credited to the account opener, gated on the opener's Active Status |
| Growth Bonus counted by registered account plus a "major new engagement" flag | Growth Bonus counted by distinct normalized domain, evidenced by the new company origination, no domain never counts |
| Closing payable without a recorded signed date | Closing requires a recorded signed date, refused otherwise |
| Delivery payable without a recorded delivered date | Delivery requires a recorded delivered date, refused otherwise |
| Basic Introduction as a loose "you introduce a contact" | Basic Introduction requires a genuine pre existing warm relationship, attested with a stored flag and an evidence note |

The retired config keys (the seat unlock count, the delivery mode, the delivery min and max band) were kept in the config and the schema (nothing is dropped), but they are no longer used by any rule and are grouped in the admin editor under "Retired (not used by current rules)" so no operator mistakes them for a current rule.

---

## 4. Legal terms, clause by clause (src/lib/partner/terms.ts)

The terms render directly from code (the partner terms builder), so this deployed via the image, and every number renders from config.

"How commission is earned" section:

- Added an opening statement that the company derives every classification objectively from the recorded facts of the deal, so nothing on a statement is a matter of opinion, and added the plain New, Dormant, and Existing definitions with the two high value thresholds stated as currency.
- Basic Introduction bullet: rewritten to require a genuine pre existing warm relationship, attested with a note naming the person and the relationship, paying only on a closed paid deal, conferring no account ownership or protection. Before it simply said "paid if the introduction becomes a closed deal."
- Qualified Origination bullet: rewritten to define it as a new department, branch, or unit of a company we already know (an Existing domain).
- Strong Origination bullet: was "15 percent on B2C (after forty paid seats, or by Panel Confirmation), 12 percent on B2B." Now: both conditions required (domain New or Dormant AND sale strictly above the threshold); the at or below threshold fallback to the Qualified rate while keeping the new company classification; and the no domain rule.
- Closing bullet: added the recorded signed date requirement.
- Delivery bullet: was "a fixed fee, or 5 percent to 8 percent if approved." Now: a single company set rate, delivery normally the company's own, paid only when the company engages a partner and only with a recorded delivered date, fixed fee only as a company exception with a reason.
- Cap bullet: clarified that the cap is across every function and every partner, and that percentage lines scale down in proportion to fit.

"Renewals, trail and the origination tail" section:

- Override paragraph: was "on a B2B account you opened ... while you keep actively supporting." Now: credited to the account's opener (not whoever records the renewal), gated on the opener's Active Status, one line inside the renewal's single cap.
- Added a new paragraph on multi partner deals: each line credited to its performer; a genuinely shared contribution may be superadmin weighted with a recorded reason; the deal total never exceeds the cap however the credit is divided.

"The tier ladder and progression" section:

- Growth Bonus paragraph: rewritten to count distinct genuinely new B2B organizations by domain (two deals on the same company count once), with a deal that has no recorded domain never counting.

---

## 5. Partner Academy, module by module

The academy lessons and exams live in the database and deployed via the content seed (dump then seed). Because every module was at content version 1 (no superadmin live edit had ever been made), the seed wrote every rewritten lesson, and it always rewrites the exam questions. Verified live: no academy lesson or exam question contains any superseded rule.

Module 2, Identity (m02):

- Lesson prose and the function list rewritten: Basic Introduction now names the warm relationship; Qualified Origination is a new unit of a company we already know; Strong Origination is a genuinely new or dormant company on a high value sale, derived objectively, "not something you grade yourself or that anyone decides by opinion on the Panel." Delivery is described as the company's norm with the single rate when engaged.
- Exam question "Which of these best describes strong origination?": the correct option was "a larger or strategically stronger origination that the company classifies as strong on the Panel." It is now "Opening a company that is genuinely new or dormant to us on a high value sale, decided objectively from the recorded facts," with the explanation updated to the objective rule.
- Exam question "Which pairing of function and meaning is correct?": the correct option defined Qualified Origination as "sourcing an opportunity that can realistically close" (the retired generic meaning). It is now "opening a new department, branch, or unit of a company we already know," with the explanation updated. This second question was caught by the Phase D adversarial review.

Module 3, Rules (m03):

- The rates list rewritten: Basic Introduction gains the warm relationship attestation; Qualified is a new unit of an Existing company; Closing names the signed date; Delivery is the single rate with the superadmin fixed fee exception. The old delivery band and "the company classifies each origination ... B2C strong unlocks after forty paid seats or a Panel Confirmation" paragraph is replaced with the full objective rule: the New, Dormant, and Existing definitions, the two thresholds as currency, and the explicit at threshold fallback sentence ("if the company is New or Dormant but the sale is at or below that threshold, the deal keeps its new company standing but is paid the Qualified rate") plus the no domain rule.
- The cap worked examples were preserved (they were already correct) and reworded to use the single delivery rate; the "once your B2C strong rate is unlocked" framing was removed.
- The override paragraph rewritten to credit the opener and check the opener's Active Status, and a new paragraph added on multi partner crediting and the weighted split staying inside the cap.
- The glossary bullet for the Growth Bonus now states it is counted by domain with no domain excluded (added in Phase D after the adversarial review flagged its absence).

Module 11, Operations (m11):

- Three exam questions used "Forty paid seats" or "forty accounts" as wrong distractors, echoing the retired seat concept. These were neutralized to non numeric distractors ("A completed enrollment," "Registering many accounts at once"), with explanations updated. Correct answers and question counts unchanged.

Module 13, Motions (m13):

- The "what you earn by motion" paragraph rewritten: origination pay described objectively ("15 percent when the company is genuinely new or dormant and the sale is high value," not "strong once unlocked"); the override described as credited to the opener; delivery as the single company set rate.

Exam integrity: across the four touched modules the question counts are unchanged (18 authored per module), each question has exactly one correct answer, every correct answer is answerable from the rewritten teaching, and no question tests a mutable number as its answer.

Preserved true content: the focus bonus mechanics and the above cap exception, the cap scale down worked example, and the pays only on cleared money framing were kept intact and remain consistent with the new rules.

Reference document: the "complete partner section" export (docs/academy/partner-section-complete.md and .pdf) is generated from the code by scripts/generate-partner-section.ts. That generator held a hardcoded stale copy of the public page (Part 1) with the old band and seat unlock; it was fixed to the shipped rules and the export regenerated. The generator change is committed; the regenerated md and pdf are left as untracked artifacts.

---

## 6. Schema and config changes (all additive, nothing dropped)

Schema (prisma/schema.prisma), applied by two additive migrations:

- Phase A migration (20260703120000): added a nullable domain column to DealRegistration, RegisteredAccount, and ClosedDeal; a nullable weightBp to CommissionEntry; and three columns to ProgramConfig with safe defaults, deliveryPercentBp (default 800), strongValueThresholdB2cCents (default 500000), and strongValueThresholdB2bCents (default 1500000).
- Phase B migration (20260703130000): added warmRelationshipAttested to CommissionEntry (boolean, default false) and an index on ClosedDeal(domain). Ordered after Phase A, which creates the domain column it indexes.

Both migrations are pure ADD COLUMN and CREATE INDEX, with safe defaults or nullability, so no data can be lost. They were verified in production to apply with the row counts unchanged (2 partners, 6 users, 1 application, 17 academy modules before and after).

Config (src/lib/partner/config.ts and constants.ts):

- Added deliveryPercentBp, strongValueThresholdB2cCents, and strongValueThresholdB2bCents to the config defaults and the admin editor metadata (the thresholds render as currency).
- The retired keys (strongOriginationUnlockSeats, deliveryMode, deliveryPercentMinBp, deliveryPercentMaxBp) were moved in the admin editor from the "Commission rates" group to a "Retired (not used by current rules)" group; they remain in the config and schema (additive).

---

## 7. Phase by phase history, and every adversarial finding caught and fixed

The work was built in reviewed phases. After each, the gates were run (type check, the content dash lint, the full test suite, and the production build), and a refute first, multi lens adversarial review was run to try to break the work. The reviews caught real defects that the green gates did not; each is recorded here.

Phase A, foundations. The additive schema and the new config keys, with tests that a legacy deal computes identically. Gates green. No adversarial findings.

Phase B, objective classification. The company newness function (New, Dormant, Existing with the inclusive 12 month boundary), the objective Qualified versus Strong rule with the at threshold fallback and the no domain rule, the Closing signed date gate, the Delivery single rate with the superadmin fixed fee exception, and the Basic Introduction attestation.

- Adversarial finding, MAJOR, caught and fixed: the classification code was correct and all tests were green, but the entire feature was dead, because the company domain was never written anywhere. The forms had no domain field, so every deal was recorded without a domain, and the objective rule silently fell back to Qualified on every origination. The concrete case the review built: a brand new company B2B deal of 2,000,000 dollars would be underpaid by 80,000 dollars, with no error. Fixed by capturing and normalizing the domain end to end, from the partner deal registration form, through account confirmation, to the closed deal, and adding seven tests. A focused re verify returned zero findings.

Phase C, multi partner attribution and the airtight cap. Per line partner attribution, the override credited to the opener with the opener's Active Status, the superadmin weighted split, the Growth Bonus counted by domain, and the cap proven airtight across partners.

- Adversarial finding, CRITICAL, caught and fixed: a weighted split reinflated on recompute. When one sibling of a split was marked paid, a later recompute saw only the surviving sibling and reinflated it to the full function amount, overpaying the group by the paid sibling's share, invisible because the deal cap was not breached. Fixed by making the weight an absolute share of the full amount.
- Two residual cent level findings, caught and fixed on re verify: the first fix left a one cent overpay on odd cent two partner settlement (fixed by flooring the survivor's share), and that in turn left a one cent overpay on three or more partner staggered settlement (fixed definitively by clamping each group to its remaining budget, the full amount minus what siblings already settled). A final four reviewer pass on the budget clamp returned zero findings. Every fix is pinned by a test.

Phase D, surfaces. The legal terms, the public page, and the academy rewritten to the objective rules, and the three deferred admin previews fixed.

- Adversarial finding, MAJOR, caught and fixed: an m02 exam question still marked the retired generic definition of Qualified Origination as correct, contradicting the rewritten lesson. Fixed in place.
- Adversarial finding, minor, caught and fixed: the m03 lesson taught the Growth Bonus without stating it is counted by domain. Added.
- A security nuance handled during the preview fix: the growth preview reuses the exact domain based counter the server uses; that counter was placed in a plain shared module rather than exported from the server actions file, so it does not become an unauthenticated endpoint.

Phase E, final whole system verification and the deploy.

- Adversarial finding, MAJOR, caught and fixed: the retired knobs (the seat unlock and the delivery band and mode) were still listed in the admin config editor's live "Commission rates" group, presenting them as current rules, and deriveFunctionRate still derived delivery at the retired band floor of 5 percent, disagreeing with the 8 percent the save path pays. Fixed by regrouping the retired keys under "Retired (not used by current rules)" and making deriveFunctionRate return the single delivery rate.
- Adversarial finding, MAJOR, caught and fixed: the partner section reference export still showed the old rules, because the generator held a hardcoded stale copy of the public page. Fixed the generator and regenerated the export.
- Adversarial finding, minor, caught and fixed: a retained helper's docstring still described the seat unlock as current; marked it retired.

The seed skip investigation (the highest risk item of Phase E): the academy seed skips a lesson's body only when its content version is greater than one (the superadmin live edit guard); it always rewrites the exam questions. Every one of the 17 live modules was at content version 1, and the only thing that raises the version is the superadmin live editor, which had never been used. So the seed wrote every rewritten lesson; nothing was skipped. With zero academy pass records, there was no re pass concern.

---

## 8. How we know it is correct

- The full automated suite (345 tests, 28 files) passes, and it was re run against the actual deployed container code, where all 154 partner and commission tests pass, including the money safety proofs.
- The money safety proofs (19 in the Phase C suite) prove, by construction and by fuzzed stacks, that no deal under any number of partners, any weighting, and any settlement order can exceed the cap, and that a weighted split is conserved and never reinflates or overpays. These pass against the deployed code.
- A legacy shaped single partner deal computes identically before and after the redesign, proving the engine change did not alter existing behavior where the new gates are satisfied.
- Five rounds of refute first, multi lens adversarial review caught the domain write gap, the reinflation bug and its two cent level residuals, the surface supersession misses, and the whole system config and generator contradictions. Each confirmed finding was fixed and re verified to zero.
- The production deployment was verified end to end: the image source matches the deployed commit for all changed files by content hash; both migrations recorded with no rollback and zero data loss; the live database contains no superseded rule in any lesson or exam and states the new rules; the live public and terms pages show no superseded rule and the new rules; the live config carries the correct configured numbers; and the app and every other stack on the host are healthy.
- A final refute first adversarial audit was run one more time against the LIVE running state itself (the running site, the live database, and the deployed container), across live surfaces, live database content, and the live engine and money safety. It returned zero findings: the deployed state faithfully matches the redesign, with no discrepancy between what was intended and what is actually live.

---

## 9. Deployment record

- Branch: deployment/production-deployment-sprint-a.
- Commits: 656f2f4 migrations and schema; 948901b engine; a36ac20 surfaces; 9056b52 tests. Pushed to origin (acfd6bc..9056b52).
- Image built from the committed working tree; every changed source file in the image matches the deployed commit by sha256.
- Migrations 20260703120000_commission_redesign_phase_a and 20260703130000_commission_redesign_phase_b applied on container start; both recorded, additive, zero data loss.
- Academy content reseeded (17 modules, 1 terms record, 2 groups); all modules written; new rules verified live in the database.
- Health: the app health endpoint returns ok, the database accepts connections, and the tenxpros, tenxops, tenxrole, and mn-ai-exam stacks are all healthy and undisturbed.

The one full suite test that fails inside the production container is a pre existing, environment sensitive payment link test that asserts a placeholder "when nothing is configured"; the production environment has a real payment link configured, so it correctly returns that link instead of the placeholder. It passes on a clean test environment and is unrelated to this redesign.


---

**Dated addendum (2026-07-03):** where this report says the B2C cap is "currently 25 percent," that was true on its date. The owner has since approved raising the B2C per-deal cap to 28 percent (see docs/phase1-b2c-cap-raise-plan.md). The report is kept unchanged as the historical record of the redesign it documents.
