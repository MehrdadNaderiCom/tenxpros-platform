# Final report: the 28 percent B2C cap, the commission clarity content, and the server narration, deployed together and audited live

This is the complete record of the combined deploy of 2026-07-04 and the exhaustive audit of the whole partner system against the LIVE deployed state that followed it. Three sets shipped together, each built, gated, and adversarially reviewed beforehand: the owner-approved raise of the B2C per-deal cap from 25 to 28 percent, the Academy commission clarity content (two owner-refined rounds), and the server-generated narration system (whose code was already live; its content re-baked in this deploy for the changed lessons).

Everything was built additively (no column, config key, or enum value dropped), every commercial number renders from the config source of truth, no dashes appear anywhere, exam integrity held (unchanged question counts, exactly one correct answer, answerable from the taught text, no mutable number as an answer), and this report states plainly what was verified and how.

---

## 1. What is now live, in plain language

**The cap.** The B2C per-deal cap is 28 percent of Net Receipts, chosen so the realistic B2C full stack (strong origination 15, closing 5, delivery 8) pays in full, to the last line. This was the ONLY commercial number that changed: the B2B cap stays 30 percent, the Tier 3 focus ceiling stays 35 percent, the growth bonus stays inside the cap, and every rate and threshold is untouched. Functions stack; a total above the cap scales down in proportion, cents-exact; the cap is shared across every partner on a deal. The old B2C wall is gone: closing added after strong and delivery, and delivery added after strong and closing, both now pay their full rate, and the structure is symmetric with B2B, where the realistic full stack also lands exactly on its own cap. Only a FURTHER line beyond the full stack now meets the ceiling.

**The teaching.** The Academy, the terms, the public page, the reference document, and the registration forms tell one story: the worked cap example in the Rules module shows the full stack landing exactly on 28 and paying in full, then a basic introduction by another partner taking the deal to 33 and every line scaling by 28 over 33 (12.73, 4.24, 6.79, 4.24, landing exactly on 28); seven realistic scenarios settle the involvement and seat boundaries; the Renewal Override is defined as same-scope only (the same organisation and the same unit under the same domain; a new branch, department, unit, country, affiliate, or parent is a new registration and a full new origination, framed as good news since the full rate exceeds the override share); a Basic Introduction is rewarded only for a genuinely valuable relationship (close and trusted, or real access we could not reach ourselves, never merely knowing someone), attested, with the partner stepping away at zero meetings; the closing meeting is a ceiling of at most one online meeting of up to forty five minutes, and possibly not even that; paid-and-collected seats are defined in place; the no-domain consequences (never Strong on B2B, never counted for the growth bonus) sit in one sentence; and three previously redundant Rules-module questions now examine the same-scope override boundary, the stacking-and-cap clamp, and the no-domain consequences.

**The narration.** Every lesson speaks in three curated public-domain voices (Bryce, Linda, Cori) generated on the server, and after this deploy every one of the 51 audio rows is fresh against the exact current lesson text, including the three modules whose lessons changed.

## 2. The deploy record (the same safe order as every prior deploy)

1. **Gates re-run from a clean state before committing:** tsc clean, content dash lint clean, the full suite (412 tests, 31 files) passing, the content dump validating (12 exam + 6 exercise per module, zero superseded-rule remnants), and the production build compiling.
2. **Three separated, self-describing commits:** `a73f0dd` the commission clarity content (with the cap-dependent portions of the two mixed files cleanly excluded and committed with the cap instead); `cdb77aa` the cap raise, including migration `20260706090000_raise_b2c_cap` (the schema default change plus the guarded, idempotent update of the live singleton row); `ccc8976` the documents (review packages, plans, reports, dated addenda, and the regenerated reference document and PDF).
3. **Image built from the committed tree; hash-check 16 of 16:** every changed file matches HEAD by sha256 inside the image.
4. **Container recreated; the migration ran on start.** Verified the critical fact directly: the LIVE ProgramConfig row, the row the engine pays from, now reads `capB2cBp = 2800` with `updatedBy = 'migration: raise B2C cap to 28 percent'`, while `capB2bBp` stays 3000 and the focus ceiling 3500. Migration history advanced 27 to 28 with zero rollbacks; zero data loss (2 partners, 6 users, 51 narration rows, all counts unchanged).
5. **Academy content reseeded** (17 modules, 1 terms record, 2 groups). Verified live: the 28 percent cap taught with the new worked example, the seven scenarios, the same-scope override, the valuable-relationship test, and the forty-five-minute ceiling all present in the live rows; 168 exam and 84 exercise questions (14 x 12 + 14 x 6) intact; the two repurposed boundary questions live; ZERO superseded rules in any live lesson or question (no 25 percent cap, no dollar thresholds, no under-one-hour or short-online-meeting closing).
6. **Narration re-baked for the changed lessons.** The reseed made 9 rows stale (identity, rules, motions, times three voices); the regeneration ran to completion (51 of 51, zero failures; the Rules lesson now runs about 37 minutes of audio in Bryce), and a hash check across all 51 rows confirms every row fresh against the current text.
7. **Health checks across the host:** the app healthy, the database accepting connections, all 15 containers across tenxpros, tenxops, tenxrole, and mn-ai-exam up, and all three public domains answering 200 through the proxy.
8. **Pushed only after everything above was green:** `7380c5d..ccc8976` to origin.

