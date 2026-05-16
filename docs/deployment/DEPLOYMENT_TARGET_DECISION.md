# TenXPros Deployment Target Decision

Generated: 2026-05-16

## Recommendation

Use Vercel as the default deployment platform for the first staging/production-ready TenXPros deployment.

Reason:
- The application is a Next.js 14 App Router app.
- The application package already lives cleanly under `app/`.
- The build command is standard Next.js.
- The database is external PostgreSQL through Prisma, which works well with Vercel when `DATABASE_URL` is configured.
- Launch operations are mostly environment, migration, email, payment-link, and smoke-test discipline rather than container orchestration.

## Is Vercel Still The Best Default?

Yes, for the current codebase.

Vercel is the lowest-friction default because TenXPros does not currently require custom long-running workers, custom networking, persistent local file storage, or full container orchestration for launch. The MVP uses server-rendered routes, server actions, Auth.js, Prisma, and external services.

Vercel should not be treated as final forever. If TenXPros later adds background jobs, heavy document/PDF generation, queues, or custom observability requirements, a Docker-oriented platform may become more attractive.

## Required Vercel Settings

Set these in the Vercel project:

| Setting | Value |
| --- | --- |
| Project root | `app` |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build` |
| Output directory | Vercel-managed Next.js output; do not set a custom static output directory |
| Framework preset | Next.js |
| Node.js version | Node.js 20 or newer |

Environment variables must be configured in Vercel, not committed:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXTAUTH_SECRET`
- `SESSION_SECRET`
- `AUTH_TRUST_HOST`
- `AUTH_URL`
- `NEXTAUTH_URL`
- `APP_URL`
- `NEXT_PUBLIC_APP_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `EMAIL_PROVIDER`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `STRIPE_PAYMENT_LINK_FOUNDING`
- `STRIPE_PAYMENT_LINK_EARLY`
- `STRIPE_PAYMENT_LINK_LATE`
- `STRIPE_PAYMENT_LINK_FINAL`
- `STRIPE_PAYMENT_LINK_STANDARD`

Run from `app/` before deployment:

```bash
npm run launch:env-check -- --mode production
```

For Vercel, run the check locally only with a controlled production-like env file or in a shell where the same values are loaded. Do not paste secret values into reports.

## Production Database

Use hosted PostgreSQL. Recommended minimum:

- SSL-capable connection string.
- Scheduled backups enabled before launch.
- Separate production database from local Docker and staging.
- Migration command:

```bash
cd app
npx prisma migrate deploy
```

Do not run:

```bash
npx prisma migrate dev
npm run db:seed
```

against production.

## Docker Deployment Alternative

Use Docker deployment if:

- You want one containerized runtime across local, staging, and production.
- You choose a platform such as Fly.io, Render, Railway, DigitalOcean App Platform, or a VPS.
- You need tighter control over OS packages or runtime behavior.
- You want to colocate migrations and app startup in a controlled release process.

If Docker is used for production:

- Do not reuse local `docker-compose.yml` credentials.
- Use platform-managed secrets.
- Use a managed PostgreSQL service or a separately backed-up PostgreSQL instance.
- Run `npx prisma migrate deploy` as a controlled release step before traffic is sent to the new app.
- Keep `/api/health` wired to uptime checks.

## Current Deployment Blockers

No code-level deployment blocker was found in this sprint.

Operational blockers remain:

- Production domain is not configured in this environment.
- Production PostgreSQL `DATABASE_URL` is not configured in this environment.
- Production auth secrets and URL values are missing.
- Resend API key and verified sender domain are missing.
- Stripe Payment Links for all five tiers are missing.
- Production admin bootstrap process still needs controlled execution.
- Backups, uptime monitoring, DNS, SSL, and rollback ownership must be confirmed before public launch.

Because these values are not available here, no real production deployment was performed.
