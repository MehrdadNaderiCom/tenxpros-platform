# TenXPros — Docs Index

TenXPros is the AI-adoption **service / certification / talent-network
layer** for individual professionals — diagnostics, customised
learning, coaching, evidence-based certification, and a curated
talent network that introduces certified professionals to verified
organisations.

> **TenXRole manages the career journey. TenXPros develops and certifies
> the professional. TenXOps transforms the organisation.**

TenX ecosystem:

- **TenXRole** — AI-powered **career management** product (career
  path, profile, opportunity radar, applications, networking, interview
  prep). The career execution engine TenXPros connects to — not duplicates.
- **TenXPros** *(this repository)* — AI-adoption diagnostics, learning,
  coaching, certification, talent network, employer relationships.
- **TenXOps** — AI adoption for organisations (workflow redesign,
  governance, AI-ready role definitions). Generates demand for
  TenXPros-certified talent.

## Documentation map

| File | Purpose |
|------|---------|
| [PRODUCT_VISION.md](PRODUCT_VISION.md) | Why this exists, who it serves, the lifecycle (diagnose → connect) |
| [ECOSYSTEM_BOUNDARIES.md](ECOSYSTEM_BOUNDARIES.md) | Authoritative split between TenXRole, TenXPros, TenXOps |
| [TENXROLE_INTEGRATION.md](TENXROLE_INTEGRATION.md) | TenXPros ↔ TenXRole payload contract and integration modes |
| [TALENT_NETWORK.md](TALENT_NETWORK.md) | Talent pool, shortlists, introductions, request lifecycle |
| [CUSTOMIZATION_SYSTEM.md](CUSTOMIZATION_SYSTEM.md) | The seven dimensions of per-professional customisation |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, repo layout, request flow, deployment topology |
| [DATA_MODEL.md](DATA_MODEL.md) | Prisma schema groups, key relations, enum reference |
| [CERTIFICATION_FRAMEWORK.md](CERTIFICATION_FRAMEWORK.md) | Levels L1–L5, requirements, review workflow, public verify |
| [LEARNING_SYSTEM.md](LEARNING_SYSTEM.md) | Tracks → modules → lessons; how content is authored & seeded |
| [ASSESSMENT_RUBRICS.md](ASSESSMENT_RUBRICS.md) | Scenario-based assessment, rubric criteria, review |
| [EMPLOYER_PORTAL.md](EMPLOYER_PORTAL.md) | Org profiles, role needs, browse, requests, matches, statuses |
| [AI_PIPELINE.md](AI_PIPELINE.md) | Provider abstraction, prompt templates, AI run logging |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Live compose stack, Dockerfile, Caddy contract, env vars, rollback |
| [DEPLOYMENT_AUDIT.md](DEPLOYMENT_AUDIT.md) | Pre-M0.2 rollout state, rollout log, verification |
| [PRODUCTION_HARDENING_AUDIT.md](PRODUCTION_HARDENING_AUDIT.md) | Pre-M0.3 risk audit + the changes that closed each risk |
| [SECURITY_AND_COMPLIANCE.md](SECURITY_AND_COMPLIANCE.md) | Auth, secrets, data residency, AI use policy |
| [ROADMAP.md](ROADMAP.md) | Near-term and longer-term plan |
| [CHANGELOG.md](CHANGELOG.md) | Notable changes |
| [RECOVERY_AUDIT.md](RECOVERY_AUDIT.md) | Most recent audit of state, blockers, and the fix log |
| [RECOVERY_AUDIT_PHASE0.md](RECOVERY_AUDIT_PHASE0.md) | Original snapshot before the app was built |
| [IMPLEMENTATION_REPORT.md](IMPLEMENTATION_REPORT.md) | What was built or repaired in the last implementation pass |

## Quick start

```bash
# from /opt/tenxpros
docker compose up -d db          # start Postgres on host port 5433
cd app
cp .env.example .env             # only if .env missing
pnpm install
pnpm db:generate
pnpm db:migrate                  # creates the dev schema
pnpm db:seed                     # 13 tracks + rubrics + scenarios + demo users
pnpm dev                         # http://localhost:3000
```

### Demo accounts (LOCAL / DEV ONLY)

These accounts only exist when `ALLOW_DEMO_USERS=true` in your local
`.env`. **They do not work on `tenxpros.com`** — production sets
`ALLOW_DEMO_USERS=false` and the seed actively scrambles any
pre-existing demo passwords. See
[SECURITY_AND_COMPLIANCE.md](SECURITY_AND_COMPLIANCE.md#demo--admin-user-policy).

| Email | Role | Password (dev only) |
|-------|------|---------------------|
| `admin@tenxpros.test` | ADMIN | `tenxpros-admin-demo` |
| `reviewer@tenxpros.test` | REVIEWER | `tenxpros-reviewer-demo` |
| `demo.pro@tenxpros.test` | PROFESSIONAL | `tenxpros-pro-demo` |
| `demo.org@tenxpros.test` | EMPLOYER | `tenxpros-org-demo` |

> These are scaffolding for engineers running the project on a laptop.
> They are not credentials. Never enable `ALLOW_DEMO_USERS=true` on a
> public domain.

### Production admin

Provisioned from `ADMIN_EMAIL` + `ADMIN_PASSWORD` in
`/opt/tenxpros/.env.production` (chmod 600, gitignored). The seed
upserts the user; the password is bcrypt-hashed at upsert time.
