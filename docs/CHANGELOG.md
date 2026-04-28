# Changelog

All notable changes to the TenXPros repository are recorded here.

## 2026-04-28 — M0.3 production hardening

Closes the configuration risks left over from M0.2.

### Added

- `/opt/tenxpros/.gitignore` and `/opt/tenxpros/app/.gitignore` —
  excludes all env files, `node_modules/`, `.next/`, build info from git.
- `/opt/tenxpros/.env.production` — *(gitignored, chmod 600)* — the
  single source of truth for production env. Contains rotated
  `SESSION_SECRET` (64 hex chars, `openssl rand -hex 32`),
  `APP_URL=https://tenxpros.com`, `ALLOW_DEMO_USERS=false`,
  `ADMIN_EMAIL`, `ADMIN_PASSWORD` (24-char random) and the AI / region
  flags.
- `app/prisma/seed.ts` — `seedSecureAdmin()` (upserts `ADMIN_EMAIL` +
  `ADMIN_PASSWORD` as a real `ADMIN` user) and an `ALLOW_DEMO_USERS`
  gate. In production mode the seed scrambles bcrypt hashes on any
  pre-existing demo users so the documented demo passwords cannot be
  reused; demo certificate creation is gated behind the same flag.
- `app/.env.example` — documents `ALLOW_DEMO_USERS`, `ADMIN_EMAIL`,
  `ADMIN_PASSWORD`.
- `docs/PRODUCTION_HARDENING_AUDIT.md` — pre-pass risk audit + the
  changes that closed each risk.

### Changed

- `docker-compose.yml`: `tenxpros-app` no longer carries inline
  `environment:` values; replaced with `env_file: ./.env.production`.
  The tracked compose file contains no secrets.
- `docs/DEPLOYMENT.md`: env-file pattern, secret-rotation flow,
  expanded env-vars table, demo-user policy.
- `docs/SECURITY_AND_COMPLIANCE.md`: documented secret rotation
  (`SESSION_SECRET` annually), demo / admin user policy, on-disk
  verification snippet.
- `docs/README.md`: demo accounts table marked **LOCAL / DEV ONLY**;
  added a Production Admin section pointing at `.env.production`.

### Notes

- All five auth checks pass (four demo passwords dead, secure admin
  password live).
- TenXOps and TenXRole untouched.
- `.env.production` lives only on the deploy host; if the host is
  rebuilt, regenerate via `openssl rand -hex 32` and re-seed.

## 2026-04-28 — M0.2 Dockerised real-app rollout

The real Next.js app now runs behind `tenxpros.com`. The nginx
placeholder is retired.

### Added

- `app/Dockerfile` — multi-stage `node:20-bookworm-slim` image; full
  app + node_modules in the runtime stage so migrations and seed run
  inside the container; container CMD is
  `pnpm prisma migrate deploy && pnpm start`.
- `app/.dockerignore`.
- `docs/DEPLOYMENT_AUDIT.md` — pre-rollout state + rollout log +
  rollback procedure.

### Changed

- `docker-compose.yml`: removed the `tenxpros-web` nginx service;
  added `tenxpros-app` (host `3003 → 3000`) with `db:5432` connection
  and `depends_on db service_healthy`; kept the `db` service and
  `tenxpros-db-data` volume.
- `app/src/app/layout.tsx`: Open Graph metadata updated from
  "showcase, and match" → "showcase, connect" plus the ecosystem
  one-liner, so social previews match the M0.1 boundary correction.
- `docs/DEPLOYMENT.md` rewritten around the live compose stack and
  the actual `app/Dockerfile`.

### Notes

- TenXOps and TenXRole containers untouched; Caddy block for
  `tenxpros.com` not modified.
- Resolved a stray host-side `pnpm next start -p 3003` from
  `/opt/tenxrole` (started by another agent), which had grabbed the
  TenXPros port. Production TenXRole (`tenxrole-app` container) was
  unaffected.

## 2026-04-27 — M0.1 ecosystem boundary correction

Reframes TenXPros as the AI-adoption service / certification /
talent-network layer that complements TenXRole (career management
product) and TenXOps (organisational AI adoption). Adds the
data-shape primitives that support that framing.

### Added

