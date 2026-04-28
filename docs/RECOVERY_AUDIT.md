# TenXPros — Recovery Audit (M0, 2026-04-27)

> The previous run had crashed mid-build. This document captures the
> state I found, what I fixed, and what is still open. The earlier
> placeholder-era audit is preserved at
> [`RECOVERY_AUDIT_PHASE0.md`](RECOVERY_AUDIT_PHASE0.md).

## 1. Current project state

A substantial Next.js 14 App Router scaffold already existed under
`/opt/tenxpros/app`. Key facts:

- Package manager: **pnpm 9.15.9** (corepack-managed; `packageManager`
  pinned in `package.json`).
- Stack: Next.js 14.2.18, React 18.3, TypeScript 5.6 (strict),
  Tailwind 3.4, Prisma 5.22, Zod 3, bcryptjs.
- Database: Postgres 16 in `tenxpros-db` (host port 5433). Container
  was **not running** when I started; brought up via
  `docker compose up -d db`.
- Schema present at `app/prisma/schema.prisma` (~25 KB, full domain
  model). **No migrations directory** existed; ran `pnpm db:migrate
  --name init` to create one.
- No seed file. `package.json` referenced `prisma/seed.ts`, but the
  file didn't exist.
- 80+ `page.tsx` / `actions.ts` / `route.ts` files under `app/src/app`,
  covering public marketing, professional dashboard, admin, employer
  portal, sign-in/up/out, public certificate verification, public
  professional profiles, and a health endpoint.
- Library code in `src/lib`: db (Prisma singleton), auth
  (HMAC-signed cookie sessions, bcrypt passwords), AI provider
  abstraction with mock + OpenRouter providers, eligibility evaluator,
  heuristic task classifier, Zod validators, helpers.
- Reasonable component primitives in `src/components/ui` and three
  navs (`public-nav`, `app-nav`, `admin-nav`, `employer-nav`) plus a
  `public-footer`.
- `_legacy_placeholder/` retained the original nginx + static `html/`
  setup for safe revert.
- `docker-compose.yml` was modified (uncommitted) and only ran the
  `db` service; the placeholder `tenxpros-web` nginx was still defined
  but not mapped to a host port any more.

## 2. What has been completed

- Full domain schema (`User`, `ProfessionalProfile`,
  `OrganizationProfile`, learning hierarchy, scenarios + rubrics,
  evidence, certificates, employer needs/requests/matches, AI run
  log, audit log, system settings).
- All public marketing pages: home, professionals, organizations,
  certification, learning-system, pricing, about, contact (with
  working server action that writes to `AuditLog`).
- Sign-up / sign-in / sign-out flows with role-aware redirects.
- Professional dashboard (`/dashboard`) with KPIs, lifecycle tracker,
  L1/L2 eligibility, recommended next action — all backed by real
  Prisma queries.
- Diagnostic, profile, public-profile editor, tasks (list + new),
  scenarios (list + detail + submit), evidence (list + new),
  certificates (eligibility + submit-for-review), opportunities,
  settings.
- Public certificate verification at `/verify/[id]` and public
  professional profiles at `/pros/[slug]`.
- Employer portal: dashboard, organization profile, role needs (list
  + new), browse, request, matches, settings.
- Admin: overview, professionals (users), organizations, learning,
  scenarios, rubrics, evidence (with detail + actions), certifications
  (with detail + actions), employer-requests, matches, ai-runs,
  settings, docs.
- AI provider abstraction (`provider.ts`, `router.ts`, mock + openrouter
  providers, prompt template registry with versioning).
- Eligibility evaluator covering all five `CertificateLevel` values.
- Heuristic task-classifier (`src/lib/tasks/classifier.ts`) used as a
  no-AI fallback.

## 3. What was partially implemented

- Track / module / lesson **CRUD** is admin-readable but structural
  edits today flow through the seed.
- Reviewer queues exist as pages but the reviewer scoring form is
  basic (single overall score, not per-criterion weighted).
- AI router is fully wired but the call sites that should invoke it
  (diagnostic submit, evidence summarisation, candidate summary) still
  pass through to the heuristic / static path.
- Rubric scoring is a single 0–100 number on `ScenarioSubmission`,
  not a weighted criterion roll-up.
- Employer browse and "request" forms exist; the matching scorer is
  **admin-curated only** (no automated scoring yet).

## 4. What was broken when I started

- `pnpm build` failed with **"two parallel pages that resolve to the
  same path"** — `(app)/learning/page.tsx` and
  `(public)/learning/page.tsx`.
- After fixing the route collision, the next `pnpm build` failed at
  **prerender** because `(public)/learning-system/page.tsx` queries
  Prisma at the top level and the database container was not running.
