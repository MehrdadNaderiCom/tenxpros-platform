# TenXPros — Payment Management Migration Apply Report

**Date:** 2026-06-09 · branch `deployment/production-deployment-sprint-a` (HEAD `807b68f`)
**Outcome:** ✅ The committed additive migration `20260609000529_payment_management_terms` was **backed up, applied to the production DB, and verified**. App remains healthy. **No code/env/email/payment/application/deploy/implementation actions.**

---

## 1. Target database (verified)
Prisma loads `app/.env` → `DATABASE_URL` at **`localhost:5433`**, which is the **host-mapped port of the production `tenxpros-db` container** (the same database the app uses internally via `db:5432`). `migrate status` confirmed connectivity and that the migration was pending before applying.

## 2. Backup
- **Path:** `/opt/tenxpros/backups/payment-migration-20260609T002926Z/tenxpros-payment-migration-20260609T002926Z.dump`
- **Method:** `pg_dump --format=custom` inside the `db` container, then copied to the host. **68K**, non-empty. (`backups/` is git-ignored.)
- **Verification:** `pg_restore --list` (in-container) returned a valid archive header (`Archive created at 2026-06-09 00:29:27 UTC`) with `TABLE DATA` entries for all tables → **backup is readable/restorable.**

## 3. `prisma migrate deploy` result
```
2 migrations found in prisma/migrations
Applying migration `20260609000529_payment_management_terms`
The following migration(s) have been applied:
  └─ 20260609000529_payment_management_terms/migration.sql
All migrations have been successfully applied.
```
Exit code 0.

## 4. Schema verification (post-migration)
**`PaymentRecord` new columns (all present):**
| column | type | nullable | default |
|---|---|---|---|
| method | enum (PaymentMethod) | YES | — |
| paymentLink | text | YES | — |
| paymentInstructions | text | YES | — |
| dueAt | timestamp | YES | — |
| discountNote | text | YES | — |
| showDiscountNoteToApplicant | boolean | **NO** | **false** |
| internalNote | text | YES | — |
| instructionsSentAt | timestamp | YES | — |
| waivedAt | timestamp | YES | — |
| cancelledAt | timestamp | YES | — |

**`PricingTier` new columns (all present, nullable):** `paymentMethod` (enum), `paymentCurrency` (text), `paymentLink` (text), `paymentInstructions` (text), `paymentDueDays` (integer).

**`PaymentStatus` enum:** `PENDING, PAID, FAILED, REFUNDED, INSTRUCTIONS_SENT, WAIVED, CANCELLED` (the 3 new values appended — Postgres appends `ADD VALUE` to the end; order is cosmetic only). ✅

**`PaymentMethod` enum:** `WISE, STRIPE, MANUAL_INVOICE, BANK_TRANSFER, OTHER`. ✅

All expectations met: new columns exist, `showDiscountNoteToApplicant` default is `false`, and both enums contain the required values.

## 5. Migration status
`pnpm prisma migrate status` → **"Database schema is up to date!"** (2 migrations found, none pending).

## 6. Route smoke check (no deploy)
`/` 200 · `/apply` 200 · `/login` 200 · `/admin` 307 → login · `/pricing` 200 · `/api/health` 200. The running app is unaffected (its code does not read the new columns yet, so the additive change is transparent).

## 7. Confirmations
- **DB mutation:** only the approved migration was applied (after a verified backup). No other data changed.
- **No code edit, no `.env.production` edit, no email sent, no payment triggered, no application submitted, no deploy/rebuild, no resolver/UI/actions implemented, nothing committed or pushed.**
- The deployed application image is unchanged; DB and (current) code remain compatible. Code that *uses* the new fields will be added and deployed in a later sub-sprint.

## 8. Final git status
Working tree: only this report is new/uncommitted (`?? docs/design/TENXPROS_PAYMENT_MIGRATION_APPLY_REPORT.md`); the dump lives under the git-ignored `backups/`. Branch in sync with origin at `807b68f`. **Not committed, not pushed.**

## 9. Next steps (future sub-sprint, on approval)
Implement and deploy the code that uses these fields: `resolvePaymentTerms` + validators, admin tier-default + per-application payment UI, audited server actions (`updateTierPaymentTerms`, `upsertApplicationPaymentTerms`, `sendPaymentInstructions`, `updatePaymentStatus`), acceptance-email integration (sender `hello@`, support `support@`, discount-note gated by `showDiscountNoteToApplicant`), and tests.
