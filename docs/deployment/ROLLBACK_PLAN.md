# TenXPros Rollback Plan

Generated: 2026-05-16

Rollback is an operational process, not only a Git command. App rollback can usually be fast. Database rollback is not automatic and must be handled deliberately.

## Last Known Good Tags

Use these as known checkpoints:

- `tenxpros-mvp-acceptance-pass`
- `tenxpros-launch-hardening-sprint-1`
- `tenxpros-site-polish-sprint-1`
- `tenxpros-production-setup-sprint-1`
- `tenxpros-full-lifecycle-e2e-sprint-1`

Before any deployment, write down:

- current production commit
- target deployment commit
- database migration version before deploy
- database migration version after deploy
- hosting provider deployment ID

## Vercel Rollback

If using Vercel:

1. Open the Vercel project deployments list.
2. Identify the previous healthy deployment.
3. Promote or roll back to that deployment according to Vercel’s deployment UI.
4. Confirm production domain routes to the expected deployment.
5. Run:

```bash
cd app
npm run launch:smoke -- --base-url https://YOUR_DOMAIN
curl -fsS https://YOUR_DOMAIN/api/health
```

6. Check admin login, `/apply`, and `/pricing` manually.

## Docker Or Other Hosting Rollback

If using Docker or another host:

1. Identify the previous healthy image or Git commit.
2. Redeploy that image/commit through the hosting provider.
3. Keep environment variables unchanged unless the incident is env-related.
4. Run `/api/health` and route smoke checks.
5. Confirm logs do not show auth, database, or migration errors.

## Database Migration Rollback Posture

Database rollback is not automatic.

For the current launch:

- Prefer forward-compatible migrations.
- Avoid destructive migrations close to launch.
- Take a backup before running `npx prisma migrate deploy`.
- If a migration fails, stop the deployment and diagnose before retrying.
- If the app deploy fails after a successful migration, prefer rolling the app forward or back only if the previous app version is compatible with the migrated schema.

Do not run ad hoc SQL rollback commands without a written recovery plan.

## If Deployment Fails After Migration

1. Keep the database online.
2. Capture the failing deployment logs.
3. Confirm whether the previous app version can run against the migrated schema.
4. If compatible, roll the app back through the hosting provider.
5. If not compatible, deploy a fix-forward build.
6. If data integrity is at risk, stop writes by pausing public application intake or taking the app into maintenance at the hosting layer.
7. Restore from backup only after confirming acceptable data loss and writing the restore plan.

## Solo Founder Escalation Notes

For a solo-founder launch, write these down before deployment:

- hosting provider login location
- database provider login location
- DNS provider login location
- Resend login location
- Stripe login location
- password manager location
- backup location
- emergency contact or technical helper, if any

If a launch issue affects applicants or participants:

1. Pause public promotion.
2. Preserve logs and evidence.
3. Restore core routes first: `/`, `/apply`, `/login`, `/api/health`.
4. Communicate only what is known.
5. Resume promotion after smoke checks pass.
