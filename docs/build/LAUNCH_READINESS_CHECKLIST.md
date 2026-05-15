# TenXPros Launch Readiness Checklist

## Required before production launch

- Configure production `DATABASE_URL` for PostgreSQL.
- Set `AUTH_SECRET`, `NEXTAUTH_SECRET`, and `SESSION_SECRET` to strong unique values.
- Configure `APP_URL` and `NEXT_PUBLIC_APP_URL` to the production domain.
- Configure Resend sender domain, SPF, DKIM, and DMARC.
- Set `EMAIL_PROVIDER=resend` and `RESEND_API_KEY`.
- Create manual Stripe Payment Links for each charter tier and set `STRIPE_PAYMENT_LINK_*`.
- Run `prisma migrate deploy` against production.
- Do not run `prisma/seed.ts` in production; the script refuses `NODE_ENV=production`.
- Create a strong production admin account through a controlled one-off script or admin console.
- Confirm `/`, `/apply`, `/pricing`, `/login`, `/api/health`, and `/verify/[code]` respond correctly.
- Confirm backups, logs, and uptime monitoring are active.

## Deferred by launch scope

- Full Stripe Checkout and webhook automation.
- Inline dossier annotations.
- Public directory population before certified participants exist.
- TenXPro Radar paid subscription automation.
