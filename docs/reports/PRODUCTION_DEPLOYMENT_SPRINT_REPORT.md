# TenXPros Production Deployment Sprint Report

Generated: 2026-05-16
Branch: `deployment/production-deployment-sprint-a`

## 1. Baseline Status

Status: PASS.

Baseline commands from `app/`:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test`
- `npx prisma validate`
- `npm run test:e2e`
- `npm run test:e2e:full`
- `npm run launch:env-check -- --mode local`

Baseline commands from repo root:

- `docker compose up -d --build`
- `curl -fsS http://localhost:3003/api/health`

Baseline results:

- `lint`: PASS
- `typecheck`: PASS
- `build`: PASS
- `test`: PASS, 4 files / 12 tests
- `prisma validate`: PASS
- `test:e2e`: PASS, 5 Playwright tests
- `test:e2e:full`: PASS
- `launch:env-check -- --mode local`: PASS
- Docker build/start: PASS
- Docker health: PASS after one startup-race retry, `{"ok":true}`

## 2. Deployment Target Recommendation

Recommendation: Vercel is the best default target for the current TenXPros codebase.

Reason:

- TenXPros is a standard Next.js 14 App Router app under `app/`.
- Vercel supports the app shape without custom container orchestration.
- The application already externalizes state through PostgreSQL, Prisma, Auth.js, Resend, and Stripe Payment Links.
- The current launch risk is operational configuration, not hosting complexity.

Created:

- `docs/deployment/DEPLOYMENT_TARGET_DECISION.md`

Required Vercel settings:

- Project root: `app`
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output: Vercel-managed Next.js output
- Node.js: 20 or newer
- Env vars: configure all required production vars in Vercel, not committed files

Docker remains a valid alternative if the founder wants a containerized deployment platform or needs deeper runtime control later.

## 3. Environment Check Results

### Local Mode

Command:

```bash
npm run launch:env-check -- --mode local
```

Result: PASS.

Expected local warnings:

- Local mode is for Docker/development acceptance only.
- Several production-only variables are optional/missing in local mode.

### Production Mode

Command:

```bash
npm run launch:env-check -- --mode production
```

Result: FAIL, expected in this local environment.

The check did not print secret values. It reported these missing or invalid production requirements:

- `NEXT_PUBLIC_APP_URL`
- `AUTH_SECRET`
- `NEXTAUTH_SECRET`
- `AUTH_URL`
- `NEXTAUTH_URL`
- production `DATABASE_URL`
- `EMAIL_PROVIDER`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `STRIPE_PAYMENT_LINK_FOUNDING`
- `STRIPE_PAYMENT_LINK_EARLY`
- `STRIPE_PAYMENT_LINK_LATE`
- `STRIPE_PAYMENT_LINK_FINAL`
- `STRIPE_PAYMENT_LINK_STANDARD`

Production mode also rejected the local Docker database URL as expected because it is not a production PostgreSQL database.

## 4. Database Migration Readiness

Migration files exist:

- `app/prisma/migrations/20260515151151_init/migration.sql`
- `app/prisma/migrations/migration_lock.toml`

Validated production migration command:

```bash
cd app
npx prisma migrate deploy
```

Safe local/staging run:

```bash
DATABASE_URL=postgresql://tenxpros:tenxpros_dev@localhost:5433/tenxpros npx prisma migrate deploy
```

Result: PASS, no pending migrations to apply.

Production guidance:

- Run `npx prisma migrate deploy` only after production `DATABASE_URL` is intentionally configured.
- Do not run `npx prisma migrate dev` in production.
- Do not run `npm run db:seed` or `prisma/seed.ts` in production.
- `prisma/seed.ts` refuses `NODE_ENV=production`, and production should still treat seed as forbidden.

## 5. Resend Readiness

Updated:

- `docs/deployment/RESEND_SETUP.md`

Added launch details:

- DNS record categories to copy exactly from Resend.
- SPF/DKIM/DMARC reminder.
- `EMAIL_FROM` verification guidance.
- Test path for `application_received`.
- Test path for accepted/payment-link email.
- Console mode guidance for local development.

