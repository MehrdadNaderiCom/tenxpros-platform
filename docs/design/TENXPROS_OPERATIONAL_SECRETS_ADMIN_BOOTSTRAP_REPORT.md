# TenXPros — Operational Secrets + Founder Admin Bootstrap Report

**Date:** 2026-06-08
**Commit (live):** `5744c05` (on `9d8e64a` public base). **Container:** `tenxpros-app` Up, healthy, `0.0.0.0:3003->3000`; `tenxpros-db` healthy.
**This turn:** read-only inspection + plan only. **No secrets printed, no DB mutation, no `.env.production` edit, no container restart, no commit/push/deploy, no admin bootstrap run.**

---

## 1. Current state
- Git: clean working tree at `5744c05`, in sync with origin.
- Routes (live): `/apply` 200, `/login` 200, `/set-password` 200, `/admin` + `/admin/applications` + `/admin/payments` 307→login (correct), `/api/health` 200.

## 2. Email readiness — **NOT configured (blocker)**
- `EMAIL_PROVIDER` **missing**, `RESEND_API_KEY` **missing**, `EMAIL_FROM` **missing**.
- `email.ts` behavior: with `EMAIL_PROVIDER` unset, `provider="console"` → emails are **console-logged only, not delivered** (still recorded as `status:"sent"`). With `EMAIL_PROVIDER=resend` **and** `RESEND_API_KEY` set, it sends via Resend; if provider=resend but key missing, it safely falls back to console.
- Default sender (when `EMAIL_FROM` unset) is **`TenXPros <hello@tenxpros.com>`** ✓. Support contact `support@tenxpros.com` is used in site/policy copy (hard-coded; no `SUPPORT_EMAIL` env).
- Emails that would fire once enabled: application received, accepted + payment link, status update (revise/not-accepted), enrollment/password-setup.
- **To enable (add to `.env.production`, then restart app):**
  ```env
  EMAIL_PROVIDER=resend
  RESEND_API_KEY=<redacted>
  EMAIL_FROM="TenXPros <hello@tenxpros.com>"
  ```
  Requires a verified `hello@tenxpros.com` sender/domain in Resend. **No real email was sent.**

## 3. Founder admin bootstrap — **NOT done (action required, awaiting password)**
- Read-only check: `founder_admin_count = 0` for `mail@mehrdadnaderi.com`.
- Current admins: **2, both on `@tenxpros.test`** (dev/seed accounts). `ADMIN_EMAIL` in env is an `@tenxpros.com` address (not the founder); `prisma/seed.ts` refuses to run in production.
- Bootstrap script `app/scripts/bootstrap-admin.mjs` is in the deployed image, reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from env, refuses passwords < 12 chars, never prints the password, masks the email, and is idempotent.
- **Was bootstrap run this turn?** **No.** Awaiting the one-time password supplied securely (not in chat).

**Approved pattern (placeholder only; password never in chat/source/report):**
```bash
printf 'ADMIN_EMAIL=%s\nADMIN_PASSWORD=%s\n' "mail@mehrdadnaderi.com" "<ONE_TIME_STRONG_PASSWORD>" > /tmp/tenxpros-admin-bootstrap.env
chmod 600 /tmp/tenxpros-admin-bootstrap.env
docker compose exec -T --env-file /tmp/tenxpros-admin-bootstrap.env tenxpros-app node scripts/bootstrap-admin.mjs
rm -f /tmp/tenxpros-admin-bootstrap.env
```
Recommended secure handoff: **you** create `/tmp/tenxpros-admin-bootstrap.env` (so the password never touches the chat/history), then I run only the `docker compose exec …` + `rm` steps; or you run all four. Rotate the password after first login (no change-password UI yet).

