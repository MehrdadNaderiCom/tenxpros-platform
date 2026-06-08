# TenXPros — Intake Operations Bootstrap Report

**Date:** 2026-06-08
**Branch:** `deployment/production-deployment-sprint-a` · base `9d8e64a`
**Mode:** Read-only audit + small explicitly-permitted safe patches (payment-link resolution, pricing source, docs, bootstrap script). **No deploy, no commit, no push.** No real application submitted, no payment triggered, no secrets printed, no production DB mutated.

---

## 1. Current git / container state
- Working tree before this sprint: clean at `9d8e64a`. Container `tenxpros-app`: **Up, healthy**, `0.0.0.0:3003->3000` (matches Caddy `tenxpros.com → :3003`); `tenxpros-db` healthy.
- Live admin routes are **auth-protected** (`/admin`, `/admin/applications`, `/admin/payments`, `/admin/pricing`, `/portal` all `307 → /login?callbackUrl=…`); `/login` and `/set-password` return `200`.

## 2. Admin bootstrap status — **MISSING (action required)**
- Read-only DB check: **`mail@mehrdadnaderi.com` admin does NOT exist** (count = 0).
- The only ADMIN users are **2 accounts on `@tenxpros.test`** (dev/seed accounts), not the founder.
- `.env.production` sets `ADMIN_EMAIL` to an **`@tenxpros.com`** address (not the founder’s), and `prisma/seed.ts` **refuses to run when `NODE_ENV=production`** (`throw "Refusing to seed production database."`). So the normal seed cannot bootstrap the founder admin in prod.
- Auth secret is fine: `auth.ts` uses `AUTH_SECRET ?? NEXTAUTH_SECRET ?? SESSION_SECRET`, and **`SESSION_SECRET` is present** — login works once an admin exists.

### Secure bootstrap plan (prepared, NOT run — awaiting approval)
A safe, secret-free, idempotent script was added: **`app/scripts/bootstrap-admin.mjs`**. It reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from the environment (never hard-coded), refuses passwords < 12 chars, masks the email in output, never prints the password, and upserts a single `ADMIN` user. It does **not** seed demo data and is allowed under `NODE_ENV=production` (it only ensures the admin account).

**Exact command pattern (placeholders only):**
```bash
# 1) put secrets in a temporary protected env file (NOT committed, deleted after)
printf 'ADMIN_EMAIL=%s\nADMIN_PASSWORD=%s\n' "mail@mehrdadnaderi.com" "<ONE-TIME-STRONG-PASSWORD>" > /tmp/boot.env
chmod 600 /tmp/boot.env

# 2) the script ships in app/scripts; it is already in the running image,
#    OR (without a redeploy) copy it in first:
docker cp app/scripts/bootstrap-admin.mjs tenxpros-app:/app/scripts/bootstrap-admin.mjs

# 3) run it once inside the app container (DATABASE_URL resolves there)
docker compose exec -T --env-file /tmp/boot.env tenxpros-app node scripts/bootstrap-admin.mjs

# 4) destroy the secret file immediately
rm -f /tmp/boot.env
```
**Login can be tested safely afterward** at `https://tenxpros.com/login` with the founder email + the one-time password; rotate the password after first login. (No change-password screen exists yet — see §8 / next sprint.)

> **STOP / approval needed:** I did not run any command that uses the real admin password. Approve and supply (or set) the one-time password, and confirm whether to bootstrap now or after the next deploy.

