# TenXPros Production Environment

This document is the production environment source for TenXPros launch setup. Store real values only in the hosting provider, secret manager, or controlled local deployment shell. Do not commit real secrets.

## How To Run The Check

From `app/`:

```bash
npm run launch:env-check
```

Optional modes:

```bash
npm run launch:env-check -- --mode production
npm run launch:env-check -- --mode local
npm run launch:env-check -- --file ../.env.production
```

Production mode is the default. Local mode is only for Docker/development acceptance and is not enough for public launch.

## Required Variables

| Variable | Required | Secret | Public | Example placeholder | Purpose |
| --- | --- | --- | --- | --- | --- |
| `DATABASE_URL` | Production + local | Yes | No | `postgresql://USER:PASSWORD@HOST:5432/tenxpros?sslmode=require` | PostgreSQL connection string for Prisma. |
| `AUTH_SECRET` | Production + local | Yes | No | `replace-with-32-plus-random-chars` | Primary Auth.js secret. |
| `NEXTAUTH_SECRET` | Production | Yes | No | `replace-with-32-plus-random-chars` | NextAuth/Auth.js compatibility secret. |
| `SESSION_SECRET` | Production | Yes | No | `replace-with-32-plus-random-chars` | Compatibility fallback used by existing auth config. |
| `AUTH_TRUST_HOST` | Production + local | No | No | `true` | Allows Auth.js to trust the configured host. |
| `AUTH_URL` | Production | No | Yes | `https://tenxpros.com` | Canonical Auth.js production origin. |
| `NEXTAUTH_URL` | Production | No | Yes | `https://tenxpros.com` | NextAuth compatibility production origin. |
| `APP_URL` | Production + local | No | Yes | `https://tenxpros.com` | Server-side canonical app origin. |
| `NEXT_PUBLIC_APP_URL` | Production + local | No | Yes | `https://tenxpros.com` | Browser-visible app origin. |
| `ADMIN_EMAIL` | Production + local | Operational secret | No | `founder@tenxpros.com` | Controlled admin bootstrap email. |
| `ADMIN_PASSWORD` | Production + local | Yes | No | `replace-with-strong-unique-password` | Controlled admin bootstrap password; rotate after use. |
| `EMAIL_PROVIDER` | Production + local | No | No | `resend` | Email provider selector. Production launch expects `resend`. |
| `RESEND_API_KEY` | Production | Yes | No | `re_replace_with_resend_key` | Resend API key for transactional emails. |
| `EMAIL_FROM` | Production + local | No | Public sender | `TenXPros <hello@tenxpros.com>` | Verified sender identity. |
| `STRIPE_PAYMENT_LINK_FOUNDING` | Production | No | Payment URL | `https://buy.stripe.com/FOUNDING_PLACEHOLDER` | Manual payment link for Founding Charter. |
| `STRIPE_PAYMENT_LINK_EARLY` | Production | No | Payment URL | `https://buy.stripe.com/EARLY_PLACEHOLDER` | Manual payment link for Early Charter. |
| `STRIPE_PAYMENT_LINK_LATE` | Production | No | Payment URL | `https://buy.stripe.com/LATE_PLACEHOLDER` | Manual payment link for Late Charter. |
| `STRIPE_PAYMENT_LINK_FINAL` | Production | No | Payment URL | `https://buy.stripe.com/FINAL_PLACEHOLDER` | Manual payment link for Final Charter. |
| `STRIPE_PAYMENT_LINK_STANDARD` | Production | No | Payment URL | `https://buy.stripe.com/STANDARD_PLACEHOLDER` | Manual payment link for Standard pricing. |

Payment links are not API secrets, but they should still be managed as operational configuration so inactive tiers are not accidentally shared.

## Local Docker Values Vs Production Values

Local Docker acceptance may use:

```bash
DATABASE_URL=postgresql://tenxpros:tenxpros_dev@db:5432/tenxpros
APP_URL=http://localhost:3003
NEXT_PUBLIC_APP_URL=http://localhost:3003
AUTH_URL=http://localhost:3003
NEXTAUTH_URL=http://localhost:3003
AUTH_TRUST_HOST=true
EMAIL_PROVIDER=console
EMAIL_FROM=TenXPros <hello@tenxpros.test>
```

Production must use:

- Hosted PostgreSQL with SSL where the provider requires it.
- Real production domain values for `APP_URL`, `NEXT_PUBLIC_APP_URL`, `AUTH_URL`, and `NEXTAUTH_URL`.
- `https://` URLs only.
- `EMAIL_PROVIDER=resend`.
- A verified `EMAIL_FROM` domain.
- Real manual Stripe Payment Links for all five tiers.
- Strong unique auth/admin secrets generated outside the repository.

## Vercel Or Hosting Setup Notes

For Vercel-style deployment:

- Project root directory: `app`.
- Install command: use the package manager lockfile, usually `pnpm install --frozen-lockfile`.
- Build command: `pnpm build`.
- Runtime: Node.js 20 or newer.
- Configure all production environment variables in the hosting dashboard.
- Do not rely on root `.env.production` for hosted production. The hosting provider should own production values.
- Confirm the production domain is attached before final auth verification.

For Docker-style deployment:

- Build from the repository root with `docker compose up -d --build` only for local acceptance.
- For production Docker, use a separate production compose file or deployment platform secrets. Do not reuse local database credentials.

## Database Migration

Run migrations against production after `DATABASE_URL` is configured:

```bash
cd app
npx prisma migrate deploy
```

Do not run `prisma migrate dev` against production.

## Seed Warning

Do not run `prisma/seed.ts` in production.

The seed script refuses `NODE_ENV=production`, and production should not depend on seed credentials or test data. Seed is for local/dev acceptance only.

## Admin Account Creation

Production admin creation should be controlled and auditable:

1. Use a strong unique admin email and password.
2. Create the first admin through a one-off controlled script or admin console that is not committed with secrets.
3. Confirm the admin can log in.
4. Rotate or remove any bootstrap password after launch setup.
5. Restrict admin account count to known operators.
6. Review the audit log after launch actions.

See [ADMIN_HARDENING.md](./ADMIN_HARDENING.md) for operational security notes.
