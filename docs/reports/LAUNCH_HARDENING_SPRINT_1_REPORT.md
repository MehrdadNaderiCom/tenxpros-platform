# TenXPros Launch Hardening Sprint 1 Report

Generated: 2026-05-16
Branch: `hardening/launch-readiness-sprint-1`
Base URL verified: `http://localhost:3003`

## 1. Baseline Status

Status: PASS from the actual Next.js package directory.

Notes:
- The root repo does not contain `package.json`, so `npm run lint` from `/opt/tenxpros` returns `ENOENT`.
- The application package lives in `app/`; baseline checks were rerun from `/opt/tenxpros/app` and passed before implementation.

Baseline commands:
- `git status`
- `git branch --show-current`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `npx prisma validate`

Baseline result:
- `lint`: PASS
- `typecheck`: PASS
- `build`: PASS
- `test`: PASS, 3 files / 7 tests
- `prisma validate`: PASS

## 2. What Was Implemented

### Playwright E2E Coverage

Added Playwright configuration and minimum E2E coverage:
- Public route smoke: `/`, `/pricing`, `/apply`, `/login`, `/api/health`
- Protected route smoke: unauthenticated `/admin` and `/portal` redirect to `/login`
- Application flow: `/apply` browser submission reaches thank-you page and creates `User` + `Application`
- Auth smoke: admin credentials login reaches `/admin`

Files:
- `app/playwright.config.ts`
- `app/tests/e2e/core-smoke.spec.ts`
- `app/package.json`
- `app/pnpm-lock.yaml`

### Dossier Submit Locking

Implemented participant edit rules:
- Editable: `DRAFT`, `REVIEWED`, `REVISED`
- Locked: `SUBMITTED`, `APPROVED`
- Submit for review sets `SUBMITTED`
- Submitted sections show: "This section is submitted for review."
- Submitted/approved sections render read-only for participants
- `Save draft` is disabled when locked
- Admin revision request sets `REVISED`, which reopens participant editing

Files:
- `app/src/lib/dossier.ts`
- `app/src/lib/actions/participant.ts`
- `app/src/components/participant/dossier-section-editor.tsx`
- `app/src/app/(participant)/portal/dossier/[section]/page.tsx`
- `app/tests/dossier-status.test.ts`

### Practical Dossier Autosave

Implemented practical autosave:
- Saves every 30 seconds while editing
- Saves on blur with a short debounce
- Shows last saved timestamp
- Avoids writes when content is unchanged or a save is already in flight

Browser evidence:
- `docs/reports/launch-hardening-sprint-1/screenshots/dossier-autosave-evidence.png`
- `docs/reports/launch-hardening-sprint-1/screenshots/dossier-submitted-locked.png`
- `docs/reports/launch-hardening-sprint-1/screenshots/dossier-revised-editable.png`

### Dossier Preview and Certificate

Implemented launch-safe print-ready output:
- Added `/portal/dossier/preview` for a full readable dossier view
- Added print/save-PDF browser action
- Added `/certificate/[id]` certificate page for certified participants
- On `CERTIFIED`, `CertificationReview.certificateUrl` is populated
- Certificate includes participant, credential title, certification date, badge verification reference, and TenXPros branding

Files:
- `app/src/app/(participant)/portal/dossier/preview/page.tsx`
- `app/src/app/(verify)/certificate/[id]/page.tsx`
- `app/src/components/shared/print-button.tsx`
- `app/src/lib/actions/admin.ts`
- `app/src/app/(participant)/portal/certification/page.tsx`

Browser evidence:
- `docs/reports/launch-hardening-sprint-1/screenshots/certificate-page.png`

### Lighthouse and Mobile QA

Captured mobile screenshots at 375px:
- Home
- Pricing
- Apply
- Participant dashboard
- Admin dashboard

Ran Lighthouse for:
- `/`
- `/pricing`
- `/apply`
- `/login`

### Production Env Check

Added:
- `npm run launch:env-check`

The command checks required env var presence without printing secret values.

Files:
- `app/scripts/check-launch-env.mjs`
- `app/package.json`

## 3. Intentionally Deferred

- Full binary PDF generation with persistent file storage.
- Full lifecycle Playwright E2E from application through certification and badge verification.
- Stripe Checkout/webhooks.
- Inline dossier annotations.
- UI redesign or visual template polish.
- Production Resend/domain/DNS/SSL/backups/monitoring setup.

## 4. Commands Run

