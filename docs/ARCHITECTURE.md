# Architecture

## Stack

> TenXPros sits in the TenX ecosystem alongside **TenXRole** (the
> AI-powered career management product) and **TenXOps** (organisational
> AI adoption). See [ECOSYSTEM_BOUNDARIES.md](ECOSYSTEM_BOUNDARIES.md)
> for the data-ownership split and
> [TENXROLE_INTEGRATION.md](TENXROLE_INTEGRATION.md) for the integration
> contract. This document describes the TenXPros app only.

| Layer | Choice | Notes |
|-------|--------|-------|
| Runtime | Node 20 (`engines.node ≥ 20`) | Mirrors TenXRole |
| Package manager | pnpm 9.15.9 (corepack-managed) | `packageManager` pinned in `app/package.json` |
| Framework | Next.js 14 App Router | RSC, server actions, route groups |
| Language | TypeScript 5.6 (strict) | `"strict": true` in `tsconfig.json` |
| Styling | Tailwind 3.4 | Tokens defined in `tailwind.config.ts` |
| Components | Local UI primitives in `src/components/ui` | shadcn-flavoured but in-repo |
| ORM | Prisma 5.22 | `app/prisma/schema.prisma` is the SoT |
| Database | Postgres 16 (`postgres:16-alpine`) | Dedicated container `tenxpros-db` |
| Validation | Zod 3 | Shared schemas in `src/lib/validation.ts` |
| Auth | In-tree HMAC-signed cookie sessions | `src/lib/auth/` — see `SECURITY_AND_COMPLIANCE.md` |
| AI | Provider-agnostic abstraction | `src/lib/ai/` — see `AI_PIPELINE.md` |
| Reverse proxy | Caddy (`tenxops-caddy-1`) | Already proxies `tenxpros.com` → `172.17.0.1:3003` |

## Repository layout

```
/opt/tenxpros/
├── docker-compose.yml           # Postgres for now; app container slot reserved
├── _legacy_placeholder/         # archived nginx placeholder, kept for safety
├── docs/                        # this directory
└── app/
    ├── prisma/
    │   ├── schema.prisma        # source of truth for the data model
    │   ├── migrations/          # `prisma migrate dev` history
    │   └── seed.ts              # idempotent seed: tracks, rubrics, scenarios, demo users
    ├── src/
    │   ├── app/                 # Next.js App Router
    │   │   ├── (public)/        # marketing site
    │   │   ├── (app)/           # authenticated professional dashboard
    │   │   ├── (admin)/         # admin / reviewer surfaces
    │   │   ├── (employer)/      # employer portal
    │   │   ├── verify/[id]/     # public certificate verification
    │   │   ├── pros/[slug]/     # public professional profiles
    │   │   ├── sign-in / sign-up / sign-out
    │   │   └── api/health/      # health probe
    │   ├── components/          # ui/, brand/, site/ (navs + footer)
    │   └── lib/
    │       ├── auth/            # session.ts, password.ts
    │       ├── ai/              # provider.ts, router.ts, providers/, prompts/
    │       ├── certification/   # eligibility evaluation
    │       ├── tasks/           # heuristic work-mode classifier
    │       ├── db.ts            # Prisma singleton
    │       ├── validation.ts    # Zod schemas (form + DTO)
    │       └── utils.ts         # cn(), slugify(), enum labels, etc.
    └── tailwind.config.ts, next.config.mjs, tsconfig.json
```

## Route groups

Next.js route groups (parentheses-named directories) split the app into
zones that share layouts and access control without affecting URLs.

| Group | URL prefix | Auth | Notes |
|-------|------------|------|-------|
| `(public)` | `/` | none | Marketing pages; reverse-proxy entry |
| `(app)` | `/` | requires session, `role=PROFESSIONAL` | Dashboard, learning, scenarios, etc. |
| `(admin)/admin` | `/admin/*` | `role=ADMIN` or `REVIEWER` | Review queues, content management |
| `(employer)/employer` | `/employer/*` | `role=EMPLOYER` | Org portal |

Marketing and authenticated views with the same name (e.g. learning) are
disambiguated by URL: marketing uses `/learning-system`, authenticated
uses `/learning`. Without that split Next.js raises a parallel-route
collision at build.

## Request lifecycle

1. **Public request** → Caddy → host `:3003` → Next.js → page is either
   static (`/about`, `/pricing`, etc.) or dynamic (`/pros/[slug]`,
   `/verify/[id]`, `/learning-system`).
2. **Authenticated request** → cookie `tenxpros_session` HMAC-verified
   in `getCurrentUser()` → Prisma queries scoped by user.
3. **Server action** → Zod validation → Prisma write → `revalidatePath`
   on the affected page → redirect or in-place state.
4. **AI call** → `aiRouter.run(purpose, request)` → provider resolved
   from env (mock | openrouter) → `AIRunLog` row created with prompt
   version, model, latency, status; output stored as JSON.

## Build-time rules

- All authenticated `(app)`, `(admin)`, `(employer)` pages are dynamic
  by virtue of `cookies()` in `getCurrentUser()`. No annotation required.
- Public pages that hit Prisma at the top level must declare
  `export const dynamic = "force-dynamic"`. Currently:
  - `(public)/learning-system/page.tsx`
  - `verify/[id]/page.tsx` (also dynamic via param)
  - `pros/[slug]/page.tsx`
  - `api/health/route.ts`

## External dependencies

- The Postgres container `tenxpros-db` listens on host port `5433`.
- The Caddy proxy `tenxops-caddy-1` lives on `proxy-network`; the
  TenXPros app container will join that network when containerised.

## Local-dev surface

| URL | What you see |
|-----|--------------|
| `http://localhost:3000/` | Public home (with "Where TenXPros fits" ecosystem section) |
| `http://localhost:3000/learning-system` | Public learning marketing (lists seeded tracks) |
| `http://localhost:3000/sign-in` | Auth |
| `http://localhost:3000/dashboard` | Professional service dashboard (sign in as `demo.pro@…`) |
| `http://localhost:3000/opportunities` | TenXRole connection panel (career execution lives in TenXRole) |
| `http://localhost:3000/admin` | Admin overview (sign in as `admin@…`) |
| `http://localhost:3000/employer/dashboard` | Employer portal (sign in as `demo.org@…`) |
| `http://localhost:3000/verify/<publicId>` | Public certificate verification |
