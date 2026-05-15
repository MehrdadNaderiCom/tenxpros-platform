# TenXPros Acceptance Evidence Report

Generated: 2026-05-15
Base URL verified: http://localhost:3003
Build Spec authority: docs/build/TenXPros_Build_Spec_v8.md
Evidence directory: docs/reports/acceptance-evidence/

## Executive Result

Status: PARTIAL

The Docker app loads at http://localhost:3003, all requested public routes return 200, authenticated admin and participant routes load when Auth.js host trust is configured, and the downstream lifecycle can be completed.

However, the acceptance pass found two launch-blocking issues:

1. The `/apply` UI form does not submit correctly in the browser. After filling valid values and clicking "Submit application", the page stays on `/apply` and every field displays "Invalid input". No Application record is created from the UI.
2. The root `.env.production` does not set `AUTH_TRUST_HOST=true`. With the default Docker Compose env file, Auth.js rejects `localhost:3003` with `UntrustedHost` during credentials login. Authenticated verification required a local runtime override.

No product code was changed during this verification pass. Only evidence files, screenshots, and this report were added under `docs/reports/`.

## Exact Commands Run

Temporary browser automation setup:

```bash
mkdir -p /tmp/tenxpros-acceptance && cd /tmp/tenxpros-acceptance && npm init -y >/dev/null && npm install playwright-core@1.56.1 >/dev/null
```

Start Docker app:

```bash
docker compose up -d
docker compose ps
```

Initial authenticated login check found the Auth.js host-trust blocker. Local acceptance override used:

```bash
docker rm -f tenxpros-app && docker run -d --name tenxpros-app --network tenxpros_default --restart unless-stopped --env-file .env.production -e AUTH_TRUST_HOST=true -e NEXTAUTH_URL=http://localhost:3003 -e AUTH_URL=http://localhost:3003 -e APP_URL=http://localhost:3003 -e NEXT_PUBLIC_APP_URL=http://localhost:3003 -p 3003:3000 tenxpros-tenxpros-app:latest
```

Wait for container health:

```bash
for i in $(seq 1 30); do status=$(docker inspect -f '{{.State.Health.Status}}' tenxpros-app 2>/dev/null || echo starting); echo "$i $status"; [ "$status" = healthy ] && exit 0; sleep 2; done; exit 1
```

Browser route, screenshot, and lifecycle runner:

```bash
DATABASE_URL=postgresql://tenxpros:tenxpros_dev@localhost:5433/tenxpros ACCEPTANCE_BASE_URL=http://localhost:3003 node docs/reports/acceptance-evidence/acceptance-runner.mjs
```

Duplicate application server-action check:

```bash
DATABASE_URL=postgresql://tenxpros:tenxpros_dev@localhost:5433/tenxpros ACCEPTANCE_DUP_EMAIL=acceptance.1778861937363@tenxpros.test pnpm exec tsx -e 'import { submitApplication } from "./src/lib/actions/applications"; async function run(){ const email=process.env.ACCEPTANCE_DUP_EMAIL!; const result=await submitApplication({ fullName:"Duplicate Acceptance Applicant", email, country:"United States", professionalRole:"Operations Director", domain:"Operations", linkedinUrl:"https://www.linkedin.com/in/duplicate", aiExperience:"INTERMEDIATE", whyTenXPros:"I need a structured AI adoption program that turns practical workflow problems into responsible defensible AI solution designs for my organization.", realProblemBrief:"Our intake workflow is fragmented across email spreadsheets and ad hoc reviews. I want to map the current process and design AI supported triage with controls.", dataSensitivity:"MODERATE", timeAvailability:"HOURS_8", preferredLanguage:"English", consentConfidentiality:true, consentTerms:true }); console.log(JSON.stringify(result)); } run();'
```