## 3. The live engine proof (the heart of this deploy)

Nine critical suites were re-run INSIDE the deployed container (195 passing, 2 host-only pins skipped by design). Then, separately, the deployed engine was exercised through `resolvePartnerConfig`, which reads the LIVE database row rather than any compile-time default, and it proved the exact behavior the owner approved:

- resolved `capB2cBp` from the live DB: **2800**
- the realistic full stack (strong + closing + delivery on a 20,000 dollar net): **uncapped, pays exactly 5,600 dollars in full**
- the 33 percent two-partner stack: **capped at exactly 5,600 dollars**, with the cents-exact per-line amounts 2,545.46 / 848.48 / 1,357.58 / 848.48, matching the taught 12.73 / 4.24 / 6.79 / 4.24 to the cent.

The engine and the published story agree because they read the same numbers.

## 4. The exhaustive final live audit

A three-lens refute-first audit ran against the live state itself (the deployed engine and money safety at the new cap; the surfaces and the taught story at 28; the narration and the partner flows, including a real minted session exercising the audio endpoints and the iOS Range contract through the public proxy), followed by a synthesis pass that re-checks every raw finding against the live state.

AUDIT RESULT: recorded in section 6 below.

## 5. Every adversarial round in this cycle, for the record

1. Clarity build review (three-lens map of lessons, exams, terms/page against the engine): drove the content work; no code defects.
2. Clarity round-two verification: caught four residuals (stale reference document and PDF, a schema doc comment, a missing exclusion clause on the resubmit form, an incomplete glossary entry), all fixed and re-verified.
3. Cap-raise inventory hunt: confirmed the site list complete and flagged the smallPayoutThresholdCents decoy (also 2500) that a bulk replace would have silently corrupted; no bulk replace was ever run.
4. Cap-raise Phase 2 review (three lenses, including an independent engine re-run of the fairness table): the config-and-migration lens returned zero findings; two documentation-only minors (a fourth-versus-fifth line miscount and a 62-versus-62.5 percent truncation) were fixed across all three documents and re-verified.
5. The final live audit after the deploy: section 6.

## 6. The final live audit result

**Two of the three lenses returned ZERO findings.**

- **Surfaces and the story (zero findings):** the live public page and terms (checked on localhost and through https://tenxpros.com) publish the 28 percent B2C cap in the table and the prose, the stacking and proportional scale-down, the seat story, the valuable-relationship test with the attestation, the forty-five-minute closing ceiling, and the same-scope override with the new-branch converse; every live lesson and question was checked and carries the new worked example, the seven scenarios, and the boundary teachings, with 12 exam and 6 exercise questions per module, exactly one valid correct answer each, the three repurposed questions answerable from the live lesson text, zero superseded rules anywhere, no dashes, and every number matching the live config row.
- **Narration and the flows (zero findings):** all 51 audio rows fresh against the current lesson text (17 lessons times three voices, including the regenerated identity, rules, and motions); a real minted partner session confirmed three ready voices with correct durations on an unlocked module, the full iOS Range contract (the two-byte probe, open-ended and suffix ranges, 416) honored on localhost AND through the public proxy, a locked module answering 403, and unauthenticated requests answering 401; the deployed registration form carries the value test and the closing ceiling, the SLA figure matches the live config row, and the notification senders are wired in the deployed actions.
- **Engine and money (one CONFIRMED minor, fixed on the spot):** the lens independently re-proved the deployed engine against the LIVE row (cap 2800 resolved from the database; the 28 percent stack paying in full; the 33 percent stack clamping cents-exact; the B2B picture unchanged; the override, growth-bonus, seat-source, override-consult, and duplicate-guard rules all holding; migration history clean; per-partner overrides absent). Its one finding was an audit-trail cosmetic: the migration's raw UPDATE set `updatedBy` but not `updatedAt` (Prisma's `@updatedAt` is client-managed and bypassed by raw SQL), so the row claimed the cap raise happened on the row's previous edit date. No money impact (the engine reads the value, not the timestamp). Fixed immediately with a guarded, idempotent statement that set `updatedAt` to the migration's actual finish time, and verified: the row now reads `capB2cBp = 2800, updatedBy = 'migration: raise B2C cap to 28 percent', updatedAt = 2026-07-04 00:01:51`. The rule for the future is recorded: a raw-SQL data migration that touches a Prisma-managed row must set `updatedAt` explicitly.

After that fix, the audit stands at zero open findings.

## 7. How we know the whole system is correct

- The engine enforces every rule (it was re-exercised through the live database row after the deploy, not just through compile-time defaults), and 195 tests of the nine critical suites pass inside the deployed container, including the two new pins that hold the at-cap identity and the cents-exact scale-down against the engine.
- Every surface teaches the same rules with the same config-sourced numbers, verified in the live database and on the live pages after the reseed, with zero superseded rules anywhere.
- The narration speaks the current text of every lesson in all three voices, verified by hash across all 51 rows.
- Five adversarial rounds across this cycle each tried to refute the work, every confirmed finding was fixed and re-verified, and the final sweep against the live state closed at zero.