No real Resend credentials were added.
No real email was sent.

## 6. Stripe Payment Links Readiness

Updated:

- `docs/deployment/STRIPE_PAYMENT_LINKS.md`

Added launch details:

- Exact five tiers and prices remain documented.
- Recommended Stripe product names.
- Recommended Stripe price labels.
- Suggested Payment Link page copy.
- Manual enrollment workflow reminder.
- Real accepted-applicant test workflow.
- Explicit reminder that Stripe Checkout/webhooks remain out of current launch scope.

No Stripe automation was implemented.
No real payment links were committed.

## 7. Smoke Test Result

Updated:

- `app/scripts/launch-smoke.mjs`

Improvement:

- Network/fetch failures now produce clear route-level FAIL output and non-zero exit instead of an unstructured crash.
- Existing support for `--base-url` and optional `--verify-code` remains.
- The script remains read-only and does not mutate production data.

Local command:

```bash
npm run launch:smoke -- --base-url http://localhost:3003
```

Result: PASS.

Verified:

- `/`
- `/apply`
- `/pricing`
- `/login`
- `/api/health`
- unauthenticated `/admin` redirects to `/login`
- unauthenticated `/portal` redirects to `/login`

Warning:

- `/verify/[code]` was skipped because no `--verify-code` or `LAUNCH_SMOKE_VERIFY_CODE` was provided.

## 8. Rollback Notes Summary

Created:

- `docs/deployment/ROLLBACK_PLAN.md`

The rollback plan includes:

- last known good tags
- Vercel rollback steps
- Docker/other-host rollback steps
- database rollback posture
- warning that database rollback is not automatic
- what to do if deployment fails after migration
- solo-founder escalation notes

## 9. Actual Deployment

Actual production deployment was not performed.

Reason:

- No production domain was configured in this environment.
- No production PostgreSQL `DATABASE_URL` was configured and explicitly approved for migration.
- Required production auth secrets/URLs were missing.
- Resend production credentials and verified sender domain were missing.
- Stripe Payment Links were missing.
- Production admin bootstrap values/process were not ready for safe execution.

This sprint prepared and verified the deployment path, but stopped before production deployment as required.

## 10. Remaining Production Blockers

- Configure production hosting project.
- Configure production domain, DNS, and SSL.
- Configure production PostgreSQL and backups.
- Configure all production auth secrets and URL vars.
- Configure Resend API key and verified sender.
- Create all five manual Stripe Payment Links.
- Confirm production admin bootstrap process.
- Run `npm run launch:env-check -- --mode production` until PASS.
- Run `npx prisma migrate deploy` against production only after approval.
- Run `npm run launch:smoke -- --base-url https://YOUR_DOMAIN`.
- Verify monitoring and rollback ownership.

## 11. Recommended Next Sprint

Recommended next work: Production Deployment Execution, after the founder provides or configures production hosting, domain, database, Resend, Stripe Payment Links, and admin bootstrap values.

Do not move to launch announcement work until production env check and deployed smoke checks pass.

## 12. Final Validation Results

Final commands run after implementation:

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run build`: PASS
- `npm run test`: PASS, 4 files / 12 tests
- `npx prisma validate`: PASS
- `npm run test:e2e`: PASS, 5 Playwright tests
- `npm run test:e2e:full`: PASS
- `npm run launch:env-check -- --mode local`: PASS
- `npm run launch:smoke -- --base-url http://localhost:3003`: PASS
- `npm run launch:env-check -- --mode production`: FAIL as expected because production secrets, production URLs, Resend, Stripe Payment Links, and production database are not configured in this environment
- `docker compose up -d --build`: PASS
- `curl -fsS http://localhost:3003/api/health`: PASS, `{"ok":true}`

Known warning:

- Docker `next build` still reports the known Auth.js/jose Edge Runtime warning for `CompressionStream` and `DecompressionStream`; build exits successfully.
