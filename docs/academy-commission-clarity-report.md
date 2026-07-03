# Academy commission clarity pass: findings and revisions, for review before anything ships

This pass audited how the Partner Academy, the legal terms, and the public partners page teach the commission rules BEYOND single function definitions: how functions combine on one deal, worked scenarios, the exact Renewal Override boundary, and the other misreadable edges. It then revised the content where teaching was missing or unclear. **Nothing is committed and nothing is deployed**: every change sits only in the working tree, the gates all pass, and this document plus the companion file with the full revised text are the review package. The companion file with every revised passage in full is `docs/academy-commission-clarity-revisions.md`.

The audit ran as a three lens investigation (lessons, exam questions, terms and public page) against the deployed engine as the source of truth, with file and line evidence for every verdict. The engine itself was not touched and no rate changed; this is entirely about teaching the live rules clearly.

---

## Area 1: how functions combine on one deal, and the cap

**What we found.** Better than expected, with three real gaps. The m03 Rules lesson already teaches that functions stack ("when you perform more than one function on the same deal, the rates add up, and the total is then clamped to that cap"), that different partners can each be paid on one deal, and it already carries three config computed numeric examples (a below cap sum, an exactly at cap sum, and an over cap sum). The terms and the public page both state the cap and the proportional scale down. The gaps: (a) the proportional scale down was ASSERTED but never worked through, so a learner saw "clamped to the cap" without ever seeing what each line becomes; (b) the plain text lesson body said only "there is a cap" with none of the stacking mechanics; (c) not a single exam or exercise question anywhere tested stacking or the clamp.

