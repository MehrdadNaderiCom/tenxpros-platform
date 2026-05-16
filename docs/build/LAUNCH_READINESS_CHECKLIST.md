# TenXPros Launch Readiness Checklist

Updated: 2026-05-16

## Current Completed State

- [x] MVP core lifecycle accepted end to end.
- [x] Launch hardening sprint 1 merged into `main`.
- [x] Site/product polish sprint 1 merged into `main`.
- [x] Browser E2E smoke coverage exists.
- [x] Dossier submit locking and practical autosave are implemented.
- [x] Print-ready dossier/certificate output exists.
- [x] Production env check command exists: `npm run launch:env-check`.
- [x] Production smoke command exists: `npm run launch:smoke`.
- [x] Deployment documentation exists under `docs/deployment/`.

## Deployment Documentation

- [Production environment](../deployment/PRODUCTION_ENVIRONMENT.md)
- [Production deployment checklist](../deployment/PRODUCTION_DEPLOYMENT_CHECKLIST.md)
- [Resend setup](../deployment/RESEND_SETUP.md)
- [Stripe Payment Links](../deployment/STRIPE_PAYMENT_LINKS.md)
- [Admin hardening](../deployment/ADMIN_HARDENING.md)

## Required Before Production Launch

- [ ] Configure production `DATABASE_URL` for PostgreSQL.
- [ ] Set `AUTH_SECRET`, `NEXTAUTH_SECRET`, and `SESSION_SECRET` to strong unique values.
- [ ] Set `AUTH_TRUST_HOST=true`.
- [ ] Configure `AUTH_URL`, `NEXTAUTH_URL`, `APP_URL`, and `NEXT_PUBLIC_APP_URL` to the production `https://` domain.
- [ ] Configure production `ADMIN_EMAIL` and a strong temporary `ADMIN_PASSWORD` only through secure provider secrets or controlled bootstrap.
- [ ] Configure Resend sender domain, SPF, DKIM, and DMARC.
- [ ] Set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and verified `EMAIL_FROM`.
- [ ] Create manual Stripe Payment Links for each charter tier and set all `STRIPE_PAYMENT_LINK_*` values.
- [ ] Run `cd app && npm run launch:env-check` against production variables and confirm it passes.
- [ ] Run `cd app && npx prisma migrate deploy` against production.
- [ ] Do not run `prisma/seed.ts` in production; the script refuses `NODE_ENV=production`.
- [ ] Create a strong production admin account through a controlled one-off script or admin console.
- [ ] Remove or rotate any bootstrap admin credentials after production setup.
- [ ] Confirm `/`, `/apply`, `/pricing`, `/login`, `/api/health`, and `/verify/[code]` respond correctly.
- [ ] Confirm unauthenticated `/admin` and `/portal` redirect to `/login`.
- [ ] Confirm admin credentials login works on the production domain.
- [ ] Confirm backups, logs, and uptime monitoring are active.
- [ ] Confirm Terms, Privacy, and Refund pages receive founder/legal review.

## Production Smoke Commands

From `app/` after deployment:

```bash
npm run launch:smoke -- --base-url https://tenxpros.com
```

If a test badge exists:

```bash
npm run launch:smoke -- --base-url https://tenxpros.com --verify-code REPLACE_WITH_CODE
```

## Deferred By Launch Scope

- Full Stripe Checkout and webhook automation.
- Inline dossier annotations.
- Public directory population before certified participants exist.
- TenXPro Radar paid subscription automation.
- Admin 2FA.
- Stored binary PDF generation for certificate/dossier output if print-ready output is deemed insufficient.

## Final Public Announcement Gate

- [ ] Production env check passes.
- [ ] Production smoke check passes.
- [ ] Email delivery is verified outside console/dev mode.
- [ ] Manual Stripe Payment Links are verified.
- [ ] Application flow is verified in production.
- [ ] Admin enrollment flow is verified in production with non-customer test data.
- [ ] Monitoring and backups are active.
- [ ] No real secrets are present in git history, docs, or screenshots.