- `docs/ECOSYSTEM_BOUNDARIES.md` — authoritative split between
  TenXRole, TenXPros and TenXOps; data-ownership table; no-duplication
  rules.
- `docs/TENXROLE_INTEGRATION.md` — bidirectional payload contract,
  integration modes (manual / mock / production API), API skeleton.
- `docs/TALENT_NETWORK.md` — talent pool, shortlists, introduction
  workflow, full status lifecycle.
- `docs/CUSTOMIZATION_SYSTEM.md` — the seven dimensions of
  per-professional customisation; honest rules around the word
  "fine-tuned".
- Schema: `TalentPoolStatus` enum,
  `ProfessionalProfile.talentPoolStatus`, `TenXRoleConnection` model,
  `PromptPack` model, expanded `EmployerRequestStatus` workflow
  (legacy values preserved).
- Migration: `20260427220600_ecosystem_boundary_update`.
- Seed: two global prompt packs (`pm-status-pack`,
  `career-positioning-pack`).

### Changed

- Public homepage: rewritten subheadline, lifecycle "Match" → "Connect",
  added "Where TenXPros fits" three-pillar section with the ecosystem
  one-liner.
- "What TenXPros is not": now leads with "Not a career-execution
  product" (TenXRole owns it).
- For Professionals page: headline → *Get certified, coached, and
  connected for the AI era*; sections rewritten around the service
  framing; TenXRole connection card explicit about boundary.
- For Organisations page: headline → *Find professionals who can
  actually work with AI*; talent-relationship-management pillar
  added; explicit "no employment guarantees" clause.
- `/opportunities` (authenticated) reframed as the TenXRole connection
  panel — bidirectional payload preview + manual handoff today.
- App nav: "Opportunities" → "TenXRole".
- Dashboard lifecycle step: "Showcase / Match" → "Showcase / Connect".
- Public footer ecosystem line replaced with the canonical sentence.
- Updated: PRODUCT_VISION, ARCHITECTURE, EMPLOYER_PORTAL, ROADMAP,
  README, DATA_MODEL.

## 2026-04-27 — M0 recovery

Recovery + first stable build pass.

### Added

- `app/prisma/seed.ts` — idempotent seed for tracks, modules, lessons,
  rubrics, scenarios, demo users, sample issued certificate.
- `app/prisma/migrations/20260427204555_init/` — initial Postgres
  schema baseline.
- `docs/README.md`, `PRODUCT_VISION.md`, `ARCHITECTURE.md`,
  `DATA_MODEL.md`, `CERTIFICATION_FRAMEWORK.md`, `LEARNING_SYSTEM.md`,
  `ASSESSMENT_RUBRICS.md`, `EMPLOYER_PORTAL.md`, `AI_PIPELINE.md`,
  `DEPLOYMENT.md`, `SECURITY_AND_COMPLIANCE.md`, `ROADMAP.md`,
  `CHANGELOG.md`, `RECOVERY_AUDIT.md`, `IMPLEMENTATION_REPORT.md`.

### Changed

- Public marketing learning page moved from `/learning` →
  `/learning-system` to resolve a Next.js parallel-route collision
  with the authenticated `/learning` dashboard.
- `learning-system/page.tsx` marked `force-dynamic` so build works
  without a live database.
- `src/lib/utils.ts` — `certificateLevelLabels` and `workModeLabels`
  re-keyed to match the schema enums (`L4_AI_IMPLEMENTER`,
  `L5_AI_LEADER`, `AUTOMATED`, `ESCALATE`, `NOT_SUITABLE`).
- `(public)/certification/page.tsx` — added `L4_AI_IMPLEMENTER` card,
  renamed L5 entry; copy updated from "Four levels" to "Five levels".
- `(public)/professionals/page.tsx`, `public-nav.tsx`, `public-footer.tsx`
  — links updated to point at `/learning-system`.
- Pre-existing `docs/CURRENT_STATE_AUDIT.md` renamed to
  `docs/RECOVERY_AUDIT_PHASE0.md` to free `RECOVERY_AUDIT.md` for the
  current pass.

### Notes

- Build, typecheck and lint all pass. No tests exist yet.
- Caddy reverse-proxy contract (`172.17.0.1:3003`) preserved.