## 4. Payment link readiness — **provider-agnostic, none configured**
- All `PAYMENT_LINK_*` and legacy `STRIPE_PAYMENT_LINK_*` keys are **missing**. Acceptance email currently shows `Manual payment link pending`.
- Resolution (from `payment-link.ts`): `PAYMENT_LINK_<TIER>` → `STRIPE_PAYMENT_LINK_<TIER>` → `PAYMENT_LINK_FOUNDING` → `STRIPE_PAYMENT_LINK_FOUNDING` → placeholder. A **Wise link, a manual hosted payment-instructions URL, or Stripe** all work.
- Only needed before **accepting** an applicant (not to collect applications). **To enable (add, then restart):**
  ```env
  PAYMENT_LINK_FOUNDING=<redacted-url>
  ```
  No link was invented or printed.

## 5. Test-data cleanup plan — **read-only; NOT executed; needs approval**
**Current counts:** applications_total **35** (all `@tenxpros.test`), users_total **37** (all `@tenxpros.test`, incl. both admins), participants **17**, payments **17**. **The production DB contains only test data; there are zero real users.**

**FK note:** only 4 relations cascade from `User`; most (Application, ParticipantProfile, Ticket, PaymentRecord, etc.) do not, so a bare `DELETE FROM "User"` would fail. Because 100% of rows are test data, the safest reversible cleanup clears the data tables while **preserving the seeded catalog/config** (`Module`, `PricingTier`, `Badge`, `AdminSetting`).

**Plan (execute only after explicit approval + confirming the backup path):**
1. **Backup first (timestamped, kept for rollback):**
   ```bash
   docker compose exec -T db pg_dump -U tenxpros -d tenxpros > /opt/tenxpros/backups/tenxpros-predelete-<UTC_TIMESTAMP>.sql
   ```
2. **Delete only test data** (all users are `@tenxpros.test`), inside a transaction, preserving schema and catalog tables:
   ```sql
   BEGIN;
   TRUNCATE TABLE
     "Notification","SiteEvent","AuditLog","EmailEvent","TicketMessage","Ticket",
     "ParticipantBadge","DirectoryProfile","CertificationReview","Feedback",
     "DossierSection","Dossier","ParticipantModule","ProgramPath","DiagnosticIntake",
     "PaymentRecord","ParticipantProfile","Application",
     "Session","Account","VerificationToken","User"
   RESTART IDENTITY CASCADE;
   COMMIT;
   ```
   (Preserves `Module`, `PricingTier`, `Badge`, `AdminSetting`. If any real, non-`@tenxpros.test` user ever exists, switch to an email-scoped per-table delete instead of TRUNCATE.)
3. **Verify after:** `users_total = 0`, `applications_total = 0`, `payments_total = 0`, `participants_total = 0`; catalog tables unchanged.
4. **Rollback:** restore from the `pg_dump` file if needed.
5. **Then** bootstrap the founder admin (Step 3) so the only admin is `mail@mehrdadnaderi.com`.

> Sequencing: cleanup truncates the 2 `@tenxpros.test` admins too, so run admin bootstrap **after** cleanup (or re-run it after).

## 6. Routes verified
`/apply` 200 · `/login` 200 · `/set-password` 200 · `/admin*` 307→login · `/api/health` 200 (`{"ok":true}`).

## 7. Change log for this turn
- **Files changed:** only this report (uncommitted). No code/config edits.
- **Env changed?** No.
- **Container restarted?** No.
- **DB mutation?** No.
- **Secrets printed / `.env.production` values exposed?** No.
- **Admin bootstrap run?** No.

## 8. Final recommendation — **HOLD** (multiple operational items, in order)
1. **Hold until email configured** — add the three email keys (needs `RESEND_API_KEY` + verified sender), then restart the app. First blocker (the 48-hour-reply promise depends on it).
2. **Hold until admin bootstrap** — run the founder bootstrap with a securely-supplied one-time password.
3. **Hold until payment link** — set `PAYMENT_LINK_FOUNDING` before accepting anyone.
4. **Hold until test-data cleanup** — approve the backup + truncate plan so the panel/caps start clean.

Recommended order: **cleanup (with backup) → admin bootstrap → email env + restart → payment link env + restart.** After 1–2, you can collect and review applications; configure the payment link before issuing any acceptance.

**Awaiting your approval and the secrets (supplied securely, not in chat).**
