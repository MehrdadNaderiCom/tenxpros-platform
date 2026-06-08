# TenXPros — Production Test-Data Cleanup Report

**Date:** 2026-06-08
**Commit (live):** `675f3b3` · **Container:** `tenxpros-app` healthy on `:3003`, `tenxpros-db` healthy.
**Outcome:** ✅ Test-domain data removed from production; config/catalog preserved; app verified healthy. **No env/code/deploy/restart/bootstrap actions.**

---

## 1. Backup
- **Path:** `/opt/tenxpros/backups/test-data-cleanup-20260608T054705Z/`
- **Files:** `tenxpros-before-test-cleanup.dump` (custom format, 102K) + `tenxpros-before-test-cleanup.sql` (plain SQL, 248K); both non-empty; dump stderr files empty.
- **Verification:** `pg_restore -l` (run inside the `db` container — host has no `pg_restore`) reported a valid CUSTOM archive, 162 TOC entries, pg 16.11. Plain SQL dump contains 27 `CREATE TABLE` + 27 data (`COPY`) blocks.
- **Cleanup SQL file:** `/opt/tenxpros/backups/test-data-cleanup-20260608T054705Z/cleanup-test-domain-data.sql`

## 2. Pre-cleanup counts (all `@tenxpros.test`; 0 non-test found)
| Metric | Count |
|---|--:|
| users_total / test / **non-test** | 37 / 37 / **0** |
| applications_total / test / **non-test** | 35 / 35 / **0** |
| admins_total / **non-test** | 2 / **0** |
| participants / payments | 17 / 17 |
| tickets / email_events | 14 / 69 |

**No non-test data was found.** Cleanup was therefore safe to proceed (and the SQL guard re-checked this at execution time).

## 3. Cleanup SQL strategy
- Single transaction (`BEGIN`…`COMMIT`), `ON_ERROR_STOP=1`.
- **Guard:** a `DO` block that raises and aborts if any non-`@tenxpros.test` user exists at run time (it did not).
- **Explicit ordered `DELETE`s, children → parents** (FK-safe; most `User` relations are `RESTRICT`). **No `TRUNCATE CASCADE`.**
- **Preserves** config/catalog: `Module`, `PricingTier`, `Badge`, `AdminSetting`, `_prisma_migrations`.

## 4. Tables affected (rows deleted — matched the dry-run exactly)
`DossierSection` 204 · `ParticipantModule` 187 · `AuditLog` 91 · `EmailEvent` 69 · `User` 37 · `Application` 35 · `SiteEvent` 35 · `ParticipantBadge` 28 · `TicketMessage` 26 · `Dossier` 17 · `DiagnosticIntake` 17 · `ProgramPath` 17 · `PaymentRecord` 17 · `ParticipantProfile` 17 · `Feedback` 16 · `Ticket` 14 · `CertificationReview` 12 · `DirectoryProfile` 12 · `Notification` 0 · `Account` 0 · `Session` 0 · `VerificationToken` 0. Execution exit code 0, `COMMIT` succeeded.

## 5. Post-cleanup counts
| Metric | Count | Expected |
|---|--:|---|
| users_total / test_domain | 0 / 0 | 0 / 0 ✅ |
| applications_total / test_domain | 0 / 0 | 0 / 0 ✅ |
| admins_total | 0 | 0 ✅ |
| participants_total | 0 | 0 ✅ |
| payments_total | 0 | 0 ✅ |
| tickets_total | 0 | 0 ✅ |
| email_events_total | 0 | 0 ✅ |

**Preserved (unchanged):** `Module` 11 · `PricingTier` 5 · `Badge` 19 · `AdminSetting` 5 · `_prisma_migrations` 1. ✅

## 6. Route smoke check (live)
`/` 200 · `/apply` 200 · `/pricing` 200 · `/login` 200 · `/api/health` 200 · `/admin` 307 → login (protected). App fully functional after cleanup.

## 7. Confirmations
- **Non-test data found?** No — production contained only `@tenxpros.test` data.
- **Admin count now?** **0** (the 2 prior admins were `@tenxpros.test` and were removed). Production has no admin until the founder bootstrap.
- **Scope:** only the prepared cleanup SQL ran. No `.env.production` edit, no admin bootstrap, no founder admin created, no application submitted, no payment triggered, no deploy/restart, no destructive command outside the cleanup SQL.

## 8. Next required step
**Founder admin bootstrap** (separate, approval-gated): run `app/scripts/bootstrap-admin.mjs` for `mail@mehrdadnaderi.com` with a securely-supplied one-time password. After that: configure email env (Resend) + restart, then set `PAYMENT_LINK_FOUNDING` before accepting anyone.

> Note: the backup directory `/opt/tenxpros/backups/` is **not** git-ignored and contains DB dumps with password hashes. It is never staged here; recommend adding `backups/` to `.gitignore` or moving dumps off-repo.

## 9. Final git status
Working tree: only this report is new/uncommitted (`?? docs/design/TENXPROS_TEST_DATA_CLEANUP_REPORT.md`); branch `deployment/production-deployment-sprint-a` in sync with origin at `675f3b3`. **Not committed, not pushed, not deployed.**
