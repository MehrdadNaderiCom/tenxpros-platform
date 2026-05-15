# TenXPros Acceptance Evidence Report After Fixes

Generated: 2026-05-15
Base URL verified: http://localhost:3003
Docker start method: `docker compose up -d --build`
Server-action fallback: disabled
Manual Auth.js runtime override: not used

## Final Acceptance Status

Status: PASS for the requested after-fixes end-to-end acceptance pass.

The two previously reported blockers are resolved:

- `/apply` browser submission now creates a `User` and `Application` through the UI with no fallback.
- Docker Compose auth now works on `localhost:3003` with no manual `docker run` override.

Machine-readable evidence:

- `docs/reports/acceptance-evidence/data/acceptance-results-after-fixes.json`
- `docs/reports/acceptance-evidence/data/acceptance-db-summary-after-fixes.json`

## Commands Run

```bash
docker compose up -d --build
```

```bash
DATABASE_URL=postgresql://tenxpros:tenxpros_dev@localhost:5433/tenxpros \
ACCEPTANCE_BASE_URL=http://localhost:3003 \
ACCEPTANCE_ALLOW_APPLICATION_FALLBACK=false \
ACCEPTANCE_RESULTS_FILE=docs/reports/acceptance-evidence/data/acceptance-results-after-fixes.json \
node docs/reports/acceptance-evidence/acceptance-runner.mjs
```

```bash
DATABASE_URL=postgresql://tenxpros:tenxpros_dev@localhost:5433/tenxpros node - <<'NODE'
// wrote docs/reports/acceptance-evidence/data/acceptance-db-summary-after-fixes.json
NODE
```

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3003/admin
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3003/portal
curl -fsS http://localhost:3003/api/verify/cmp7ghtmk001ty86r6g9ody75
docker logs --since 30m tenxpros-app 2>&1 | grep -i 'UntrustedHost' || true
```

```bash
npm run lint
npm run typecheck
npm run build
npm run test
npx prisma validate
```

## Route Verification

All requested routes loaded successfully.

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
| `/api/health` | 200, `{"ok":true}` |
| `/admin` | 200 after admin login |
| `/portal` | 200 after participant login |
| `/verify/cmp7ghtmk001ty86r6g9ody75` | 200 |
| `/api/verify/cmp7ghtmk001ty86r6g9ody75` | 200 |

Protected route checks:

| Route | Unauthenticated Result |
| --- | --- |
| `/admin` | 307 to `/login?callbackUrl=%2Fadmin` |
| `/portal` | 307 to `/login?callbackUrl=%2Fportal` |

## Lifecycle Verification

The full browser lifecycle passed:

- Public routes loaded.
- `/apply` browser submission created application through UI.
- Admin login worked through Docker Compose without runtime override.
- Admin queue displayed the new application.
- Admin accepted the application.
- Payment placeholder was created.
- Admin marked payment received and enrolled the participant.
- Participant password setup worked.
- Participant login worked.
- Starter Pack completion persisted.
- Diagnostic Intake submitted.
- Admin approved path.
- Module artifact submitted.
- Admin reviewed module and issued module badge.
- Dossier section saved and submitted.
- Admin approved dossier section with section-level feedback.
- Ticket created by participant.
- Ticket responded to and resolved by admin.
- Certification decision saved.
- Capstone badge issued.
- Public `/verify/[code]` page and API resolved.

Runner result:

```json
{
  "failures": [],
  "applicationFallbackAllowed": false,
  "applicationSubmittedVia": "ui"
}
```

## Database Evidence

Acceptance user:

- Email: `acceptance.1778882068098@tenxpros.test`
- Application ID: `cmp7ggmji0003y86rbowp62tb`
- Participant ID: `cmp7gh5wo000ay86rn7swxzh6`
- Verification code: `cmp7ghtmk001ty86r6g9ody75`

Summary:

```json
{
  "userRole": "PARTICIPANT",
  "applicationStatus": "ENROLLED",
  "paymentStatuses": ["PAID"],
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
  "dossierFeedbackCount": 1,
  "certificationOutcome": "CERTIFIED",
  "tickets": [
    {
      "status": "RESOLVED",
      "messages": 2
    }
  ]
}
```

Badges issued:

- `TenX Mindset Badge`
- `Certified TenXPro Capstone Seal`

## Screenshots

Fresh screenshots were saved under `docs/reports/acceptance-evidence/screenshots/`:

- `01-home-page.png`
- `02-pricing-page.png`
- `03-apply-page.png`
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

## Check Results

| Check | Result |
| --- | --- |
| `docker compose up -d --build` | PASS |
| Docker health | PASS |
| `AUTH_TRUST_HOST=true` present in running container | PASS |
| Fresh container logs contain `UntrustedHost` | PASS, none found |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run test` | PASS, 3 files / 7 tests |
| `npx prisma validate` | PASS |

## Remaining Launch Blockers

No blockers were found in the requested after-fixes browser lifecycle.

Remaining production-launch blockers from launch readiness still apply:

- Configure production domain values for `AUTH_URL`, `NEXTAUTH_URL`, `APP_URL`, and `NEXT_PUBLIC_APP_URL`.
- Configure real production secrets.
- Configure Resend sender/domain authentication.
- Configure manual Stripe Payment Links.
- Verify production database backups, monitoring, DNS, SSL, and admin account hardening.

## Remaining Known Limitations

- Directory and Radar remain coming-soon/placeholder states.
- Extended analytics/reports/email-template admin routes remain minimal.
- Full Stripe automation remains intentionally out of launch scope.
- Dossier uses practical save/submit, not proven background auto-save.
- Capstone/certificate PDF generation remains unverified/not completed.
- Lighthouse, full mobile QA, email delivery, DNS/SSL, backups, and production observability were not part of this rerun.