Unauthenticated protected-route checks:

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3003/admin
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3003/portal
```

Health and badge verification:

```bash
curl -fsS http://localhost:3003/api/health
curl -fsS http://localhost:3003/api/verify/cmp74iopy001nj2hu4v2y1n5e
```

Static checks:

```bash
npm run lint
npm run typecheck
npm run build
npx prisma validate
npm run test
```

Database evidence summary:

```bash
DATABASE_URL=postgresql://tenxpros:tenxpros_dev@localhost:5433/tenxpros node - <<'NODE'
const fs = require('fs');
const { PrismaClient } = require('./app/node_modules/@prisma/client');
const results = require('./docs/reports/acceptance-evidence/data/acceptance-results.json');
const prisma = new PrismaClient();
(async () => {
  const email = results.records.applicantEmail;
  const user = await prisma.user.findUnique({ where: { email }, include: { application: true, participantProfile: { include: { diagnostic: true, path: true, participantModules: true, dossier: { include: { sections: true } }, certification: true } }, earnedBadges: { include: { badge: true } }, tickets: { include: { messages: true } } } });
  const summary = {
    email,
    userRole: user?.role,
    applicationStatus: user?.application?.status,
    participantStatus: user?.participantProfile?.status,
    starterPackCompleted: Boolean(user?.participantProfile?.starterPackCompletedAt),
    diagnosticComplete: user?.participantProfile?.diagnostic?.isComplete,
    pathApproved: user?.participantProfile?.path?.approvedByAdmin,
    moduleStatuses: user?.participantProfile?.participantModules.reduce((acc, item) => { acc[item.status] = (acc[item.status] || 0) + 1; return acc; }, {}),
    dossierSectionStatuses: user?.participantProfile?.dossier?.sections.reduce((acc, item) => { acc[item.status] = (acc[item.status] || 0) + 1; return acc; }, {}),
    certificationOutcome: user?.participantProfile?.certification?.outcome,
    badges: user?.earnedBadges.map((item) => ({ name: item.badge.name, category: item.badge.category, verificationCode: item.verificationCode })),
    tickets: user?.tickets.map((ticket) => ({ id: ticket.id, status: ticket.status, messages: ticket.messages.length }))
  };
  fs.writeFileSync('./docs/reports/acceptance-evidence/data/acceptance-db-summary.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  await prisma.$disconnect();
})();
NODE
```

## Routes Verified

From `docs/reports/acceptance-evidence/data/acceptance-results.json`:

| Route | Result |
| --- | --- |
| `/` | 200 |
| `/program` | 200 |
| `/how-it-works` | 200 |
| `/dossier` | 200 |
| `/certification` | 200 |
| `/pricing` | 200 |
| `/directory` | 200 |
| `/radar` | 200 |
| `/about` | 200 |
| `/apply` | 200 |
| `/login` | 200 |
| `/admin` | 200 authenticated after local trust-host override |
| `/portal` | 200 authenticated after participant login |
| `/api/health` | 200, `{"ok":true}` |
| `/verify/cmp74iopy001nj2hu4v2y1n5e` | 200 |
| `/api/verify/cmp74iopy001nj2hu4v2y1n5e` | 200 |

Protected-route middleware:

| Route | Unauthenticated Result |
| --- | --- |
| `/admin` | 307 to `/login?callbackUrl=%2Fadmin` |
| `/portal` | 307 to `/login?callbackUrl=%2Fportal` |

## Screenshots Captured

Saved in `docs/reports/acceptance-evidence/screenshots/`:

- `01-home-page.png`
- `02-pricing-page.png`
- `03-apply-page.png`
- `03a-apply-ui-submit-failure.png`
- `04-login-page.png`
- `05-admin-dashboard.png`
- `06-admin-applications.png`
- `07-participant-dashboard.png`
- `08-diagnostic-intake.png`
- `09-modules-page.png`
- `10-dossier-builder.png`
- `11-ticketing-page.png`
- `12-certification-status.png`
- `13-public-badge-verification.png`

## Test Users Used

Admin:

- Email: `admin@tenxpros.test`
- Role: `ADMIN`
- Password: redacted in this report.

Acceptance applicant / participant:

- Email: `acceptance.1778861937363@tenxpros.test`
- Name: `Acceptance Applicant 1778861937363`
- Final role: `PARTICIPANT`
- Final participant status: `CERTIFIED`
- Application ID: `cmp74hif40003m23u5pmuvjj4`
- Participant ID: `cmp74i0wf0004j2hu1bj1t1rg`
- Dossier ID: `cmp74i0wo0008j2hu4dsvyhku`
- Ticket ID: `cmp74il6s001dj2hu4evnzvt6`
- Public badge verification code: `cmp74iopy001nj2hu4v2y1n5e`

## Lifecycle Evidence

Result from the runner:

- UI application submission: FAIL. The form rendered and was filled, but client-side validation showed every field as "Invalid input"; no UI-created Application record was produced.
- Server-action fallback application submission: PASS. Used only so downstream lifecycle evidence could continue.
- Admin application queue showed submitted application: PASS.
- Admin accepted application and created payment placeholder: PASS.
- Admin marked payment received and enrolled participant: PASS.
- Password setup link worked: PASS.
- Participant login redirected to `/portal`: PASS.
- Starter Pack completion persisted: PASS.
- Diagnostic Intake submitted and marked complete: PASS.
- Admin approved participant path: PASS.
- Participant submitted module artifact: PASS.
- Admin passed module artifact and issued module badge: PASS.
- Participant saved and submitted dossier section: PASS.
- Admin approved dossier section with section-level feedback: PASS.
- Participant created ticket: PASS.
- Admin responded to ticket and set it resolved: PASS.
- Admin submitted certification decision and issued capstone badge: PASS.
- Public badge verification page/API resolved: PASS.

Database summary saved to `docs/reports/acceptance-evidence/data/acceptance-db-summary.json`:

```json
{
  "email": "acceptance.1778861937363@tenxpros.test",
  "userRole": "PARTICIPANT",
  "applicationStatus": "ENROLLED",
  "participantStatus": "CERTIFIED",
  "starterPackCompleted": true,
  "diagnosticComplete": true,
  "pathApproved": true,
  "moduleStatuses": {
    "PASSED": 1,
    "LOCKED": 10
  },
  "dossierSectionStatuses": {
    "APPROVED": 1,
    "DRAFT": 11
  },
  "certificationOutcome": "CERTIFIED",
  "badges": [
    {
      "name": "TenX Mindset Badge",
      "category": "MODULE",
      "verificationCode": "cmp74iexk0015j2hu7mfq5rcq"
    },
    {
      "name": "Certified TenXPro Capstone Seal",
      "category": "CAPSTONE",
      "verificationCode": "cmp74iopy001nj2hu4v2y1n5e"
    }
  ],
  "tickets": [
    {
      "id": "cmp74il6s001dj2hu4evnzvt6",
      "status": "RESOLVED",
      "messages": 2
    }
  ]
}
```

## Static Check Results

| Check | Result |
| --- | --- |
| `npm run lint` | PASS, no ESLint warnings or errors |
| `npm run typecheck` | PASS |
| `npm run build` | PASS, 58 routes built |
| `npx prisma validate` | PASS |
| `npm run test` | PASS, 2 files / 5 tests |

## Build Spec v8 Phase Acceptance Status

| Phase | Status | Evidence / Notes |
| --- | --- | --- |
| Phase 1 Foundation | PARTIAL | Schema validates, build passes, auth works only with `AUTH_TRUST_HOST=true`, middleware redirects protected routes. Vercel staging was not verified. README criterion was not verified. |
| Phase 2 Public Site | PARTIAL | Requested public routes all return 200; pricing, directory, radar screenshots captured. Lighthouse, full mobile 375px pass, founder-approved legal copy, and all internal links were not fully verified. |
| Phase 3 Application System | FAIL | Backend/server-action submission works, admin review/enrollment works, duplicate submission is blocked through server action. Browser UI `/apply` submission fails and is launch-blocking. |
| Phase 4 Participant Portal | PARTIAL | Dashboard, starter pack, diagnostic, path, module submission, dossier section, tickets, and certification status work. Background auto-save, section locking after submit, capstone submission PDF, and complete all-module progression are not proven. |
| Phase 5 Admin Operations | PARTIAL | Core admin lifecycle works: applications, participants, path approval, module review, dossier feedback, tickets, certification, badge verification. Filters/sorts, full path-builder dimensions, certification rubric/PDF/email, pricing transition testing, and full settings coverage are incomplete or unverified. |
| Phase 6 Polish & Launch | PARTIAL | lint/typecheck/build/test/prisma validate pass; sitemap/robots exist. Production external requirements are not met or not verified: Stripe links, DNS/SSL, email domain authentication, backups, empty production DB, analytics, OG image proof, strong production admin/2FA. |

## What Passed

- Docker image runs and serves on `localhost:3003`.
- Public route shell and marketing pages load.
- Health endpoint returns OK.
- Protected routes redirect unauthenticated users.
- Authenticated admin and participant routes work when host trust is configured.
- Admin can review/accept/enroll application records.
- Manual payment placeholder flow works.
- Participant password setup works.
- Participant portal core pages load and persist state.
- Ticket thread creation and admin response work.
- Module review issues a module badge.
- Certification decision issues capstone badge.
- Public badge verification page and API work.
- Static code checks and tests pass.

## What Failed

- `/apply` UI form submission fails in browser with all fields showing `Invalid input`.
- Default Docker Compose environment from `.env.production` does not allow credentials login on `localhost:3003` because `AUTH_TRUST_HOST=true` is missing.

## Known Limitations

- Directory and Radar remain coming-soon/placeholder states.
- Extended analytics/report/email-template admin areas are minimal.
- No full Stripe automation, by scope.
- Manual Stripe Payment Links were not configured/tested in this environment.
- Resend production sending/domain authentication was not verified.
- Dossier uses manual save/submit, not proven background auto-save.
- Dossier sections are still editable after submit; submit-for-review does not hard-lock editing.
- Capstone submission PDF and certificate PDF generation are not implemented/proven.
- File upload provider is not configured/proven.
- Lighthouse scores were not run.
- Full mobile responsive QA was not completed.
- Production backups, monitoring, DNS, SSL, and 2FA were not verified.

## Production Launch Blockers

1. Fix `/apply` UI submission so valid browser form input creates `User` + `Application`.
2. Add `AUTH_TRUST_HOST=true` or equivalent trusted-host/Auth URL configuration to the production/local deployment environment.
3. Configure real production secrets: `AUTH_SECRET`, `NEXTAUTH_SECRET`, `SESSION_SECRET`.
4. Configure Resend sender domain and `EMAIL_PROVIDER=resend`.
5. Configure manual Stripe Payment Links for active launch tiers.
6. Decide whether capstone/certificate PDF generation is launch-critical; Build Spec v8 acceptance currently expects it.
7. Run Lighthouse and mobile viewport QA.
8. Verify production backups, monitoring, DNS, SSL, and admin account hardening.

## Recommended Next Fixes

1. Fix the form-field/RHF integration behind `/apply` and re-run the acceptance runner without the server-action fallback.
2. Add `AUTH_TRUST_HOST=true`, `AUTH_URL`, and `NEXTAUTH_URL` to the deployment env used by Docker/local acceptance.
3. Add regression tests for `/apply` UI submission, not just the server action.
4. Add a small authenticated smoke/E2E test for admin login and participant login under Docker.
5. Clarify launch scope for capstone PDF/certificate PDF vs. later phase.
6. Run Lighthouse and mobile QA before launch approval.
