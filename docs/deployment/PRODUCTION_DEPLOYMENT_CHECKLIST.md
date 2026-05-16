# TenXPros Production Deployment Checklist

Use this checklist for the first real deployment and for later production releases.

## 1. Pre-Deploy Checks

- [ ] Confirm `main` is clean and pushed.
- [ ] Confirm latest launch tag is known.
- [ ] Run from `app/`:

```bash
npm run lint
npm run typecheck
npm run build
npm run test
npx prisma validate
npm run test:e2e
npm run launch:env-check
```

- [ ] Confirm `npm run launch:env-check` passes against production variables.
- [ ] Confirm no real secrets are committed.

## 2. Vercel Or Hosting Setup

- [ ] Set the project root directory to `app`.
- [ ] Use Node.js 20 or newer.
- [ ] Use `pnpm install --frozen-lockfile` for install if the host asks.
- [ ] Use `pnpm build` for build.
- [ ] Configure production env vars in the hosting provider, not in committed files.
- [ ] Set the production domain before final auth testing.

## 3. PostgreSQL Setup

- [ ] Create production PostgreSQL database.
- [ ] Enable SSL if required by the provider.
- [ ] Configure backups before launch.
- [ ] Store `DATABASE_URL` in the hosting provider.
- [ ] Verify the database is not a local Docker database.

## 4. Prisma Migration Deploy

Run:

```bash
cd app
npx prisma migrate deploy
```

- [ ] Confirm migrations complete.
- [ ] Do not run `prisma migrate dev` in production.
- [ ] Do not run `prisma/seed.ts` in production.

## 5. Resend Setup

- [ ] Authenticate the sending domain.
- [ ] Configure SPF, DKIM, and DMARC.
- [ ] Set `EMAIL_PROVIDER=resend`.
- [ ] Set `RESEND_API_KEY`.
- [ ] Set `EMAIL_FROM` to a verified sender.
- [ ] Send and verify a real transactional test email.

See [RESEND_SETUP.md](./RESEND_SETUP.md).

## 6. Stripe Payment Links Setup

- [ ] Create the five manual Payment Links.
- [ ] Confirm prices and descriptions match the charter tiers.
- [ ] Set all `STRIPE_PAYMENT_LINK_*` env vars.
- [ ] Confirm accepted-applicant email includes the correct link.
- [ ] Confirm manual enrollment after payment remains the launch workflow.

See [STRIPE_PAYMENT_LINKS.md](./STRIPE_PAYMENT_LINKS.md).

## 7. Domain, DNS, And SSL

- [ ] Configure production domain.
- [ ] Configure DNS records at the registrar/DNS provider.
- [ ] Confirm SSL certificate is active.
- [ ] Confirm `APP_URL`, `NEXT_PUBLIC_APP_URL`, `AUTH_URL`, and `NEXTAUTH_URL` all use the production `https://` origin.
- [ ] Confirm www/non-www canonical choice.

## 8. Admin Account Creation

- [ ] Remove or rotate any seeded local admin credentials.
- [ ] Create a strong production admin account through a controlled process.
- [ ] Do not commit admin credentials.
- [ ] Restrict admin account count.
- [ ] Document 2FA as a post-launch security improvement if not implemented.

See [ADMIN_HARDENING.md](./ADMIN_HARDENING.md).

## 9. Backup Verification

- [ ] Confirm scheduled database backups are enabled.
- [ ] Confirm restore procedure is documented.
- [ ] Confirm logs are retained by the hosting/database providers.
- [ ] Confirm a human knows where backups live.

## 10. Monitoring And Health Check

- [ ] Confirm `/api/health` returns `{"ok":true}`.
- [ ] Configure uptime monitoring for `/api/health`.
- [ ] Configure application error monitoring or provider logs.
- [ ] Confirm alert recipient.

## 11. Smoke Test After Deploy

Run:

```bash
cd app
npm run launch:smoke -- --base-url https://tenxpros.com
```

If a test badge exists:

```bash
npm run launch:smoke -- --base-url https://tenxpros.com --verify-code REPLACE_WITH_CODE
```

Also verify in the browser:

- [ ] `/`
- [ ] `/apply`
- [ ] `/pricing`
- [ ] `/login`
- [ ] `/api/health`
- [ ] `/admin` redirects to login, then admin login works.
- [ ] `/portal` redirects to login.
- [ ] `/verify/[code]` works when a badge exists.

## 12. Rollback Plan

- [ ] Keep the previous successful commit/tag available.
- [ ] Confirm hosting provider rollback mechanism.
- [ ] Confirm database migrations are forward-compatible before deploy.
- [ ] If rollback needs database action, stop and write a specific rollback plan before launch.
- [ ] Keep a copy of the deployment env var set in the provider UI or secret manager.

## 13. Final Go/No-Go

- [ ] Env check passes in production mode.
- [ ] Build and tests pass.
- [ ] Production migration deploy passes.
- [ ] Health check passes.
- [ ] Admin login works.
- [ ] Application form submits in production.
- [ ] Accepted-applicant payment placeholder/manual flow is verified.
- [ ] Email delivery works.
- [ ] Backups and monitoring are active.
- [ ] Founder/legal review is complete for Terms, Privacy, and Refund pages.
- [ ] No launch-critical blocker remains.
