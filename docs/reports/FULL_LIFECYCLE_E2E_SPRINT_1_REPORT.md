# TenXPros Full Lifecycle E2E Sprint 1 Report

Generated: 2026-05-16
Branch: `testing/full-lifecycle-e2e-sprint-1`
Base URL verified: `http://localhost:3003`

## 1. Baseline Status

Status: PASS from the Next.js package directory, `app/`.

Baseline commands:
- `git status`
- `git branch --show-current`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `npx prisma validate`
- `npm run test:e2e`
- `npm run launch:env-check -- --mode local`
- `docker compose up -d --build`
- `curl -fsS http://localhost:3003/api/health`

Baseline result:
- `lint`: PASS
- `typecheck`: PASS
- `build`: PASS
- `test`: PASS, 4 files / 12 tests
- `prisma validate`: PASS
- `test:e2e`: PASS, 4 Playwright smoke tests before this sprint
- `launch:env-check -- --mode local`: PASS
- Docker health: PASS, `{"ok":true}`

## 2. What Was Implemented

Added a full browser-level Playwright lifecycle test:
- `app/tests/e2e/full-lifecycle.spec.ts`

Added a focused npm script:
- `npm run test:e2e:full`

The test:
- Uses unique `e2e.full.lifecycle.*@tenxpros.test` applicant emails.
- Upserts required local launch catalog records for repeatability.
- Preserves seed admin and global seed data.
- Writes screenshots and machine-readable lifecycle evidence.
- Avoids fixed previous acceptance users.

## 3. Test Flow Covered

Covered end to end:
- Public `/apply` browser submission.
- Application record and applicant user creation.
- Admin login.
- Admin application acceptance.
- Payment placeholder creation.
- Manual payment received/enrollment.
- Participant password setup.
- Participant login.
- Starter Pack completion.
- Diagnostic Intake submission.
- Admin diagnostic/path approval.
- Module start, artifact submission, admin pass review, and module badge issuance.
- Dossier section draft save, submit, lock-after-submit, admin section-level approval, and participant feedback visibility.
- Ticket creation, admin response, resolution, and participant thread verification.
- Certification decision as `CERTIFIED`.
- Capstone badge issuance.
- Public `/verify/[code]` badge verification page.

## 4. Screenshots List

Saved under `docs/reports/full-lifecycle-e2e-sprint-1/screenshots/`:

- `01-application-submitted-thank-you-page.png`
- `02-admin-application-detail-enrolled-state.png`
- `03-participant-dashboard-after-login.png`
- `04-diagnostic-submitted-state.png`
- `05-module-submitted-state.png`
- `06-module-passed-state.png`
- `07-dossier-submitted-locked-state.png`
- `08-admin-dossier-review-state.png`
- `09-ticket-resolved-state.png`
- `10-certification-status-page.png`
- `11-public-badge-verification-page.png`

## 5. Machine-Readable Evidence

Saved:
- `docs/reports/full-lifecycle-e2e-sprint-1/full-lifecycle-results.json`

Latest evidence summary:

```json
{
  "applicantEmail": "e2e.full.lifecycle.1778901558678-xg2xyg@tenxpros.test",
  "applicationId": "cmp7s24m200bdhkwu2akz00ti",
  "participantId": "cmp7s26bp00bkhkwutwwsbc3m",
  "moduleStatus": "PASSED",
  "dossierSectionStatus": "APPROVED",
  "ticketStatus": "RESOLVED",
  "certificationOutcome": "CERTIFIED",
  "badgeVerificationCode": "cmp7s2fyg00d3hkwuaxhcmcql",
  "finalPass": true
}
```

## 6. Commands Run

```bash
git status
git branch --show-current
```

```bash
cd app
npm run lint
npm run typecheck
npm run build
npm run test
npx prisma validate
npm run test:e2e
npm run test:e2e:full
npm run launch:env-check -- --mode local
```

```bash
DATABASE_URL=postgresql://tenxpros:tenxpros_dev@localhost:5433/tenxpros \
E2E_BASE_URL=http://localhost:3003 \
npm run test:e2e:full
```

```bash
docker compose up -d --build
curl -fsS http://localhost:3003/api/health
```

## 7. Check Results

Final validation:
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run test`: PASS, 4 files / 12 tests
- `npx prisma validate`: PASS
- `npm run test:e2e`: PASS, 5 Playwright tests including full lifecycle
- `npm run test:e2e:full`: PASS, 1 full lifecycle test
- `npm run launch:env-check -- --mode local`: PASS
- `docker compose up -d --build`: PASS
- `curl -fsS http://localhost:3003/api/health`: PASS, `{"ok":true}`

Warnings:
- Docker `next build` still reports the known Auth.js/jose Edge Runtime warning for `CompressionStream` and `DecompressionStream`; build exits successfully.
- Prisma install in the Docker dependency stage printed an OpenSSL detection warning before the build stage generated Prisma with OpenSSL installed; Docker build completed successfully.
- The first immediate Docker health curl after container recreation hit a transient connection reset while the app was starting. A retry passed with `{"ok":true}`.

## 8. Known Limitations

- The full lifecycle test is local/Docker oriented and expects the app at `http://localhost:3003`.
- The test writes local evidence and leaves marked test users with `e2e.full.lifecycle.*@tenxpros.test` emails for auditability.
- It uses database checks for durable IDs and final statuses while driving the lifecycle through browser UI.
- It does not run against production and does not verify real Resend delivery or real Stripe payment completion.
- It does not implement Stripe Checkout/webhooks or inline dossier annotations.

## 9. Product Issues Discovered

No new product blocker was discovered.

Test-hardening fixes made inside the E2E layer:
- The diagnostic admin assertion now checks the participant name and complete status because the diagnostics list shows the participant display name, not necessarily the email.
- The Dossier draft-save proof uses durable autosave/DB evidence instead of a transient UI message.
- The ticket flow now reads the created ticket by unique subject instead of matching the `/portal/tickets/new` URL.

## 10. Recommendation For Next Sprint

- Keep this full lifecycle test as the release-gate E2E for local acceptance.
- Add a smaller production-safe smoke suite that can run against deployed staging without mutating production data.
- Decide whether the full lifecycle should be split into smaller serial tests if runtime becomes an issue in CI.
- Add CI wiring for `npm run test:e2e` and `npm run test:e2e:full` once the GitHub Actions environment has Docker/PostgreSQL ready.
