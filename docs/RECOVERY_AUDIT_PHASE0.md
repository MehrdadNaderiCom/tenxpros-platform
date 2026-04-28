# TenXPros — Current State Audit (Phase 0)

**Date:** 2026-04-27
**Auditor:** Implementation Phase 0
**Repository root:** `/opt/tenxpros`

## 1. What existed before refactor

```
/opt/tenxpros/
├── docker-compose.yml   # nginx:alpine on host port 3003 → /usr/share/nginx/html
└── html/
    └── index.html       # 127-byte placeholder: "TenXPros is live"
```

There was no application code, database, environment configuration, build pipeline, or domain model.

## 2. Surrounding infrastructure (NOT owned by this repo, but relied on)

The host `/opt` directory contains several adjacent products:

| Path | Purpose | Notes |
|------|---------|-------|
| `/opt/tenxops/` | TenXOps platform + global Caddy reverse proxy | Caddy is the public ingress |
| `/opt/tenxrole/` | TenXRole / RoleRadar (Next.js + Prisma + Postgres) | Reference stack and conventions |
| `/opt/tenxrole-deploy/` | Deployment manifests for TenXRole | `node:20-bookworm-slim` build container pattern |
| `/opt/tenxpros/` | TenXPros placeholder (this repo) | Replaced by this implementation |

### 2.1 Reverse proxy

`tenxops-caddy-1` (the global Caddy container, network `proxy-network`) proxies the public domain:

```
tenxpros.com www.tenxpros.com {
    reverse_proxy 172.17.0.1:3003
}
```

`172.17.0.1` is the host gateway IP from the Caddy container's perspective, so the reverse proxy reaches whatever is bound to **port 3003 on the Docker host**. This is the integration contract we must keep.

### 2.2 Database/cache neighbours

* `tenxops-postgres` is exposed on host port 5432 (used by TenXOps).
* `tenxops-redis` is on host port 6379.
* TenXRole runs its own dedicated `tenxrole-db` (Postgres 16-alpine) on the `roleradar_internal` Docker network.

We follow the TenXRole pattern: a dedicated Postgres container on a private Docker network, exposing only the app on host port 3003.

## 3. Decisions

| Concern | Decision |
|---------|----------|
| Backup of legacy files | Copied to `/opt/tenxpros/_legacy_placeholder/` and committed in git |
| Old `html/` placeholder | Will be removed once new app is verified locally |
| Reverse proxy contract | Keep host port 3003 → Next.js app container |
| Stack | Next.js 14 App Router · TypeScript · Tailwind · Prisma · Postgres 16 · Zod · pnpm 9.15.9 |
| Auth | Custom HMAC-signed cookie sessions in-tree, abstracted behind `lib/auth/` so NextAuth/Clerk can be slotted in later |
| AI | `lib/ai/` provider abstraction (OpenRouter / Anthropic / OpenAI), no hardcoded keys, all runs persisted in `AIRunLog` |
| Container runtime | `node:20-bookworm-slim` + corepack/pnpm (mirrors TenXRole) |
| Database container | Dedicated `tenxpros-db` Postgres 16 on a private Docker network |
| Migrations | `prisma migrate deploy` on container startup |
| Network for Caddy | The new app container also joins `proxy-network` so Caddy can reach it directly via `tenxpros-app:3000` (we still bind `3003:3000` for the existing `172.17.0.1:3003` route) |

## 4. Risk register (carried into Phase 1)

* Caddy already references `172.17.0.1:3003`; we must keep that port mapping until/unless we update the Caddyfile.
* The legacy `html/` directory is preserved at `_legacy_placeholder/` so that we can revert if the new app fails to start.
* No SSL certs are managed in this repo; that is owned by `tenxops-caddy-1`.

## 5. Snapshot

* Git initialised at `/opt/tenxpros` and the placeholder state committed before any destructive change.
* Tag any production replacement commit so the legacy state remains reachable.
