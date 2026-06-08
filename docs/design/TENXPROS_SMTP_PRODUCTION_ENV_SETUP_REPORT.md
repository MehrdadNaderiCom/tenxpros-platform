# TenXPros — SMTP Production Env Setup + Test Email Report

**Date:** 2026-06-08
**Base / live commit:** `5736394` · branch `deployment/production-deployment-sprint-a`
**Outcome:** ✅ **Production SMTP is working end-to-end.** Outgoing mail sends via `mail.tenxpros.com:465` (TLS) as `TenXPros <hello@tenxpros.com>`; a controlled test email was delivered (SMTP `250` accepted).
**No secrets printed. No `.env.production` values printed. No application submitted, no payment triggered, no applicant email, no code change, no deploy/rebuild.**

---

## 1. Email identity (documented)
- **`hello@tenxpros.com`** — official **outgoing sender** for all system emails (application received, status update, acceptance + payment link, enrollment welcome). This is `EMAIL_FROM` / `SMTP_USER`.
- **`support@tenxpros.com`** — support/contact inbox for user help (referenced in site/policy copy; not a sending identity).

## 2. Final SMTP configuration (redacted; loaded in the container)
`EMAIL_PROVIDER=smtp` · `EMAIL_FROM=TenXPros <hello@tenxpros.com>` · `SMTP_HOST=mail.tenxpros.com` · `SMTP_PORT=465` · `SMTP_SECURE=true` · `SMTP_USER=hello@tenxpros.com` · `SMTP_PASSWORD` SET (never printed).

## 3. The setup journey (problems found and fixed)
1. **Initially all SMTP env keys were missing** (`EMAIL_PROVIDER`, `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`). The operator added all seven to `.env.production`.
2. **`$` interpolation in `SMTP_PASSWORD`.** Docker Compose interpolates `env_file` values, so a `$xxxxxxx` fragment in the password was read as an unset variable and blanked (Compose warning observed), corrupting the password. **Fix:** escape every `$` as `$$` in `.env.production`; the warning disappeared and the container received the intact password.
3. **Wrong SMTP host.** `SMTP_HOST=tenxpros.com` resolves to the **web/app server** `51.178.37.211`, which has no SMTP listener → `Connection timeout` on 465/587/25. The mail server is `mail.tenxpros.com` (`136.243.174.135`). **Fix:** `SMTP_HOST=mail.tenxpros.com` (corrected on disk via `sed` after the first edit didn't save). Connectivity then showed `SMTP_CONNECT=CONNECTED` on :465.
4. **Expired mail certificate.** `mail.tenxpros.com:465` was serving Plesk's **default self-signed cert** (`CN=Plesk`, no SAN, `valid_to=Jan 20 2026` → expired) → `certificate has expired`. **Fix (Plesk/hosting):** a valid certificate was secured for the mail service.

## 4. Final TLS verification (strict, `rejectUnauthorized: true`)
```
TLS_OK=true
cert_subject_CN = webmail.tenxpros.com
valid_to        = Sep  6 18:45:30 2026 GMT   (valid)
SAN             = DNS:mail.tenxpros.com, DNS:webmail.tenxpros.com
```
The certificate is trusted, unexpired, and its SAN covers the SMTP host `mail.tenxpros.com`.

## 5. Final SMTP test — SUCCESS
- To `mail@mehrdadnaderi.com`, From `TenXPros <hello@tenxpros.com>`, Subject `TenXPros SMTP Test`, sent via a one-off nodemailer script using the container's SMTP env (password read from env, never printed).
- **`SMTP_TEST_RESULT=OK`**
- **MessageId:** `<78a85172-c295-b917-01ad-f546a853709b@tenxpros.com>`
- **SMTP response:** `250 Requested mail action okay, completed` · Accepted: `mail@mehrdadnaderi.com`
- Single send; no retries.

## 6. EmailEvent
**One new `EmailEvent`** for the successful test: `template=smtp_test`, `status=sent`, `sentAt` set. (Two earlier `smtp_test` events from the diagnosed failures — `Connection timeout`, then `certificate has expired` — are also retained.) All visible in `/admin/email`. These are the only DB writes from this work.

## 7. Route health after setup
`/` 200 · `/apply` 200 · `/login` 200 · `/pricing` 200 · `/api/health` 200 · `/admin` 307 → login. Container healthy.

## 8. Confirmations
- No password/secret printed; `.env.production` values not printed; all script output sanitized.
- No application submitted, no payment triggered, no payment link, no applicant email.
- No code change, no deploy/rebuild; only `tenxpros-app` was restarted/force-recreated to pick up env changes.
- DB writes limited to the approved `smtp_test` EmailEvents.

## 9. Remaining blockers / follow-ups
1. **Admin-managed payment terms** — `PAYMENT_LINK_FOUNDING` (Wise/manual/Stripe) still unset; richer payment management is a future sprint. Required before accepting applicants end-to-end.
2. **Marketing dashboard / analytics** — `/admin/analytics*` and `/admin/reports` are still stubs (future sprint).
3. **Deliverability (recommended, later):** verify **SPF / DKIM / DMARC** DNS records for `tenxpros.com` so system emails reliably reach inboxes (not spam). First sends from a new domain may land in spam until these are warmed up.

## 10. Git status
This report is documentation only. Branch `deployment/production-deployment-sprint-a`, in sync with origin.