```bash
git status
git branch --show-current
npm run lint
npm run typecheck
npm run build
npm run test
npx prisma validate
pnpm add -D @playwright/test
docker compose up -d --build
curl -fsS http://localhost:3003/api/health
DATABASE_URL=postgresql://tenxpros:tenxpros_dev@localhost:5433/tenxpros E2E_BASE_URL=http://localhost:3003 npm run test:e2e
npm run launch:env-check
CHROME_PATH=/home/ubuntu/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome npx --yes lighthouse@12 http://localhost:3003/ --quiet --chrome-flags="--headless --no-sandbox --disable-gpu" --only-categories=performance,accessibility,seo --output=json --output-path=../docs/reports/launch-hardening-sprint-1/lighthouse/home.json
```

Additional Lighthouse runs were executed for `/pricing`, `/apply`, and `/login`.

## 5. Test Results

Final validation:
- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run test`: PASS, 4 files / 12 tests
- `npx prisma validate`: PASS
- `docker compose up -d --build`: PASS
- `curl -fsS http://localhost:3003/api/health`: PASS, `{"ok":true}`
- `npm run test:e2e`: PASS, 4 Playwright tests
- Docker health: PASS

Known build warning:
- Docker `next build` still reports the existing Auth.js/jose Edge Runtime warning for `CompressionStream`/`DecompressionStream`; build exits successfully.

Production env check:
- `npm run launch:env-check`: FAIL for current local env because required production values are missing.
- Missing values include auth secrets/URLs, email provider/from address, public app URL, and Stripe Payment Links.
- No secret values were printed.

## 6. Lighthouse Results

| Route | Performance | Accessibility | SEO | Evidence |
| --- | ---: | ---: | ---: | --- |
| `/` | 97 | 95 | 100 | `docs/reports/launch-hardening-sprint-1/lighthouse/home.json` |
| `/pricing` | 92 | 98 | 100 | `docs/reports/launch-hardening-sprint-1/lighthouse/pricing.json` |
| `/apply` | 86 | 100 | 100 | `docs/reports/launch-hardening-sprint-1/lighthouse/apply.json` |
| `/login` | 99 | 100 | 100 | `docs/reports/launch-hardening-sprint-1/lighthouse/login.json` |

All requested Lighthouse targets were met in local Docker.

## 7. Screenshots List

- `docs/reports/launch-hardening-sprint-1/screenshots/mobile-home.png`
- `docs/reports/launch-hardening-sprint-1/screenshots/mobile-pricing.png`
- `docs/reports/launch-hardening-sprint-1/screenshots/mobile-apply.png`
- `docs/reports/launch-hardening-sprint-1/screenshots/mobile-participant-dashboard.png`
- `docs/reports/launch-hardening-sprint-1/screenshots/mobile-admin-dashboard.png`
- `docs/reports/launch-hardening-sprint-1/screenshots/dossier-autosave-evidence.png`
- `docs/reports/launch-hardening-sprint-1/screenshots/dossier-submitted-locked.png`
- `docs/reports/launch-hardening-sprint-1/screenshots/dossier-revised-editable.png`
- `docs/reports/launch-hardening-sprint-1/screenshots/certificate-page.png`

## 8. Remaining Launch Blockers

- Configure real production env values for auth, app URLs, email, and Stripe Payment Links.
- Configure Resend sender domain/SPF/DKIM/DMARC and verify real email delivery.
- Configure production database, backups, monitoring, DNS, SSL, and hardened admin creation.
- Decide whether print-ready certificate/dossier output is sufficient for launch, or add true generated PDF storage before launch.

## 9. Is The System Closer To Production Launch?

Yes.

The sprint closes three acceptance limitations:
- Browser E2E now exists for critical public/auth/application paths.
- Dossier sections lock after submit and reopen on admin revision.
- Practical autosave is implemented and browser-verified.

It also adds production-readiness checks, mobile/Lighthouse evidence, and a certificate page/reference for certified outcomes.

## 10. Recommended Next Sprint

- Add full lifecycle Playwright E2E: apply → admin accept → enroll → participant portal → dossier/module/ticket/certification → badge verify.
- Replace print-ready certificate/dossier output with generated PDF files if launch requires downloadable files independent of browser print.
- Complete production env provisioning and run `npm run launch:env-check` against the real deployment env.
- Verify real Resend delivery and manual Stripe Payment Links end to end.
- Add production observability: error logging, uptime checks, backup verification, and deployment rollback notes.