## 3. Email readiness — **NOT configured (blocker for outreach)**
- `EMAIL_PROVIDER` **missing**, `RESEND_API_KEY` **missing**, `EMAIL_FROM` **missing**.
- `email.ts` defaults: `provider = "console"` when unset → **emails are only `console.log`’d, not delivered** (and are still recorded in `EmailEvent` as `status:"sent"`, which is misleading). Sender defaults to **`TenXPros <hello@tenxpros.com>`** ✓.
- Emails that fire today (to console only): **application submitted** (`application_received`), **accepted + payment link** (`application_accepted_payment_link`), **status update** (revise/not-accepted), and **enrollment/password-setup** (welcome email in `markPaymentReceivedAndEnroll`).
- Official sender = `hello@tenxpros.com` ✓ (via `EMAIL_FROM` default). Support channel `support@tenxpros.com` is used in site copy/policies but is **not** an env var (no `SUPPORT_EMAIL` key; it is hard-coded in copy only).
- **To enable real sending:** set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=…`, and (optionally) `EMAIL_FROM="TenXPros <hello@tenxpros.com>"`. No real email was sent during this audit.

## 4. Payment-provider readiness — **provider-agnostic now; no link configured yet**
- Finding: the resolver was **Stripe-key-specific** (`STRIPE_PAYMENT_LINK_*`), but the **user-facing acceptance email already says “manual payment link”** (not “Stripe”) and falls back to the literal `"Manual payment link pending"` when nothing is set. No public/user copy says “Stripe.”
- **Patch applied (link resolution/naming only — no payment/enrollment logic changed):** `paymentLinkForTier` is now provider-agnostic. Resolution order: `PAYMENT_LINK_<TIER>` → `STRIPE_PAYMENT_LINK_<TIER>` (backward compatible) → `PAYMENT_LINK_FOUNDING` → `STRIPE_PAYMENT_LINK_FOUNDING` → safe placeholder. So a **Wise or manual URL** can be used by setting `PAYMENT_LINK_FOUNDING`. Implementation extracted to a pure module `app/src/lib/services/payment-link.ts` and re-exported from `email.ts` (callers unchanged); covered by `tests/payment-link.test.ts` (5 cases).
- The deployment doc `docs/deployment/STRIPE_PAYMENT_LINKS.md` was rewritten to be **provider-agnostic** (Wise/manual/Stripe, generic + legacy keys, corrected Standard price).
- Pricing tier in the acceptance flow reads `PricingTier.price` from the **DB** (fallback `997`), not from a payment provider — so no provider lock-in there.
- **Still required before accepting anyone:** set at least `PAYMENT_LINK_FOUNDING` (Wise/manual/Stripe URL) in production env. Until then the acceptance email shows `Manual payment link pending`.

## 5. Pricing drift — **fixed at source; live DB still needs reconciliation**
- Marketing advertises **future Standard $2,497**. `program-data.ts` had Standard **$1,997**; the **live DB `PricingTier`** also shows **$1,997** (Standard, inactive). Founding `$997` (active) matches everywhere.
- **Change applied:** `program-data.ts` Standard `1997 → 2497` (source of truth for seeds; low-risk; tests pass). This aligns the source and the (unrendered) legacy grid with the public page.
- **Live DB not mutated** (per rules). The live Standard tier is **inactive** and not sold yet, so this is low-urgency. Reconcile via `/admin/pricing` (edit the Standard price) or an approved one-off update when convenient. Not a launch blocker (the active Founding tier is consistent at $997).

## 6. Application intake anti-abuse
- **Present:** duplicate-email guard in `submitApplication` (active applications per email are blocked with a friendly message); zod validation (`applicationSchema`) with min-lengths and required consent; server action returns structured `{ok,message}`; one application per user (`Application.userId` unique).
- **Missing:** no rate limiting, no bot/honeypot, no Turnstile/CAPTCHA.
- **Next-sprint plan (not implemented here, to avoid risky backend changes):** add a lightweight honeypot field (zero-risk, client+schema) and IP/time-window rate limiting (e.g., Upstash or a small in-memory/edge limiter) on the submit action; optionally Cloudflare Turnstile if abuse appears.

## 7. Admin / operator path status
- **Application review:** ✅ `/admin/applications` + `/admin/applications/[id]` with `updateApplicationStatus` (SUBMITTED→UNDER_REVIEW→ACCEPTED/REVISE/NOT_ACCEPTED→ENROLLED), audit-logged, with status emails.
- **Accept → payment → enroll:** ✅ ACCEPTED auto-creates a PENDING `PaymentRecord` + sends the payment-link email; admin then `markPaymentReceivedAndEnroll` creates the participant profile, path, dossier (12 sections), modules, flips role to PARTICIPANT, and issues a **set-password token (7-day)**.
- **Password setup token flow:** ✅ `/set-password` + `setParticipantPassword`. **Change-password / forgot-password: missing.**
- **Support tickets:** ✅ full CRUD (`/admin/tickets`, `/portal/tickets`) with monthly fair-use limit.
- **Stub/partial:** `/admin/analytics*`, `/admin/reports`, `/admin/email/templates`, `/portal/feedback`. Stripe webhook automation absent (manual confirm by design).

## 8. Production data note — **test data present (cleanup recommended)**
- The production DB currently holds **37 users / 35 applications, ALL on `@tenxpros.test`** (18 SUBMITTED + 17 ENROLLED, 17 participant profiles, 17 payment records, 69 email events, 2 `@tenxpros.test` admins). This is **test/demo data, not real applicants.**
- **Recommendation:** before real intake, clean the `@tenxpros.test` data from production via an **approved, backed-up, reversible** process (do not delete without a snapshot). Note: `Founding` `membersLimit` is `10` while 17 test enrollments exist; if any cap logic keys off enrollments, reset it as part of cleanup. **Not performed** (destructive + not approved).

## 9. Files

**Inspected (no secrets printed):** `.env.production` (key names only, redacted), `app/prisma/seed.ts`, `app/src/lib/actions/applications.ts`, `app/src/lib/services/email.ts`, `app/src/lib/auth.ts`, `app/src/lib/program-data.ts`, `docs/deployment/STRIPE_PAYMENT_LINKS.md`, `docker-compose.yml`, admin/auth route protection (live), and the production DB (read-only aggregates).

**Changed (this sprint, uncommitted):**
- `app/src/lib/services/payment-link.ts` — **new**, provider-agnostic resolver.
- `app/src/lib/services/email.ts` — re-export `paymentLinkForTier`; removed the Stripe-specific inline version.
- `app/tests/payment-link.test.ts` — **new**, 5 tests.
- `app/src/lib/program-data.ts` — Standard `1997 → 2497`.
- `docs/deployment/STRIPE_PAYMENT_LINKS.md` — provider-agnostic rewrite.
- `app/scripts/bootstrap-admin.mjs` — **new**, safe one-time admin bootstrap (NOT run).
- `docs/design/TENXPROS_INTAKE_OPERATIONS_BOOTSTRAP_REPORT.md` — this report.

**Not changed:** Prisma schema, migrations, `seed.ts`, auth logic, server actions (`applications.ts` unchanged), admin/portal pages, payment/enrollment logic, public-site copy, the live DB.

## 10. Tests run
| Command | Result |
| --- | --- |
| `pnpm typecheck` | **PASS** |
| `pnpm test` | **PASS** — 6 files, **21/21** (was 16; +5 payment-link) |
| `pnpm build` | **PASS** |

---

## 11. Final recommendation — **HOLD outreach until 3 operational items are done**

The **code and public site are ready**; the **operational configuration is not**. In priority order:

1. **Hold until email is configured** — without `EMAIL_PROVIDER`/`RESEND_API_KEY`, applicants receive **no** “application received” email and the site’s promised **48-hour email reply cannot be met**. This is the first blocker for any outreach.
2. **Hold until founder admin is bootstrapped** — run `bootstrap-admin.mjs` for `mail@mehrdadnaderi.com` (awaiting approval + one-time password), so applications can actually be reviewed/accepted.
3. **Hold until a payment link is configured** — set `PAYMENT_LINK_FOUNDING` (Wise/manual/Stripe) before *accepting* anyone; not needed merely to *collect* applications.

Additionally (not strict blockers, strongly recommended before real intake): **clean the `@tenxpros.test` test data** from production (approved + backed up), and reconcile the **live DB Standard price** to `$2,497`.

**Can selected early applications start?** The form will *capture* them now, but **do not begin outreach until email is configured and the founder admin exists** — otherwise applicants get silence and you cannot act on them. After those two, you can collect and review; configure the payment link before issuing any acceptance.

**No commit. No push. No deploy.** Awaiting review/approval (especially to run the admin bootstrap).
