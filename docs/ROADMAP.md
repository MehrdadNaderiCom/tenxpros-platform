# Roadmap

This is a working document — it changes every implementation pass.

## Now (M0.1 — ecosystem boundary correction)

Status: ✅ shipped on 2026-04-27.

- Repositioned TenXPros as the AI-adoption **service / certification /
  talent-network layer** that complements TenXRole (career management
  product) and TenXOps (organisational AI adoption).
- New docs: [ECOSYSTEM_BOUNDARIES.md](ECOSYSTEM_BOUNDARIES.md),
  [TENXROLE_INTEGRATION.md](TENXROLE_INTEGRATION.md),
  [TALENT_NETWORK.md](TALENT_NETWORK.md),
  [CUSTOMIZATION_SYSTEM.md](CUSTOMIZATION_SYSTEM.md).
- Public copy patched: home (added "Where TenXPros fits"), professionals,
  organisations, footer, about.
- `/opportunities` reframed as the explicit TenXRole connection panel.
- Schema additions: `TalentPoolStatus` enum,
  `ProfessionalProfile.talentPoolStatus`, expanded
  `EmployerRequestStatus` workflow (with legacy values kept),
  `TenXRoleConnection` model, `PromptPack` model.
- Two global prompt packs seeded (`pm-status-pack`,
  `career-positioning-pack`).

## Earlier (M0 — recovery + first usable build)

Status: ✅ shipped on 2026-04-27.

- Recovered Next.js 14 app scaffold under `app/`.
- Resolved parallel-route conflict at `/learning` (split → `/learning-system` public, `/learning` authenticated).
- Brought up Postgres 16 in `tenxpros-db`, applied initial migration.
- Created idempotent seed: 13 tracks, 2 rubrics, 5 scenarios, 4 demo
  users, 1 issued sample certificate.
- Aligned `WorkMode` and `CertificateLevel` labels with schema enums so
  UI never renders `undefined` text.
- Documented audit, architecture, data model, certification, learning,
  rubrics, employer portal, AI pipeline, deployment, security.

## Next (M1 — content polish + reviewer flow + TenXRole sync surface)

- Markdown rendering + sanitiser for lesson body, evidence description,
  scenario prompts.
- Admin CRUD for tracks/modules/lessons (currently authored via seed).
- Reviewer queue and submission detail views under `/admin/scenarios`,
  `/admin/evidence` (skeleton exists; needs forms).
- Granular rubric scoring (per-criterion 0–5) instead of single 0–100.
- Verify-page Open Graph image so shared certificates render nicely.
- Settings UI for the `TenXRoleConnection` flags (currently set on
  the schema; no edit form yet).
- Surface `talentPoolStatus` on the professional dashboard.
- Replace the bcrypt password store with argon2 once we move off
  shared hosts.

## Later (M2 — AI in the loop)

- Wire `aiRouter` into the diagnostic submit flow → generate
  `AIReadinessReport` from the diagnostic.
- Wire AI into task-classifier suggestions (heuristic stays as
  fallback).
- AI scenario generation for admins, with reviewer pre-approval.
- AI evidence summarisation for reviewers (not for hiring decisions).
- AI candidate summary for employer browse cards (admin-edited before
  becoming visible).

## Later still (M3 — automated matching + production integrations)

- Automated (advisory) matching scorer for `EmployerMatch` —
  certificate level, work-mode overlap, skill overlap, visibility.
  Admin-curated remains the primary signal.
- TenXRole production API integration. Replace the manual handoff
  with the `/api/integrations/tenxrole/*` endpoints described in
  [TENXROLE_INTEGRATION.md](TENXROLE_INTEGRATION.md).
- TenXOps integration: source verified TenXPros talent for
  organisation-level engagements; pull AI-ready role definitions back.
- Cohort / sponsor program support (`programKey`, sponsor logos on
  verify page).
- Paid practitioner cohorts and expert mentor module.
- Per-purpose model routing in `aiRouter` so cheap models handle
  cheap purposes (rewrite/polish) and stronger models handle
  reasoning (scenario generation, candidate summary).

## Recurring / ops

- Quarterly review of seeded content for drift with the live AI
  ecosystem (model names, tool names age fast).
- Rotate `SESSION_SECRET` annually; document the procedure.
- Verify disaster-recovery runbook against `tenxpros-db-data` volume.