- `tenxpros-db` container itself was not running.
- `app/prisma/migrations/` did not exist.
- `app/prisma/seed.ts` did not exist (referenced in `package.json`).
- Subtle bug in `src/lib/utils.ts`: `workModeLabels` and
  `certificateLevelLabels` used spec-style keys
  (`FULLY_AUTOMATED`, `NEEDS_TECH_IMPLEMENTATION`, `NOT_SUITABLE_FOR_AI`,
  `L4_AI_ADOPTION_LEAD`) that don't match the Prisma enum values.
  Because the maps are typed `Record<string, string>`, TypeScript did
  not catch this — but at runtime every label lookup returned
  `undefined`.

## 5. Files that appeared duplicated / inconsistent

- `(app)/learning/page.tsx` and `(public)/learning/page.tsx` both
  resolved to `/learning` (now disambiguated; public moved to
  `/learning-system`).
- `(public)/certification/page.tsx` listed only four levels with
  `L4_AI_ADOPTION_LEAD`; schema had five (`L4_AI_IMPLEMENTER`,
  `L5_AI_LEADER`). Reconciled to five.

## 6. Architecture decisions already in place

| Concern | Decision |
|---------|----------|
| Stack | Next.js 14 App Router, TypeScript strict, Prisma 5.22, Postgres 16, Tailwind, Zod, bcrypt, pnpm 9.15.9 |
| Auth | Custom HMAC-signed cookie sessions in `src/lib/auth/` so NextAuth/Clerk can swap in later |
| AI | Provider abstraction in `src/lib/ai/`, no hardcoded keys, every call logs to `AIRunLog` |
| Reverse proxy | `tenxops-caddy-1` proxies `tenxpros.com` → host `:3003` |
| DB container | Dedicated `tenxpros-db` Postgres 16 on host port 5433 |
| Migrations | `prisma migrate deploy` on container startup (planned for prod image) |
| Visibility | Profile defaults to PRIVATE; opt-in to EMPLOYER_VISIBLE / PUBLIC |
| Reviewer-in-the-loop | AI never makes a hire/reject decision; admin/reviewer always between AI and public output |

## 7. What should be preserved

- The full Prisma schema — it is well-shaped for the lifecycle.
- The auth lib — small, swappable, sufficient for now.
- The AI provider abstraction with `AIRunLog` — exactly right.
- The eligibility evaluator with five levels — keep all five.
- The Caddy proxy contract — do not change host port 3003 without
  also updating the Caddyfile.
- The `_legacy_placeholder/` directory — keep it until the new app
  is verified end-to-end in production.

## 8. What should be cleaned up

- The `tenxpros-web` nginx service in `docker-compose.yml` should be
  removed once an `app` service is added that maps `3003:3000`. (Not
  done in this pass — kept to preserve a working public response.)
- `tsconfig.tsbuildinfo` is checked-in-by-accident-shaped — a future
  pass should add it to `.gitignore` if the team has not already.
- A handful of TODO/placeholder comments in scenario detail, evidence
  new, employer browse and admin certification detail pages.

## 9. Immediate blockers (now resolved)

| # | Blocker | Resolution |
|---|---------|------------|
| 1 | Parallel-route collision at `/learning` | Moved public marketing to `/learning-system`; updated nav, footer, internal links |
| 2 | Prerender failed because public learning page queried DB at build time | `export const dynamic = "force-dynamic"` on `(public)/learning-system/page.tsx` |
| 3 | DB container not running | `docker compose up -d db` |
| 4 | No migrations directory | `pnpm exec prisma migrate dev --name init` |
| 5 | No seed file | Wrote `app/prisma/seed.ts` (idempotent, ~520 lines) |
| 6 | Enum-name mismatch in `utils.ts` labels | Re-keyed labels to schema enums |
| 7 | `(public)/certification/page.tsx` showed 4 levels | Added `L4_AI_IMPLEMENTER`, renamed L5 entry, updated copy to "Five levels" |

## 10. Recommended continuation plan

See [ROADMAP.md](ROADMAP.md) — short version:

1. Markdown rendering with sanitisation for lesson body, evidence
   description, scenario prompt.
2. Admin CRUD for tracks/modules/lessons.
3. Reviewer queues with per-criterion weighted scoring.
4. Wire `aiRouter` into diagnostic submit, candidate summary, evidence
   summary.
5. Rate-limit on `/employer/browse`.
6. Containerise the app and replace the `tenxpros-web` nginx
   placeholder.
7. Add a small Vitest suite (eligibility engine, classifier,
   sign-up validation).

## Build / lint / typecheck status (after this pass)

```
pnpm typecheck → ✅ no errors
pnpm lint       → ✅ no warnings or errors
pnpm build      → ✅ Compiled successfully (48 routes)
pnpm test       → no specs yet
pnpm db:seed    → ✅ 13 tracks, 2 rubrics, 5 scenarios, 4 users, 1 demo certificate
```
