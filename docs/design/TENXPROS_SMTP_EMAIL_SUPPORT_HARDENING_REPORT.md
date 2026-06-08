# TenXPros — SMTP Email Support + Failure Hardening Report

**Date:** 2026-06-08
**Base:** `42e3bc7` · branch `deployment/production-deployment-sprint-a`
**Status:** `typecheck` PASS · `test` **29/29** PASS · `build` PASS.
**Not committed, not pushed, not deployed. No real email sent. No env edit. No DB mutation. No secrets printed.**

This sprint covers both requested goals: adding an **SMTP provider** and making transactional email **failure non-fatal** for application intake and admin flows.

---

## 1. Files changed
| File | Change |
| --- | --- |
| `app/src/lib/services/email-smtp.ts` | **new** — pure, dependency-free helpers (`resolveSmtpConfig`, `redactRecipient`, `safeRun`); no prisma/network, unit-tested. |
| `app/src/lib/services/email.ts` | Added **SMTP provider** via nodemailer; kept Resend + console; added **`safeSendEmail`** wrapper. |
| `app/src/lib/actions/applications.ts` | All 4 transactional sends switched from `sendEmail` → **`safeSendEmail`** (non-fatal). |
| `app/tests/email-smtp.test.ts` | **new** — 8 focused tests. |
| `app/package.json`, `app/pnpm-lock.yaml` | Added `nodemailer@^7.0.13` (dep) + `@types/nodemailer@^8` (dev). |

## 2. Package changes
- **Added `nodemailer@7.0.13`** (+ `@types/nodemailer` dev). Pinned to `^7` (not the latest `8.x`) to satisfy the `next-auth` / `@auth/core` peer requirement `nodemailer@^7.0.7` and avoid a duplicate/peer-warning tree. `resend@^6.12.3` unchanged. nodemailer is server-only and bundles cleanly (`next build` passed; no `next.config` change needed).

## 3. SMTP provider support
`deliver()` in `email.ts` now resolves the provider:
- `EMAIL_PROVIDER=smtp` → `nodemailer.createTransport(resolveSmtpConfig())` then `sendMail`. Config (`SMTP_HOST/PORT/SECURE/USER/PASSWORD`) is read from env in the pure `resolveSmtpConfig`, which **throws a clear, secret-free error if incomplete**. The password is read only from `process.env.SMTP_PASSWORD` and is **never logged or placed in error messages**.
- `EMAIL_PROVIDER=resend` → unchanged (requires `RESEND_API_KEY`).
- unset / unknown → **console log** (no real send), as before.
- Default sender remains `TenXPros <hello@tenxpros.com>` (overridable via `EMAIL_FROM`).

## 4. `safeSendEmail` behavior
`safeSendEmail(input)` delegates to the pure `safeRun`:
- Calls `sendEmail`. On success → `{ ok: true }`.
- On failure → **does not throw**; returns `{ ok: false, error }`, and logs a concise warning: `template`, **domain-only recipient** (`***@domain`), and the error message. **No secrets, no full env, no local-part of the address.**
- `sendEmail` itself still records an **`EmailEvent` (status="error")** before the failure propagates, so failures stay **operator-visible in `/admin/email`** in addition to the server log.

## 5. Where `safeSendEmail` is applied (all 4 sends, `applications.ts`)
1. **`application_received`** (on submit) — now non-fatal: the application is saved (in a transaction that commits first) and the user gets a success response even if email fails. **This closes the original risk** (DB write succeeded but the request looked failed and the duplicate-email guard blocked retry).
2. **`application_status_update`** (revise / not-accepted) — admin status action no longer breaks if email fails.
3. **`application_accepted_payment_link`** (accept) — admin accept no longer breaks; failure is logged + recorded. **Caveat below.**
4. **`enrollment_welcome`** (enroll) — enrollment no longer breaks if the welcome/password-setup email fails.

## 6. Tests run and results
`pnpm typecheck` PASS · `pnpm test` **7 files, 29/29** · `pnpm build` PASS.
New `email-smtp.test.ts` covers:
- `redactRecipient` masks the local part / handles malformed input.
- `resolveSmtpConfig` returns host/port/secure/auth; honors `SMTP_SECURE=false`; defaults port 465; **throws naming missing keys**; **never includes the password in the error**.
- `safeRun` returns `ok:true` on success; **catches a thrown provider error without throwing**; logs a **domain-redacted** recipient (asserts the full address is not leaked).
Existing suites (`payment-link`, `application-validation`, etc.) still pass.

## 7. Exact env keys needed (redacted — add to `.env.production` later, do NOT commit)
```env
EMAIL_PROVIDER=smtp
EMAIL_FROM="TenXPros <hello@tenxpros.com>"
SMTP_HOST=tenxpros.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=hello@tenxpros.com
SMTP_PASSWORD=<redacted>
```
(`SMTP_PASSWORD` to be added by the operator directly on the server; never pasted in chat.) Switching to Resend later only needs `EMAIL_PROVIDER=resend` + `RESEND_API_KEY`.

## 8. Confirmations
- **Real email sent?** No. **Env changed?** No (`.env.production` untouched). **DB mutated?** No. **Deployed?** No. **Secrets printed?** No.
- **Not changed:** Prisma schema/migrations, auth, application form fields/schema, payment/enrollment logic, public-site copy. (`applications.ts` change is only the email call wrapper; enrollment/payment logic is untouched.)

## 9. Remaining caveats
- **Acceptance email partial failure isn't surfaced in the admin UI.** When an admin accepts an applicant, the status change + PaymentRecord succeed even if the payment-link email fails; the failure is visible only in **`/admin/email`** (EmailEvent `status="error"`) and server logs. A future enhancement could surface this in the accept UI / add a "resend" button.
- **A new deploy is required** for these code changes to take effect (this sprint does not deploy).
- **SMTP must be reachable from the container** on `tenxpros.com:465` and the mailbox credentials valid; otherwise sends will fail (now non-fatal) and show as `status="error"` in `/admin/email`. Recommend one approved test send (to `mail@mehrdadnaderi.com`) after enabling, before outreach.
- `@types/nodemailer` is `^8` while the runtime lib is `^7`; the API used (`createTransport`/`sendMail`) is stable across both and typecheck passes.

## 10. Final git status
```
 M app/package.json
 M app/pnpm-lock.yaml
 M app/src/lib/actions/applications.ts
 M app/src/lib/services/email.ts
?? app/src/lib/services/email-smtp.ts
?? app/tests/email-smtp.test.ts
?? docs/design/TENXPROS_SMTP_EMAIL_SUPPORT_HARDENING_REPORT.md
```
Branch in sync with origin at `42e3bc7`. **No commit. No push. No deploy.**
