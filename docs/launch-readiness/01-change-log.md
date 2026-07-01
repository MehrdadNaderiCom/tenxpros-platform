# Change Log: Partner Program Launch-Readiness Upgrade

Deliverable 1 of the launch-readiness set. Every content and code change in this program, by phase, feature, and module. Branch: `deployment/production-deployment-sprint-a`. All changes are additive; nothing was removed. Thirteen commits, `93cfb79` through `26863ad`.

## By commit

| Commit | Phase | Summary |
|---|---|---|
| 93cfb79 | 1 | Build-failing content dash lint (fails on U+2014/2013/2015/2212); U+2212 cleanup. |
| ae56ba2 | 2 | Additive data model (12 new tables, 6 enums, fields), one migration, applied to prod. |
| cc84885 | 3.1 to 3.2 | Account pipeline (7 stages) + activity log + lapse wiring; opportunity feedback, edit/resubmit (NEEDS_REVISION), threaded messages. |
| dc3911d | 3.1 to 3.2 | Review fix: deal-confirm audit log records the actual prior status. |
| fc36cd4 | 3.3 to 3.4 | Special-deal requests with per-item approval; Partner Toolkit repository (blog-style, file up/download). |
| d7d52e3 | 3.3 to 3.4 | Review fixes: super-admin gate on special-deal decisions; fixed admin non-existent-relation include. |
| a8f5445 | 3.5 to 3.6 | Discussion board with super-admin moderation; support section emailing the owner. |
| d84ea1d | 3.7 | Super-admin alumni management (groups, memberships, events); participant intro opt-in. |
| d150f73 | 4 | Credential field + specialization threaded through every credential surface. |
| ff78091 | 4 | Review fix: consistent gating (CERTIFIED, and public surfaces also require isPublic). |
| f615ef3 | 5 | Commission engine-derived rates (auto-rate by function, B2C/B2B split, strong-origination seat gate) + required evidence note. |
| 6ac9696 | 6.1 and 6.3 | 3 informational modules (15 to 17); exam-gate and unlock count only exam-bearing modules; module count updated to 17; public partners page + terms de-hardcoded from config. |
| 26863ad | 6.2 | Commission money passages in modules 2, 3, 13 (Net Receipts, caps with worked examples, pricing), all numbers config-interpolated. |

## By feature (Part 3, Partner Panel)

- **Account pipeline** (3.1): partner-driven 7-stage pipeline (Registered to Lost) + activity log; the previously unwired lapse cadence is now computed live from freshness. Files: `partner-portal.ts` (advanceAccountStage, logAccountActivity), `rules.ts` (accountLapseState), partner accounts list + detail, admin partner card.
- **Opportunity feedback loop** (3.2): admin requests revision (NEEDS_REVISION), partner edits and resubmits, threaded `DealMessage` conversation. Files: `partner-portal.ts`, `partner-admin.ts`, partner deal detail, admin deal-registrations.
- **Special-deal requests** (3.3): partner modal with individually-approvable out-of-rule items; super-admin decides each item and finalizes the request. Files: `partner-portal.ts`, `partner-admin.ts`, `/partner/special-deals`, `/admin/partners/special-deals`.
- **Partner Toolkit repository** (3.4): super-admin authors blog-style posts and uploads files; partners read and download; generic assets plus industry/role templates. Seeded starter content (section-26 templates verbatim from module 14, plus role templates). Files: `toolkit.ts`, `/admin/partners/toolkit`, `/partner/toolkit`, `/api/toolkit/files/[id]`.
- **Discussion board** (3.5): partner posts publish under their own name only after super-admin review and optional edit; comments after publish. XSS-safe (partner input escaped). Files: `discussions.ts`, `/partner/discussions`, `/admin/partners/discussions`.
- **Support** (3.6): partner tickets stored and emailed to the owner (mail@mehrdadnaderi.com). Files: `support.ts`, `/partner/support`, `/admin/partners/support`.
- **Alumni management** (3.7): super-admin groups/memberships/events; participant public and B2B intro opt-ins. Files: `alumni.ts`, `/admin/alumni`, participant portal profile.

## By area (Parts 4 to 6)

- **Credential (Part 4):** field + specialization on the certificate template, public verification page, its JSON API, dossier metadata, and the participant certification page; inputs on the admin decision form (defaults from application domain and dossier title); persisted in `decideCertification`; directory auto-create de-hardcoded.
- **Commission engine (Part 5, module 2 correctness):** `deriveFunctionRate` wires the config rates by function and deal kind; required evidence note; the admin add-line form previews the engine rate read-only. Historical lines are untouched (new lines only).
- **Content and de-hardcoding (Part 6):** modules 15 to 17 added; module count and gate updated; the module 5 count callout updated; commission money passages in modules 2, 3, 13 (config-interpolated); the public partners page and the terms text render every number from config.

## Deliverable reports (Part 5)

This launch-readiness set: change log (this file), coverage matrix, placeholder audit, numbers audit, credential audit, partner panel report, dash-lint report, Persian retranslation delta, and the go/no-go.
