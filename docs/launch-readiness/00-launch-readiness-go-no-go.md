# Launch-Readiness: Go / No-Go

Deliverable 8 (the decision). This is the explicit go/no-go for publicly inviting partners into the TenXPros Partner Program, based on the audits in this folder.

## Verdict: CONDITIONAL GO

The partner program **systems** are launch-ready. There is **one content blocker** to clear before the public invite, plus two operational steps, and a body of deferred editorial polish that is explicitly non-blocking.

- **Systems (GO):** the Partner Panel and its seven new features, the commission engine, the credential, the exam gate and module count, the de-hardcoded numbers, and the commission money content are complete, adversarially reviewed each phase, and green (tsc, dash lint, 236 tests, build).
- **One content blocker:** module 12 ships nine visible `[CONFIRM: ...]` placeholders. Resolve before opening the academy to partners.
- **Operational:** deploy the code, then run the content seed (in that order).
- **Persian:** owner-owned, non-blocking for the English launch.

## What is shippable now (done, reviewed, green)

| Area | Status |
|---|---|
| Build-failing dash lint | Enforced on every build. |
| Additive data model + migration | Applied to the production database; zero destructive ops. |
| Account pipeline + activity + lapse wiring | Done. |
| Opportunity feedback / resubmit / threading | Done. |
| Special-deal requests with per-item approval | Done. |
| Partner Toolkit repository (+ seeded starter content) | Done. |
| Discussion board with super-admin moderation (XSS-safe) | Done. |
| Support section (emails the owner) | Done. |
| Alumni management + participant intro opt-in | Done. |
| Credential field + specialization on all 7 surfaces | Done (audit: all PASS). |
| Commission engine-derived rates + required evidence note | Done (no hand-typed rate survives; historical lines untouched). |
| 3 informational modules + exam-gate/count wiring | Done (gate counts only exam-bearing modules). |
| De-hardcoded numbers (partners page + terms) | Done (audit: PASS). |
| Commission money content (modules 2, 3, 13) | Done (owner-approved wording, config-sourced). |
| Exam-to-lesson coverage | 168 of 168 exam questions covered (audit). |

Each phase was checked by an independent three-lens adversarial review with a second-agent verification pass; nine real defects were found across the program and fixed (a deal-confirm audit-log bug, a super-admin gate and a runtime-crash include on special deals, and four credential gating inconsistencies, among others).

## The one content blocker

**Module 12 (`prisma/seed/academy/m12-mechanics.ts`) contains nine unfilled `[CONFIRM: ...]` operational placeholders** (program format, weekly hours, enrollment model, support and coaching model, deadline and extension policy, required tools, review turnaround, alumni benefit). A partner would read literal author-notes such as "The program is delivered as [CONFIRM: state the format ...]". This is pre-existing content that the audit surfaced. It is a visible placeholder in exam-bearing content and should not ship to partners.

Two honest resolution paths, neither of which invents a fact:
1. The owner supplies the current official operational values, and they are filled in; or
2. The passages are reworded to remove the markers and instruct the partner to quote the current official answer from the Panel or the official program details (the module already teaches exactly this discipline).

This blocks opening the **academy** to partners. It does not affect the Partner Panel, commission, or credential systems, which are clean.

## Operational steps before the invite

1. **Deploy the code** (the current branch). The commission engine, credential, de-hardcoded numbers, and gate logic go live on deploy.
2. **Run the content seed after the deploy** (`dump-content.ts` then `seed-content.cjs`) to publish the three informational modules and the money content. This order matters: seeding the informational modules under the old code would break the live final-exam gate.
3. **Regenerate the Persian package** from the delta list (owner-owned; see report 08).

## Deferred, non-blocking editorial revisions (known, not done)

The deeper editorial revisions from the original brief were consciously dropped when we chose to move faster on features and money correctness. They are quality and depth improvements, not correctness, safety, or honesty issues, and none blocks launch. Listed so the remaining editorial pass is visible:

- **M1 (Mission):** add an ideal-customer-profile profession list and a short "where not to prospect and forbidden channels" section (referencing modules 3 and 9).
- **M2 (Identity):** expand the function definitions with explicit objective standards and required evidence in the prose; remove the misplaced "I already bought a contact list" objection (it belongs in module 9). The engine enforcement and the Net Receipts content are done.
- **M3 (Rules):** add a plain-language glossary (house accounts and other terms) and significantly expand the tier explanations. Rates, caps, payment, and the special-deal path are done.
- **M4 (What TenXPros is):** reframe as guided AND selective; broaden the stated audience (seniors and independent experts) with a concrete list; add varied examples of the four phases.
- **M5 (The twelve-week journey):** deep week-by-week detail carried through named personas; the participant facilities (feedback, consultations, customized work); change every "do not say X" to "do not say X unless you have valid, verified data."
- **M6 (Ranks and badges):** expand for clarity.
- **M7 (Coach):** remove the two text-only form-previews; make explicit that a coach coaches in their own field.
- **M8 (Selling with integrity):** a bit longer; the program's differentiators and the website facilities.
- **M9 (Prospecting):** reduce repetition; correct the too-absolute "no strangers" framing; vary or remove the repeated "will I get certified" objection.
- **M10 (Outreach):** make the anti-poaching rule explicit and serious (do not approach another partner's prospect, with consequences); reduce and reframe the "10x" repetition. The opportunity-feedback feature is done.
- **M11 (Operating the system):** enrich and align the lesson to the now-built pipeline stages. The pipeline feature is done.
- **M12 (How the twelve weeks work):** after the placeholders are resolved, sharpen the distinction from module 5 and remove repetition.
- **M14 (Customizing):** add the monthly-visit recommendation for the Partner Toolkit and slightly expand. The toolkit feature is done and module 14 already references it.
- **Placeholder polish:** convert the four text-only form-preview frames (modules 6, 7 x2, 14) to real screenshots or plain descriptive prose.

## Bottom line

Invite-ready once (a) module 12's placeholders are resolved and (b) the code is deployed and the content seeded, in that order. The systems are done and verified; the remaining editorial revisions are a separate, non-blocking pass to schedule when convenient.