**What we changed.**
- The worked example in m03 now works the arithmetic through per line, with every figure computed from config so it can never drift. (After the owner's cap decision, built in this same tree, the example has two beats: the realistic full stack of strong + closing + delivery adds to exactly 28, exactly the B2C cap, and pays in full; then a confirmed basic introduction by ANOTHER partner joins the same deal, the lines add to 33, and every percentage line scales by the cap divided by the raw total, 15 to about 12.73, 5 to about 4.24, 8 to about 6.79, and the intro 5 to about 4.24, landing together exactly on 28, which also teaches honestly that the cap is shared across the partners on a deal.) It closes with the distinction the owner asked for verbatim: performing several functions is what makes rates add; the cap is only a ceiling on the sum; and the engine re applies the clamp whenever lines change later.
- The plain text lesson body gained the same teaching in one compact sentence pair.
- One redundant exam question was repurposed to test it (see the exam section below).

## Area 2: real worked scenarios for each boundary

**What we found.** Every boundary was stated crisply as a RULE with the right config sourced numbers, but no lesson walked a named, realistic story through classification and payout. The "A real scenario" sections in m02, m03, and m13 cover integrity, registration priority, and the pilot, not commission boundaries.

**What we changed.** m03 gained a new subsection, "Seven short scenarios that settle the boundaries," directly after the commission mechanics. Each scenario names a person, tells a realistic story, and ends with the exact function, the config rendered rate, and why: the introduction that stays an introduction (steps away, zero meetings, still rewarded); the origination with meetings and follow up on a new domain reaching the seat threshold (Strong B2B); the same story one seat below the threshold (keeps new company standing, paid Qualified, growth credit and override anchor survive); the blogger on B2C at versus below the seat threshold (seats alone decide, no domain involved); the company we already serve opening a new unit (Existing, Qualified, and explicitly NOT an override); the closing with exactly one forty five minute call from our side; and the renewal versus the branch (the same scope renewal pays the opener's override; the new branch is a new registration and a full new origination). All seat counts and rates render from config, including the "one below the threshold" figures which are computed as threshold minus one.

## Area 3: the precise scope of the Renewal Override

**What we found.** This was the sharpest real gap, exactly as the owner suspected. Every surface said "same scope renewal," and the engine is strict about it (the override trails only prior deals on the SAME registered account), but NO surface defined what same scope means, and none stated the converse: that a new branch, department, unit, country, affiliate, or parent is a NEW registration and a NEW origination, not an override. The terms were PARTIAL (a reader had to assemble the rule from the registration scope clause two sections away); the public page was MISSING it entirely; the lessons said "same scope" without definition.

**What we changed, on every surface, consistently.**
- **Terms** (Renewals section): after the override sentence, two new sentences: "Same scope means exactly that: the same organisation and the same unit under the same domain that was originally opened and confirmed. A deal with a different branch, department, unit, country, affiliate, parent, or any other related structure is not a renewal of this account: it is a new registration and, when a partner originates it, a new origination at the full origination rate, not an override."
- **m03 override paragraph**: the same definition, plus the encouraging frame (a new branch pays the FULL origination rate, which is higher than the override share, so the boundary is good news), plus a side by side contrast: the head office renewal that carries the override versus the subsidiary in another city that is a new registration and a new origination.
- **m03 plain lesson**: one compact sentence with the definition and the converse.
- **m02** (both the plain lesson and the rich body, where the function tour first mentions the override): a short clause with the definition and the converse.
- **m13** (where the motions module mentions the override): a short clause with the converse.
- **Public page and the reference generator**: the Renewal Override function card now says "a same scope renewal of that same account" and adds "A new branch or unit is a new registration and a full new origination instead"; the commission footnote gained the same scope definition and the converse.
- One repurposed exam question now tests exactly this boundary (below).

## Area 4: the other misreadable boundaries

**What we found and changed.**
- **What counts as a paid, collected seat**: was stated as "counted on paid and collected seats" without unpacking. Now defined in place: seats the customer actually paid for with the money received and cleared; pending seats do not count yet; refunded or cancelled seats never count; and the registration estimate is a planning number, never the deciding one.
- **A deal with no recorded domain**: the two consequences lived twenty six lines apart (cannot be Strong on B2B, in the classification paragraph; never counts for the growth bonus, in the glossary). They are now joined in one sentence at the point of classification, with the reason (the growth bonus counts distinct genuinely new companies by domain). The public page footnote also gained the missing "a deal with no recorded paid seats yet is always Qualified" sentence.
- **Growth bonus counts distinct companies by domain (same company twice counts once)**: already CLEAR in the m03 glossary and the terms; unchanged.
- **Delivery normally the company's own**: already CLEAR on every surface; unchanged.
- **Classification derived objectively, confirmed by the company, never graded by the partner**: already CLEAR in m03 and the terms; the plain lesson body gained the one sentence it was missing ("decided by the paid and collected seat count, objectively from the recorded facts, never by opinion").

## The exam changes (counts unchanged, exactly one correct answer, no mutable number in any answer)

The investigation found the module exams essentially do not examine the commission mechanics: stacking and the clamp, the override boundary, and the no domain consequences had ZERO question coverage anywhere. Within the exam integrity rules (question counts unchanged), three redundant questions in m03 were repurposed into the three highest value untested boundaries. Each new question is structural (no config number in any option), has exactly one correct answer, and is answerable from the revised lesson text. The before and after of each is in the companion file.

1. **m03 exam question 3** (was "Why is the Partner Panel called the single source of truth?", a triple overlap with exercise 2 and exam question 1) is now the override boundary question: a same scope renewal versus a brand new branch, with the correct answer that the renewal can pay the override while the branch is a new registration and, when originated, a full new origination.
2. **m03 exam question 12** (was "Which single line best captures the Rules module?", a soft summary) is now the stacking and cap question: rates add past the cap, and the correct answer is that the total is clamped and the percentage lines scale down in proportion to fit exactly.
3. **m03 exercise 5** (was "For how long is a partner contract valid?", overlapping exam question 10 which asks the same fact about the program rules) is now the no domain question: always Qualified, and never counts toward the growth bonus.

The lesson's "How this maps to your exam" paragraph was updated to name the new topics honestly.

## Owner refinements applied in round two (still uncommitted)

Three wording refinements were applied on top of the first pass, on every surface at once:

1. **Basic Introduction, "valuable" made precise.** Everywhere Basic Introduction is defined (m02 plain and rich, m03 rate bullet AND the glossary, the terms, the public page card, the registration form, and the resubmit form), the reward test is now explicit: the relationship is genuinely valuable, meaning close and trusted, or real access we could not reach on our own; merely knowing someone, or a casual acquaintance, is not what the program rewards. The m03 glossary entry, which still called it "a light referral... a relevant contact" (the weakest definition anywhere), was rewritten to the full standard. The attestation, the step away boundary, the zero meetings and no follow-up, and the "still rewarded when valuable" encouragement are all kept. The public page card now also names the attestation.
2. **Closing, the meeting is a ceiling that may not be needed.** Every surface (public page card, m02 plain and rich, m03 rate bullet and the closing scenario, the terms, the reference generator, the registration form explainer, and the resubmit form label) now says our team contributes at most one online meeting of up to forty five minutes, and possibly not even that; the scenario adds "The meeting is a ceiling on our involvement, never a requirement," and its character closes with a thirty minute call, inside the ceiling. No surface anywhere still says "one short online meeting" or "under one hour" (verified by a repo wide sweep and pinned by the updated tests).
3. **Internationally neutral scenario names.** The worked scenarios now use Sara, David, and Alex.

## The cap and stacked functions: the fairness picture at the RAISED 28 percent B2C cap

(The original analysis at the 25 percent cap identified a real B2C wall; the owner decided to raise the B2C cap to 28 percent, the sum of the realistic full stack, and that change is built in this same working tree. This section is the reworked analysis at the new cap; the numbers were re-verified by running the engine itself.)

Live config after the change (percent of Net Receipts): B2C intro 5, qualified 10, strong 15, closing 5, delivery 8, cap 28; B2B intro 5, qualified 8, strong 12, closing 10, delivery 8, cap 30; growth bonus 1 (inside the cap, by decision); Tier 3 focus ceiling 35.

| Combination | Raw sum | Cap | Paid | Effective per line after scale down |
|---|---|---|---|---|
| B2C intro + closing + delivery | 18% | 28% | 18% | full rates |
| B2C qualified + closing + delivery | 23% | 28% | 23% | full rates |
| B2C strong + closing + delivery | 28% | 28% | 28% | full rates, exactly at the cap |
| B2C full stack + another partner's intro | 33% | 28% | 28% | 15 to 12.73, 5 to 4.24, 8 to 6.79, intro 5 to 4.24 |
| B2B qualified + closing + delivery | 26% | 30% | 26% | full rates |
| B2B strong + closing + delivery | 30% | 30% | 30% | full rates, exactly at the cap |
| B2B full stack + growth bonus | 31% | 30% | 30% | the 1% growth line nets zero extra |
| B2B full stack + own intro | 35% | 30% | 30% | the 5% intro line nets zero extra |

**What changed, plainly.**

- **The B2C wall is gone.** The realistic full stack (strong + closing + delivery = 28) now pays in full to the last line. The two painful marginals both became 100 percent: closing added after strong + delivery used to pay an effective 40 percent of its rate, and delivery added after strong + closing an effective 62.5 percent; both now pay their full rate. A rational B2C strong originator now has full incentive to also close and deliver.
- **The structure is symmetric with B2B.** On both sides the realistic single-partner full stack lands exactly on its cap and pays in full, and only a FURTHER line beyond it hits the ceiling: on B2C the fourth line (for example another partner's introduction, taking the deal to 33) nets that partner an effective 4.24 while diluting the full-stack partner from 28.00 to 23.76; on B2B the fourth line (an own intro, or the growth bonus) nets zero.
- **Unchanged and accepted:** the B2B picture is identical to the previous analysis (cap 30, focus 35 untouched); the growth bonus stays inside the cap by decision, so it still nets zero on a fully stacked B2B deal; and the per deal cap remains shared across all partners on the deal, which the new m03 worked example now teaches explicitly.

## Remaining audit findings, verified against the working tree first

- **(a) Closing wording mismatch across surfaces:** resolved by refinement 2 above. Verified: a repo wide grep finds zero occurrences of "under one hour" or "short online meeting" in any content bearing file, and all surfaces carry the identical forty five minute ceiling sentence.
- **(b) Growth Bonus not stated as B2B only on summary surfaces:** STILL OPEN before this round, FIXED NOW. The Academy glossary already said "genuinely new B2B organizations," but the public page Tier 2 card said only "a growth bonus." The card (and its generator mirror) now reads "a growth bonus on genuinely new B2B organisations."
- **(c) m03 glossary Basic Introduction weaker than the rest:** STILL OPEN before this round (the first clarity pass had not touched the glossary entry, which still said "a light referral... a relevant contact"), FIXED NOW by refinement 1: the glossary now carries the full definition with the genuinely valuable relationship test and the step away.
- **(d) Public page Basic Introduction omits the attestation:** STILL OPEN before this round, FIXED NOW: the card now says "attested as a real warm relationship" inside the new valuable relationship wording.
- **(e) Stale schema comment claiming the dollar thresholds decide Strong versus Qualified:** STILL OPEN (the comment above deliveryPercentBp/strongValueThreshold fields in prisma/schema.prisma said the high value thresholds "decide the Strong vs Qualified origination rate"), FIXED NOW: the comment states the dollar thresholds are retained for historical compatibility only and that current classification uses paid collected seats. Comment only; no schema field changed.

**Left as accepted, not re-raised:** the config publication architecture (public surfaces render from compile time defaults; the owner's standing rule is that any config change ships with a redeploy), and the hardcoded ninety day pilot wording (outside this pass; none of the passages edited here state the pilot length except through the config sourced `pilotDays` that the terms already use).

## The round two verification sweep (refute first, then fixed)

After the refinements, an independent two lens verification re-checked every surface and independently re-ran the ENGINE itself on the cap table's combinations (a script importing computeDealCommission with the live defaults confirmed every raw sum, paid total, and per line effective figure in the table above, and confirmed the three repurposed questions are answerable from the current lesson text with no mutable number in any option, all counts intact, and zero engine changes in the diff). The sweep caught four residuals, each fixed on the spot and re-verified: the generated complete reference document and its PDF were stale and have been regenerated from the updated generator; a schema doc comment on DealFunctionClaim still carried the old "one short online meeting" wording (comment only, rewritten); the resubmit form's explainer was missing the "not merely someone you know" exclusion (added); and the m03 glossary entry was missing the exclusion and the zero meetings, no follow-up, still rewarded elements (completed). The final repo wide sweep finds zero occurrences of "under one hour," "short online meeting," "someone you genuinely know," or "light referral" anywhere in content bearing files, including the regenerated reference document.

## Consistency and gates

- The revised wording was checked line by line against the deployed engine: the override trails only the same registered account (the engine looks up prior deals by the same registered account id, so a new registration can never trail an override); the clamp scales only percentage lines in proportion, cents exact; the growth bonus counts distinct new B2B domains rolling twelve months; Strong is decided on paid collected seats only. No engine code and no rate was touched.
- Every number in every revised passage renders from config (including the two "one below the threshold" scenario figures, computed as threshold minus one); no dashes anywhere; the encouraging tone is kept (the sharpest boundary is framed as good news: the branch pays MORE than the override).
- Gates after the changes: tsc clean, content dash lint clean, the full test suite passes (410 tests, 31 files), the content dump validates (17 modules, every exam bearing module still exactly 12 exam and 6 exercise questions, zero superseded rule remnants, every question with exactly one valid correct index), and the production build compiles.
- NOT committed, NOT deployed, and the academy content on the live site is untouched. When approved and deployed later, the narration system will automatically regenerate the audio for the changed lessons (the audio is keyed to the exact lesson text).

## Files changed in the working tree (for the eventual commit, after your review)

- `app/prisma/seed/academy/m03-rules.ts` (scale down arithmetic, paid collected definition, no domain sentence, override scope and contrast, seven scenarios with neutral names, plain lesson parity, exam map, three repurposed questions, BI value test in the rate bullet AND the glossary, the forty five minute closing ceiling)
- `app/prisma/seed/academy/m02-identity.ts` (same scope clause, BI value test and closing ceiling in the function tour, plain and rich)
- `app/prisma/seed/academy/m13-motions.ts` (same scope converse clause)
- `app/src/lib/partner/terms.ts` (same scope definition and converse; BI value test; closing ceiling)
- `app/src/app/(public)/partners/page.tsx` and `app/scripts/generate-partner-section.ts` (override card and footnote; BI card with attestation and value test; closing card ceiling; Tier 2 growth bonus marked B2B)
- `app/src/components/portal/partner-deal-form.tsx` and `deal-resubmit-form.tsx` (BI value test and closing ceiling in the claim explainers and label)
- `app/prisma/schema.prisma` (one stale comment rewritten: the dollar thresholds are retired, seats decide; no field changed)
- `app/tests/involvement-seat-redesign.test.ts` (two wording pins updated to the new closing ceiling)

The full revised text of every changed passage and question, with before and after, is in `docs/academy-commission-clarity-revisions.md`.
