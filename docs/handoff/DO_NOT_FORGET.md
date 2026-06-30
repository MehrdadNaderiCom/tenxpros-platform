# Do Not Forget (before launch / before onboarding real partners)

The short list of things that must not slip. Grouped by when they matter.

## Before onboarding real partners

- [ ] **Prove the notification / re-pass flow with a real test partner.** Create a partner, give them academy progress, edit a lesson in `/admin/academy/content`, and confirm: the version bumps, the change history records it, a passed partner keeps their certificate and is notified, a not-yet-passed partner gets the latest version. Production has zero partners today, so this has never run live (Risk R4).
- [ ] **Decide the December 31 certificate policy.** There is no automated year-end expiry. Either build a scheduled expiry/renewal job, or accept manual annual renewal and make sure no copy implies automatic enforcement (Risk R3).
- [ ] **Confirm partner commission config is final.** Review `/admin/partners/config` rates, caps, and the origination window before money is owed; every change is audited.
- [ ] **Walk the partner journey end to end once** as a real partner: apply, activation gate, academy, pass a module, register a deal, see a commission line.

## Before public launch

- [ ] **Run an accessibility pass** (axe/Lighthouse + keyboard + screen reader) on the apply flow, a partner lesson, and the main admin tables (Risk R1).
- [ ] **Test mobile** at 360px / 768px / 1024px on the apply flow, partner lesson (incl. the journey table), and admin tables (Risk R2).
- [ ] **Replace form-preview placeholders** with real screenshots in the lessons that need them (use the "Needs screenshot" column in `ACADEMY_REVIEW_WORKBOOK.md`, then edit the lesson and insert the image).
- [ ] **Legal review** of: the no-promises language, the "private certification, not an accredited degree" framing, refund and terms pages, and any regulated-field wording in the academy. Use the "Needs legal review" checkboxes in the workbook.
- [ ] **Send a real newsletter test** to a seeded inbox and confirm deliverability (SPF/DKIM/one-click unsubscribe) before the first real campaign.

## Operational runbook (keep handy)

**Deploy (code change):**
1. `docker compose build tenxpros-app`
2. `docker compose up -d --no-deps --force-recreate tenxpros-app` (migrations apply on boot via `prisma migrate deploy`)
3. Verify `curl -s -o /dev/null -w "%{http_code}" http://localhost:3003/api/health` returns 200.

**Publish academy / reference content to production** (the normal Prisma seed refuses to run in prod by design):
1. `cd app && pnpm exec tsx scripts/dump-content.ts > /tmp/content.json`
2. `docker cp /tmp/content.json tenxpros-app:/tmp/content.json`
3. `docker compose exec -T tenxpros-app node scripts/seed-content.cjs /tmp/content.json`
   - This sanitizes and writes lesson `bodyHtml`, derives audio text, and **preserves superadmin-edited lessons** (any module with `contentVersion > 1` is left untouched), refreshing only unedited ones.

**Regenerate the review export / workbook** (after content changes):
- `pnpm exec tsx scripts/generate-academy-package.ts > docs/academy/partner-academy-review-package.md`
- `pnpm exec tsx scripts/generate-academy-workbook.ts > docs/handoff/ACADEMY_REVIEW_WORKBOOK.md`

## Security and config reminders

- [ ] **Never commit `.env.production`.** It is gitignored and holds real secrets (CRON secret, SMTP password for the newsletter mailbox, etc.). Before any commit, confirm `git check-ignore app/.env.production` and scan the staged diff for secrets.
- [ ] **Superadmin access** is controlled by `SUPER_ADMIN_EMAILS` (defaults to the two program owners). Confirm the right people, and only them, are listed in production.
- [ ] **Caddy contract:** `tenxpros.com` proxies to host `:3003`. Do not change the app port without updating the Caddyfile.
- [ ] **Cron secret:** the payment reminder/deadline automation is triggered by an authenticated endpoint guarded by `CRON_SECRET`; confirm the scheduler is configured and the secret matches.

## Content quality guardrails (already enforced, keep enforcing)

- [ ] No em or en dashes in shipped copy (a test fails the build if academy/terms content has any).
- [ ] No promises of jobs, income, certification, or outcomes anywhere in academy or marketing copy.
- [ ] The Pro / TenXPro definition stays consistent (one source: `src/lib/marketing/pro-definition.ts`).
- [ ] When sweeping the old dash-removal placeholder bug, grep all forms (`return ", "`, `? ", "`, `?? ", "`, `|| ", "`, `: ", "`), not just the operator forms.
