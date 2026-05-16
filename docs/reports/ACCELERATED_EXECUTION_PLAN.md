# TenXPros Accelerated Execution Plan

Generated: 2026-05-16
Current basis: main after full lifecycle E2E merge

## Operating Rules

- Move in short, evidence-backed sprints.
- Do not revisit architecture unless a production blocker proves it necessary.
- Do not change pricing, strategy, or the Build Spec authority.
- Do not implement Stripe Checkout/webhooks before the planned later phase.
- Do not implement inline dossier annotations.
- Keep each sprint separately branchable, testable, reportable, and mergeable.

## Sprint A — Production Deployment Sprint

Goal: Prepare and deploy a staging/production-ready version.

### Scope

- Confirm hosting choice and setup path, with Vercel as the default unless a different host is chosen.
- Configure project root, build command, install command, Node version, and environment variables.
- Run production environment verification with `npm run launch:env-check -- --mode production` against the configured deployment environment.
- Prepare production PostgreSQL and run the migration path:
  - `cd app`
  - `npx prisma migrate deploy`
- Verify seed is not run in production.
- Configure Resend:
  - authenticated sender domain
  - SPF/DKIM/DMARC
  - production `EMAIL_FROM`
  - test delivery to founder/admin
- Configure manual Stripe Payment Links for all five tiers:
  - Founding Charter
  - Early Charter
  - Late Charter
  - Final Charter
  - Standard
- Confirm the active tier and closed-preview tiers behave as expected.
- Run smoke tests against the deployed URL:
  - `/`
  - `/apply`
  - `/pricing`
  - `/login`
  - `/api/health`
  - unauthenticated `/admin` redirect
  - unauthenticated `/portal` redirect
  - `/verify/[code]` if a safe test badge exists
- Document rollback:
  - last known good commit/tag
  - hosting rollback method
  - database migration rollback posture
  - contact/escalation notes

### Non-Goals

- No Stripe Checkout/webhook automation.
- No UI redesign.
- No new product features.
- No production test data that could be confused with real customers.
- No seed admin in production.

### Commands / Tests Required

From `app/`:

```bash
npm run lint
npm run typecheck
npm run build
npm run test
npx prisma validate
npm run test:e2e
npm run test:e2e:full
npm run launch:env-check -- --mode production
```

Against deployed URL:

```bash
APP_URL=https://YOUR_DOMAIN npm run launch:smoke
curl -fsS https://YOUR_DOMAIN/api/health
```

Production database:

```bash
cd app
npx prisma migrate deploy
```

### Expected Commit Message

`Prepare TenXPros production deployment readiness`

### Expected Evidence Report

`docs/reports/PRODUCTION_DEPLOYMENT_SPRINT_REPORT.md`

The report should include:
- deployment URL
- env check result
- migration result
- smoke test result
- Resend verification status
- Stripe Payment Links status
- rollback notes
- production blockers

## Sprint B — Launch Content & Sales Readiness Sprint

Goal: Make the site ready for real prospects.

### Scope

- Final public copy review:
  - `/`
  - `/program`
  - `/how-it-works`
  - `/dossier`
  - `/certification`
  - `/pricing`
  - `/directory`
  - `/radar`
  - `/about`
  - `/apply`
- Founder bio polish:
  - credibility
  - clear point of view
  - restrained, non-hype language
- Apply page conversion polish:
  - clearer fit criteria
  - stronger expectation-setting
  - less friction where possible without weakening review quality
- Pricing page trust polish:
  - clarify Founding Charter active state
  - clarify later tier preview/closed state
  - reinforce payment after acceptance
  - reinforce no automatic certification guarantee
- Add a sample Dossier teaser if feasible:
  - non-sensitive
  - clearly illustrative
  - short enough for public review
- Prepare outreach assets:
  - short founder invitation
  - LinkedIn post draft
  - email announcement draft
  - one-paragraph prospect explainer
- First launch announcement draft:
  - serious professionals
  - selective certification
  - reviewed work
  - Founding Charter
- FAQ polish:
  - who it is for
  - who it is not for
  - time commitment
  - certification review
  - payment flow
  - confidentiality
  - directory/radar coming soon

### Non-Goals

- No strategy change.
- No pricing change.
- No large feature build.
- No external template integration.
- No claims that require legal/compliance review unless marked for founder review.

### Commands / Tests Required

From `app/`:

```bash
npm run lint
npm run typecheck
npm run build
npm run test
npx prisma validate
npm run test:e2e
```

From repo root:

```bash
docker compose up -d --build
curl -fsS http://localhost:3003/api/health
```

Browser checks:
- public route scan
- mobile screenshots for home/pricing/apply
- apply form smoke

### Expected Commit Message

`Refine TenXPros launch content and sales readiness`

### Expected Evidence Report

`docs/reports/LAUNCH_CONTENT_SALES_READINESS_REPORT.md`

The report should include:
- pages reviewed
- copy updated
- sales/outreach assets added
- screenshots
- checks run
- remaining founder/legal review notes

## Sprint C — UI/Visual Polish Sprint

Goal: Improve visual quality without breaking architecture.

### Scope

- Audit current UI screenshots from:
  - acceptance evidence
  - launch hardening
  - launch finalization
  - full lifecycle E2E
- Identify weakest screens by launch impact:
  - public home
  - pricing
  - apply
  - participant dashboard
  - dossier builder
  - admin dashboard
- Improve public home/pricing/apply first:
  - spacing rhythm
  - CTA hierarchy
  - card density
  - mobile scanning
  - trust cues
- Improve participant dashboard and dossier:
  - next-action clarity
  - status readability
  - editor readability
  - feedback visibility
- Improve admin dashboard readability:
  - queue triage
  - KPI hierarchy
  - today’s actions
  - status badges
- Optionally evaluate Vuexy as visual reference only:
  - navigation density
  - dashboard hierarchy
  - table/action layout
  - no architecture rewrite
  - no template transplant

### Non-Goals

- No design-system replacement.
- No app rewrite.
- No new product features.
- No Vuexy integration unless separately approved.
- No flashy animation or decorative template work.

### Commands / Tests Required

From `app/`:

```bash
npm run lint
npm run typecheck
npm run build
npm run test
npx prisma validate
npm run test:e2e
npm run test:e2e:full
```

From repo root:

```bash
docker compose up -d --build
curl -fsS http://localhost:3003/api/health
```

Browser evidence:
- desktop screenshots for home/pricing/apply/portal/dossier/admin
- mobile screenshots for home/pricing/apply/portal/admin
- no overlapping text or broken mobile controls

### Expected Commit Message

`Polish TenXPros UI for launch presentation`

### Expected Evidence Report

`docs/reports/UI_VISUAL_POLISH_SPRINT_REPORT.md`

The report should include:
- weakest screens identified
- screens improved
- screenshots before/after where practical
- checks run
- remaining visual risks

## Recommended Order

Run Sprint A first.

Reason: the product now has full local lifecycle proof. The highest-value next step is proving the deployment path, production environment, email, payment-link configuration, and rollback process before spending more cycles on launch copy or visual refinement.
