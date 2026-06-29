# Partner Academy, Annual Terms, and Newsletter: Verification

This maps each item in the build specification to what was built and how it was
checked. Status is recorded against the live deployment at https://tenxpros.com
(host port 3003 behind Caddy).

## Deliverable A: Partner Academy

| Requirement | Built | Verified |
| --- | --- | --- |
| 14 learning modules, each a long-form lesson | `prisma/seed/academy/m01..m14`, seeded to `AcademyModule` / `AcademyLesson` | 14 published modules in the DB; content transcribed verbatim from the spec |
| Inline exercises, 3 attempts, never a dead end | `ExercisePlayer` + `recordExerciseAttempt`; engine `evaluateExerciseAttempt` reveals on correct or final attempt | `academy-engine.test.ts`; reveal-and-complete logic unit tested |
| One-sitting final exam, randomized draw, 80% pass | `startOrResumeExam` + `submitExam`; engine `selectExamQuestionIds`, `gradeSitting` | engine tests; `passMark`/`examSize` per module column |
| Shuffled options | engine `shuffleOptions` + `applyLayout`, stored per sitting | engine tests; source answer keys are often all-B by design, so the shuffle is what varies the displayed position |
| 24h cooldown on fail, fresh draw prioritizing unseen | `cooldownUntil` + `lockedUntil`; `selectExamQuestionIds` rotates unseen first | engine tests (`isInCooldown`, unseen-first selection) |
| Passing a module unlocks the next | `getAcademyOverview` unlock chain; exam pass sets `examPassed` and clears lock | engine `isModuleUnlocked`; live status reflects the chain |
| All 14 passed gives a verifiable badge (TXP-PA-YEAR-NNNNNN) | `PartnerAcademyBadge`; `academyBadgeSerial`; gate requires published-count == 14 and all passed | engine `academyBadgeSerial` test; public verify page renders |
| Downloadable completion certificate | `/partner/academy/certificate` with print-to-PDF | renders for badge holders; verify URL embedded |
| Public credential verification | `/academy/verify/[serial]` (no exam content) | live: returns the verification page (200) |
| Lesson text non-selectable, non-copyable, must not break assistive tech or audio | `LessonReader` suppresses selection/copy/contextmenu only; text stays in the DOM | screen readers and the audio reader read the same DOM text |
| Audio reader on every lesson (browser SpeechSynthesis) | `AudioReader` (play/pause/stop, speed, voice), keyboard operable | renders on the lesson page; no motion animated (reduced-motion safe) |
| Academy shell: landing, module list with live status, progress, resume | `/partner/academy` landing + `/partner/academy/[slug]` | live: 200; progress bar, status badges, resume button |

## Deliverable B: Annual validity and footer

| Requirement | Built | Verified |
| --- | --- | --- |
| Terms valid for the current calendar year, expire Dec 31, renewed through the site | `src/lib/terms/annual.ts` (`ANNUAL_VALIDITY`, `buildTermsVersionSeed`) | `terms-annual.test.ts`; live page shows "Validity for 2026" |
| Survival clauses outlast year end | `SURVIVAL_CLAUSES` (confidentiality, non-circumvention, non-solicitation, clawback, IP/customer ownership) | `terms-annual.test.ts`; live page shows "What survives year end" |
| Versioned terms page driven by TermsVersion (current year + changelog + archive) | `/terms/updates`, reads `TermsVersion`, archive of prior years | live: 200, current 2026 version, changelog, archive section |
| Footer "Terms and rules updates" section sitewide | `Footer` bottom band linking to `/terms/updates` | live: present on the homepage and across the site |

## Deliverable C: Newsletter

| Requirement | Built | Verified |
| --- | --- | --- |
| Homepage subscribe block | `NewsletterSignup` on `/` | live: "The TenXPros newsletter" block present |
| Dup-safe at DB + API; resubscribe / already-subscribed behavior | unique `email` column; `service.subscribe` returns subscribed / resubscribed / already / invalid | `newsletter-service.test.ts` (validation); behavior coded explicitly |
| One-click unsubscribe, retains email, flips status | `/newsletter/unsubscribe/[token]` + `unsubscribeByToken` | live: bad token returns "Link not recognized" (200) |
| Admin panel: subscribers, groups, campaigns | `/admin/newsletter` + actions | live: gated (redirects unauthenticated) |
| Reuse existing email infra (no second provider) | `safeSendEmail` + `newsletterCampaignEmail` template | uses the existing provider and `EmailEvent` recording |
| Per-recipient unsubscribe links | `sendCampaign` builds `absoluteUrl('/newsletter/unsubscribe/<token>')` per recipient | each send carries that recipient's token |
| Dedup union of groups + individuals minus unsubscribed | `resolveRecipients` (OR over group membership and ids, status = subscribed) | findMany returns distinct subscribed rows |

## Hard rules

- No em or en dashes in shipped content: swept across the whole feature diff; the
  integrity check and three test files assert it (`academy-content`, `terms-annual`,
  and the seed validator). Detection matches the two dash code points by their
  Unicode escapes (U+2014 and U+2013), so the source files themselves stay clean.
- No fabricated commercial terms: module 3 and the terms describe the commission,
  tiers, and clawback as structure; exact figures stay in `ProgramConfig` and the
  official terms.
- Conform to the existing codebase: same stack, auth (`getCurrentPartner` /
  `requirePartner` / `requireAdminUser`), email service, admin shell, and design
  tokens. No new heavy dependencies (the injected terms HTML is styled with pure
  Tailwind, not a typography plugin).
- Accessibility: keyboard-operable controls, visible focus, `aria-live` on the
  subscribe result, copy-protection that never blocks assistive tech or the audio
  reader.
- Verbatim content: all 14 modules were parsed deterministically from the
  specification, and every answer key was checked against the source.

## Gates

- `tsc --noEmit`: clean.
- `next lint`: no errors (pre-existing `<img>` warnings only).
- `vitest run`: 188 passed (engine, content integrity, newsletter, terms, plus the
  existing suite).
- `next build`: compiles; all new routes registered.
- Migration `20260629000000_partner_academy_terms_newsletter`: applied (additive,
  no destructive ops), verified in `_prisma_migrations`.

## Operating notes

- Reference content is seeded with `scripts/dump-content.ts` (host, validates) plus
  `scripts/seed-content.cjs` (container). The normal prisma seed refuses to run in
  production by design; that guard is for test data, not reference content.
